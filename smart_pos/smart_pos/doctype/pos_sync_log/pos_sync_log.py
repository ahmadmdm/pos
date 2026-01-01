# POS Sync Log
# Copyright (c) 2026, Ahmad
# License: MIT

import frappe
import json
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class POSSyncLog(Document):
    def validate(self):
        if self.data_json:
            try:
                json.loads(self.data_json)
            except json.JSONDecodeError:
                frappe.throw(_("Invalid JSON data"))
    
    def process_sync(self):
        """Process the sync operation"""
        self.status = "Processing"
        self.attempt_count = (self.attempt_count or 0) + 1
        self.last_attempt = now_datetime()
        self.save()
        
        try:
            data = json.loads(self.data_json) if self.data_json else {}
            
            if self.document_type == "POS Invoice":
                result = self.sync_pos_invoice(data)
            elif self.document_type == "Customer":
                result = self.sync_customer(data)
            else:
                result = self.sync_generic_document(data)
            
            self.status = "Synced"
            self.synced_at = now_datetime()
            self.document_name = result.get("name")
            self.error_message = None
            self.save()
            
            return {"success": True, "document_name": self.document_name}
            
        except Exception as e:
            self.status = "Failed"
            self.error_message = str(e)
            self.save()
            
            return {"success": False, "error": str(e)}
    
    def sync_pos_invoice(self, data):
        """Sync POS Invoice from offline data"""
        # Check if already synced
        existing = frappe.db.exists("POS Invoice", {"offline_id": self.offline_id})
        if existing:
            return {"name": existing, "status": "already_synced"}
        
        # Create new POS Invoice
        invoice = frappe.new_doc("POS Invoice")
        
        # Set basic fields
        invoice.company = data.get("company")
        invoice.customer = data.get("customer")
        invoice.pos_profile = data.get("pos_profile")
        invoice.posting_date = data.get("posting_date")
        invoice.posting_time = data.get("posting_time")
        invoice.due_date = data.get("due_date")
        invoice.offline_id = self.offline_id
        invoice.synced_from_offline = 1
        invoice.sync_timestamp = now_datetime()
        invoice.device_id = self.device_id
        
        # Add items
        for item in data.get("items", []):
            invoice.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "qty": item.get("qty"),
                "rate": item.get("rate"),
                "amount": item.get("amount"),
                "warehouse": item.get("warehouse")
            })
        
        # Add payments
        for payment in data.get("payments", []):
            invoice.append("payments", {
                "mode_of_payment": payment.get("mode_of_payment"),
                "amount": payment.get("amount"),
                "account": payment.get("account")
            })
        
        # Add taxes if any
        for tax in data.get("taxes", []):
            invoice.append("taxes", {
                "charge_type": tax.get("charge_type"),
                "account_head": tax.get("account_head"),
                "rate": tax.get("rate"),
                "tax_amount": tax.get("tax_amount")
            })
        
        invoice.insert()
        
        # Auto submit if configured
        if data.get("auto_submit", True):
            invoice.submit()
        
        frappe.db.commit()
        
        return {"name": invoice.name, "status": "created"}
    
    def sync_customer(self, data):
        """Sync Customer from offline data"""
        existing = frappe.db.exists("Customer", {"customer_name": data.get("customer_name")})
        if existing:
            return {"name": existing, "status": "already_exists"}
        
        customer = frappe.new_doc("Customer")
        customer.customer_name = data.get("customer_name")
        customer.customer_type = data.get("customer_type", "Individual")
        customer.mobile_no = data.get("mobile_no")
        customer.email_id = data.get("email_id")
        customer.insert()
        
        frappe.db.commit()
        
        return {"name": customer.name, "status": "created"}
    
    def sync_generic_document(self, data):
        """Sync generic document"""
        doc = frappe.new_doc(self.document_type)
        for field, value in data.items():
            if hasattr(doc, field):
                setattr(doc, field, value)
        doc.insert()
        frappe.db.commit()
        
        return {"name": doc.name, "status": "created"}
