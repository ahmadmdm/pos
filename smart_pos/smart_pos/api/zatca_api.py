# Smart POS - ZATCA Integration API
# Copyright (c) 2026, Ahmad
# License: MIT

"""
ZATCA Integration for Smart POS
Integrates with zatca_erpgulf app for Saudi e-invoicing compliance
"""

import frappe
from frappe import _
from frappe.utils import now_datetime, flt, cint
import json


@frappe.whitelist()
def is_zatca_enabled():
    """Check if ZATCA integration is enabled"""
    try:
        # Check if zatca_erpgulf app is installed
        if 'zatca_erpgulf' not in frappe.get_installed_apps():
            return {"enabled": False, "reason": "zatca_erpgulf app not installed"}
        
        # Check if company has ZATCA settings
        settings = frappe.get_single("Smart POS Settings")
        company = settings.default_company
        
        if company:
            company_doc = frappe.get_doc("Company", company)
            has_zatca = bool(getattr(company_doc, 'custom_basic_auth_from_production', None))
            return {
                "enabled": has_zatca,
                "company": company,
                "reason": "ZATCA configured" if has_zatca else "Company not configured for ZATCA"
            }
        
        return {"enabled": False, "reason": "No default company configured"}
    except Exception as e:
        return {"enabled": False, "reason": str(e)}


@frappe.whitelist()
def get_zatca_settings(company):
    """Get ZATCA settings for company"""
    try:
        company_doc = frappe.get_doc("Company", company)
        
        return {
            "company": company,
            "has_production_csid": bool(getattr(company_doc, 'custom_basic_auth_from_production', None)),
            "zatca_phase": getattr(company_doc, 'custom_zatca_phase', 'Phase-1'),
            "invoice_mode": getattr(company_doc, 'custom_send_invoice_to_zatca', 'Individual')
        }
    except Exception as e:
        frappe.log_error(f"Error getting ZATCA settings: {e}")
        return None


@frappe.whitelist()
def sign_pos_invoice(invoice_name):
    """Sign and submit POS invoice to ZATCA"""
    try:
        # Import from zatca_erpgulf
        from zatca_erpgulf.zatca_erpgulf.pos_sign import zatca_call_pos
        
        invoice = frappe.get_doc("POS Invoice", invoice_name)
        
        if invoice.docstatus != 1:
            frappe.throw(_("Invoice must be submitted before ZATCA signing"))
        
        # Check if already signed
        if getattr(invoice, 'custom_zatca_status', None) == 'REPORTED':
            return {
                "status": "already_signed",
                "message": _("Invoice already reported to ZATCA"),
                "invoice": invoice_name
            }
        
        # Call ZATCA signing
        result = zatca_call_pos(invoice_name)
        
        # Refresh invoice to get updated fields
        invoice.reload()
        
        return {
            "status": "success",
            "message": _("Invoice signed and reported to ZATCA"),
            "invoice": invoice_name,
            "zatca_status": getattr(invoice, 'custom_zatca_status', None),
            "uuid": getattr(invoice, 'custom_uuid', None),
            "qr_code": getattr(invoice, 'custom_ksa_einvoicing_qr', None)
        }
        
    except Exception as e:
        frappe.log_error(f"ZATCA signing error for {invoice_name}: {e}")
        return {
            "status": "error",
            "message": str(e),
            "invoice": invoice_name
        }


@frappe.whitelist()
def batch_sign_invoices(invoices):
    """Sign multiple invoices to ZATCA"""
    if isinstance(invoices, str):
        invoices = json.loads(invoices)
    
    results = []
    for invoice_name in invoices:
        result = sign_pos_invoice(invoice_name)
        results.append(result)
    
    success_count = len([r for r in results if r.get('status') == 'success'])
    error_count = len([r for r in results if r.get('status') == 'error'])
    
    return {
        "total": len(invoices),
        "success": success_count,
        "errors": error_count,
        "details": results
    }


@frappe.whitelist()
def get_zatca_qr_code(invoice_name):
    """Get ZATCA QR code for invoice"""
    invoice = frappe.get_doc("POS Invoice", invoice_name)
    
    qr_code = getattr(invoice, 'custom_ksa_einvoicing_qr', None)
    
    if qr_code:
        return {
            "status": "success",
            "qr_code": qr_code,
            "invoice": invoice_name
        }
    else:
        return {
            "status": "not_available",
            "message": _("QR code not generated yet"),
            "invoice": invoice_name
        }


@frappe.whitelist()
def get_unsigned_invoices(session_id=None, limit=100):
    """Get invoices that haven't been signed with ZATCA"""
    filters = {
        "docstatus": 1,
        "custom_zatca_status": ["in", ["", "Not Submitted", None]]
    }
    
    if session_id:
        filters["pos_session"] = session_id
    
    invoices = frappe.get_all(
        "POS Invoice",
        filters=filters,
        fields=["name", "posting_date", "customer", "grand_total", "custom_zatca_status"],
        order_by="creation desc",
        limit=limit
    )
    
    return {
        "count": len(invoices),
        "invoices": invoices
    }


@frappe.whitelist()
def validate_zatca_requirements(invoice_data):
    """Validate invoice data for ZATCA requirements"""
    if isinstance(invoice_data, str):
        invoice_data = json.loads(invoice_data)
    
    errors = []
    warnings = []
    
    # Check required fields
    required_fields = ['company', 'customer', 'items']
    for field in required_fields:
        if not invoice_data.get(field):
            errors.append(f"Missing required field: {field}")
    
    # Check customer VAT
    customer = invoice_data.get('customer')
    if customer:
        customer_doc = frappe.get_doc("Customer", customer)
        if not getattr(customer_doc, 'tax_id', None):
            warnings.append(_("Customer VAT number not set"))
    
    # Check items have tax template
    items = invoice_data.get('items', [])
    for idx, item in enumerate(items):
        if not item.get('item_tax_template'):
            warnings.append(f"Item {idx+1}: No tax template specified")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


@frappe.whitelist()
def get_zatca_invoice_status(invoice_name):
    """Get detailed ZATCA status for invoice"""
    invoice = frappe.get_doc("POS Invoice", invoice_name)
    
    return {
        "invoice": invoice_name,
        "zatca_status": getattr(invoice, 'custom_zatca_status', 'Not Submitted'),
        "uuid": getattr(invoice, 'custom_uuid', None),
        "qr_code": getattr(invoice, 'custom_ksa_einvoicing_qr', None),
        "xml_file": getattr(invoice, 'custom_ksa_einvoicing_xml', None),
        "zatca_response": getattr(invoice, 'custom_zatca_full_response', None)
    }
