# POS Session
# Copyright (c) 2026, Ahmad
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, flt


class POSSession(Document):
    def validate(self):
        self.validate_open_sessions()
        self.calculate_totals()
    
    def before_insert(self):
        if not self.opening_time:
            self.opening_time = now_datetime()
        if not self.user:
            self.user = frappe.session.user
    
    def validate_open_sessions(self):
        """Ensure user doesn't have multiple open sessions"""
        if self.status == "Open" and not self.is_new():
            return
        
        if self.status == "Open":
            existing = frappe.db.exists(
                "POS Session",
                {
                    "user": self.user,
                    "pos_profile": self.pos_profile,
                    "status": "Open",
                    "name": ["!=", self.name]
                }
            )
            if existing:
                frappe.throw(_("User {0} already has an open session for this POS Profile").format(self.user))
    
    def calculate_totals(self):
        """Calculate session totals from invoices"""
        if self.status == "Closed":
            self.expected_cash = flt(self.opening_cash) + flt(self.total_sales) - flt(self.total_returns)
            self.cash_difference = flt(self.actual_cash) - flt(self.expected_cash)
    
    def close_session(self, actual_cash=0, closing_notes=None):
        """Close the POS session"""
        self.status = "Closed"
        self.closing_time = now_datetime()
        self.actual_cash = actual_cash
        if closing_notes:
            self.closing_notes = closing_notes
        
        # Calculate session summary
        self.calculate_session_summary()
        self.calculate_totals()
        self.save()
        
        return self
    
    def calculate_session_summary(self):
        """Calculate session summary from POS Invoices"""
        invoices = frappe.get_all(
            "POS Invoice",
            filters={
                "pos_session": self.name,
                "docstatus": 1
            },
            fields=["grand_total", "is_return", "total_qty"]
        )
        
        total_sales = 0
        total_returns = 0
        total_invoices = 0
        total_items = 0
        
        for inv in invoices:
            if inv.is_return:
                total_returns += flt(inv.grand_total)
            else:
                total_sales += flt(inv.grand_total)
            total_invoices += 1
            total_items += flt(inv.total_qty)
        
        self.total_sales = total_sales
        self.total_returns = abs(total_returns)
        self.total_invoices = total_invoices
        self.total_items_sold = total_items
        
        if total_invoices > 0:
            self.average_basket_size = total_items / total_invoices
            self.average_basket_value = (total_sales - abs(total_returns)) / total_invoices


@frappe.whitelist()
def get_open_session(user=None, pos_profile=None):
    """Get open session for user"""
    if not user:
        user = frappe.session.user
    
    filters = {"user": user, "status": "Open"}
    if pos_profile:
        filters["pos_profile"] = pos_profile
    
    session = frappe.db.get_value(
        "POS Session",
        filters,
        ["name", "pos_profile", "company", "opening_time", "opening_cash"],
        as_dict=True
    )
    
    return session


@frappe.whitelist()
def create_session(pos_profile, opening_cash=0, opening_notes=None, device_info=None):
    """Create a new POS session"""
    # Get POS Profile details
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    session = frappe.new_doc("POS Session")
    session.pos_profile = pos_profile
    session.company = profile.company
    session.user = frappe.session.user
    session.opening_cash = flt(opening_cash)
    session.opening_time = now_datetime()
    session.status = "Open"
    
    if opening_notes:
        session.opening_notes = opening_notes
    
    if device_info:
        session.device_id = device_info.get("device_id")
        session.device_name = device_info.get("device_name")
        session.ip_address = device_info.get("ip_address")
    
    session.insert()
    frappe.db.commit()
    
    return session


@frappe.whitelist()
def close_session(session_name, actual_cash=0, closing_notes=None):
    """Close a POS session"""
    session = frappe.get_doc("POS Session", session_name)
    
    if session.status != "Open":
        frappe.throw(_("Session is already closed"))
    
    if session.user != frappe.session.user and "System Manager" not in frappe.get_roles():
        frappe.throw(_("You can only close your own sessions"))
    
    return session.close_session(flt(actual_cash), closing_notes)
