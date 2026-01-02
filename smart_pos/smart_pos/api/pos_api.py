# Smart POS - Main POS API
# Copyright (c) 2026, Ahmad
# License: MIT

"""
Main POS API for Smart POS System
Handles POS operations, sessions, invoices, and more
"""

import frappe
from frappe import _
from frappe.utils import now_datetime, flt, cint, getdate, get_datetime, nowdate
import json
from typing import Dict, List, Optional, Any


# =============================================================================
# Permission Check
# =============================================================================

@frappe.whitelist()
def has_pos_permission():
    """Check if user has POS permission"""
    user_roles = frappe.get_roles()
    allowed_roles = ["System Manager", "POS User", "Sales User", "Sales Manager"]
    return any(role in user_roles for role in allowed_roles)


# =============================================================================
# POS Profile & Settings
# =============================================================================

@frappe.whitelist()
def get_pos_profiles():
    """Get POS Profiles accessible to current user"""
    profiles = frappe.get_all(
        "POS Profile",
        filters={"disabled": 0},
        fields=["name", "company", "warehouse", "currency", "write_off_account"]
    )
    
    # Filter by user permissions
    filtered = []
    for profile in profiles:
        if frappe.has_permission("POS Profile", "read", profile.name):
            filtered.append(profile)
    
    return filtered


@frappe.whitelist()
def get_pos_profile_data(pos_profile: str) -> Dict:
    """Get complete POS Profile data including payment methods and item groups"""
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    # Get payment methods
    payments = []
    for pm in profile.payments:
        # Get account from Mode of Payment for the company
        account = frappe.db.get_value(
            "Mode of Payment Account",
            {"parent": pm.mode_of_payment, "company": profile.company},
            "default_account"
        )
        payments.append({
            "mode_of_payment": pm.mode_of_payment,
            "account": account,
            "type": frappe.db.get_value("Mode of Payment", pm.mode_of_payment, "type"),
            "default": pm.default
        })
    
    # Get applicable item groups
    item_groups = []
    for ig in profile.item_groups:
        item_groups.append({
            "item_group": ig.item_group
        })
    
    # Get customer groups
    customer_groups = []
    for cg in profile.customer_groups:
        customer_groups.append({
            "customer_group": cg.customer_group
        })
    
    # Get taxes from taxes_and_charges template
    taxes = []
    if profile.taxes_and_charges:
        template_taxes = frappe.get_all(
            "Sales Taxes and Charges",
            filters={"parent": profile.taxes_and_charges},
            fields=["charge_type", "account_head", "rate", "description", "included_in_print_rate"]
        )
        for tax in template_taxes:
            taxes.append({
                "charge_type": tax.charge_type,
                "account_head": tax.account_head,
                "rate": flt(tax.rate),
                "description": tax.description,
                "included_in_print_rate": tax.included_in_print_rate
            })
    
    return {
        "name": profile.name,
        "company": profile.company,
        "warehouse": profile.warehouse,
        "currency": profile.currency,
        "selling_price_list": profile.selling_price_list,
        "income_account": profile.income_account,
        "expense_account": profile.expense_account,
        "write_off_account": profile.write_off_account,
        "write_off_cost_center": profile.write_off_cost_center,
        "customer": profile.customer,
        "payments": payments,
        "item_groups": item_groups,
        "customer_groups": customer_groups,
        "taxes": taxes,
        "taxes_and_charges": profile.taxes_and_charges,
        "tax_category": profile.tax_category,
        "apply_discount_on": profile.apply_discount_on,
        "print_format": profile.print_format
    }


@frappe.whitelist()
def get_smart_pos_settings() -> Dict:
    """Get Smart POS Settings"""
    try:
        settings = frappe.get_single("Smart POS Settings")
        return {
            "enabled": settings.enabled,
            "default_pos_profile": settings.default_pos_profile,
            "default_company": settings.default_company,
            "default_warehouse": settings.default_warehouse,
            "default_customer": settings.default_customer,
            "enable_offline_mode": settings.enable_offline_mode,
            "sync_interval": settings.sync_interval or 30,
            "max_offline_days": settings.max_offline_days or 7,
            "auto_sync_on_connect": settings.auto_sync_on_connect,
            "enable_barcode_scanning": settings.enable_barcode_scanning,
            "barcode_scan_delay": settings.barcode_scan_delay or 50,
            "enable_cash_drawer": settings.enable_cash_drawer,
            "enable_auto_print": settings.enable_auto_print,
            "enable_thermal_print": getattr(settings, 'enable_thermal_print', False),
            "default_print_format": settings.default_print_format,
            "printer_type": settings.printer_type,
            "printer_ip": settings.printer_ip,
            "printer_port": settings.printer_port or 9100,
            "enable_loyalty_program": settings.enable_loyalty_program,
            "theme": settings.theme or "Modern Blue",
            "show_stock_qty": settings.show_stock_qty,
            "items_per_page": settings.items_per_page or 20,
            "enable_quick_keys": settings.enable_quick_keys
        }
    except Exception:
        # Return defaults if settings don't exist
        return {
            "enabled": 1,
            "enable_offline_mode": 1,
            "sync_interval": 30,
            "max_offline_days": 7,
            "auto_sync_on_connect": 1,
            "enable_barcode_scanning": 1,
            "barcode_scan_delay": 50,
            "theme": "Modern Blue",
            "show_stock_qty": 1,
            "items_per_page": 20,
            "enable_quick_keys": 1
        }


# =============================================================================
# Session Management
# =============================================================================

@frappe.whitelist()
def get_open_session(pos_profile: str = None) -> Optional[Dict]:
    """Get currently open session for user"""
    filters = {
        "user": frappe.session.user,
        "status": "Open"
    }
    if pos_profile:
        filters["pos_profile"] = pos_profile
    
    session = frappe.db.get_value(
        "POS Session",
        filters,
        ["name", "pos_profile", "company", "opening_time", "opening_cash", "device_id"],
        as_dict=True
    )
    
    # Add session_id for consistency with open_session response
    if session:
        session["session_id"] = session.name
    
    return session


@frappe.whitelist()
def get_current_user_pos_settings():
    """Get POS settings for the current user"""
    from smart_pos.smart_pos.doctype.pos_user_settings.pos_user_settings import get_user_pos_settings
    return get_user_pos_settings(frappe.session.user)


@frappe.whitelist()
def open_session(pos_profile: str, opening_cash: float = 0, notes: str = None, device_info: str = None) -> Dict:
    """Open a new POS session"""
    # Check for existing open session
    existing = get_open_session(pos_profile)
    if existing:
        frappe.throw(_("You already have an open session: {0}").format(existing.name))
    
    # Get POS Profile
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    # Get user-specific POS settings
    user_settings = frappe.db.get_value(
        "POS User Settings",
        {"user": frappe.session.user, "enabled": 1},
        ["company", "cost_center", "income_account", "expense_account", "warehouse", "default_customer"],
        as_dict=True
    )
    
    # Use user settings if available, otherwise use profile settings
    company = user_settings.company if user_settings else profile.company
    
    # Create session
    session = frappe.new_doc("POS Session")
    session.pos_profile = pos_profile
    session.company = company
    session.user = frappe.session.user
    session.opening_cash = flt(opening_cash)
    session.opening_time = now_datetime()
    session.status = "Open"
    
    if notes:
        session.opening_notes = notes
    
    if device_info:
        device_info_dict = json.loads(device_info) if isinstance(device_info, str) else device_info
        session.device_id = device_info_dict.get("device_id")
        session.device_name = device_info_dict.get("device_name")
        session.ip_address = device_info_dict.get("ip_address")
    
    session.insert()
    frappe.db.commit()
    
    # Return user settings along with session info
    return {
        "session_id": session.name,
        "pos_profile": session.pos_profile,
        "company": session.company,
        "opening_time": session.opening_time,
        "opening_cash": session.opening_cash,
        "status": "success",
        "user_settings": user_settings
    }


@frappe.whitelist()
def close_session(session_id: str, actual_cash: float = 0, notes: str = None) -> Dict:
    """Close a POS session"""
    session = frappe.get_doc("POS Session", session_id)
    
    if session.status != "Open":
        frappe.throw(_("Session is already closed"))
    
    if session.user != frappe.session.user and "System Manager" not in frappe.get_roles():
        frappe.throw(_("You can only close your own sessions"))
    
    # Calculate totals
    session.close_session(flt(actual_cash), notes)
    
    return {
        "session_id": session.name,
        "status": "Closed",
        "closing_time": str(session.closing_time),
        "total_sales": session.total_sales,
        "total_returns": session.total_returns,
        "expected_cash": session.expected_cash,
        "actual_cash": session.actual_cash,
        "cash_difference": session.cash_difference,
        "total_invoices": session.total_invoices
    }


@frappe.whitelist()
def get_session_summary(session_id: str) -> Dict:
    """Get summary for a POS session"""
    session = frappe.get_doc("POS Session", session_id)
    
    # Get invoices for session
    invoices = frappe.get_all(
        "POS Invoice",
        filters={"pos_session": session_id, "docstatus": 1},
        fields=["name", "grand_total", "is_return", "posting_date", "customer"]
    )
    
    # Get payment breakdown
    payments = frappe.db.sql("""
        SELECT 
            sip.mode_of_payment,
            SUM(sip.amount) as total_amount
        FROM `tabSales Invoice Payment` sip
        JOIN `tabPOS Invoice` pi ON pi.name = sip.parent
        WHERE pi.pos_session = %s AND pi.docstatus = 1
        GROUP BY sip.mode_of_payment
    """, session_id, as_dict=True)
    
    return {
        "session": {
            "name": session.name,
            "pos_profile": session.pos_profile,
            "company": session.company,
            "user": session.user,
            "opening_time": str(session.opening_time),
            "closing_time": str(session.closing_time) if session.closing_time else None,
            "status": session.status,
            "opening_cash": session.opening_cash,
            "expected_cash": session.expected_cash,
            "actual_cash": session.actual_cash,
            "cash_difference": session.cash_difference,
            "total_sales": session.total_sales,
            "total_returns": session.total_returns,
            "total_invoices": session.total_invoices,
            "total_items_sold": session.total_items_sold,
            "average_basket_size": session.average_basket_size,
            "average_basket_value": session.average_basket_value
        },
        "invoices": invoices,
        "payments": payments
    }


# =============================================================================
# Items & Products
# =============================================================================

@frappe.whitelist()
def get_items(pos_profile: str, search_term: str = None, item_group: str = None, 
              start: int = 0, limit: int = 20) -> Dict:
    """Get items for POS with optional search and filtering"""
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    # Build filters
    filters = {
        "disabled": 0,
        "is_sales_item": 1,
        "has_variants": 0
    }
    
    # Filter by item groups if specified in profile
    item_groups = [ig.item_group for ig in profile.item_groups]
    if item_groups and not item_group:
        filters["item_group"] = ["in", item_groups]
    elif item_group:
        filters["item_group"] = item_group
    
    # Search filter
    or_filters = None
    if search_term:
        or_filters = {
            "item_code": ["like", f"%{search_term}%"],
            "item_name": ["like", f"%{search_term}%"],
            "barcode": ["like", f"%{search_term}%"]
        }
    
    # Get items
    items = frappe.get_all(
        "Item",
        filters=filters,
        or_filters=or_filters,
        fields=[
            "name", "item_code", "item_name", "item_group",
            "stock_uom", "image", "description", "brand"
        ],
        start=start,
        limit=limit,
        order_by="item_name asc"
    )
    
    # Get prices and stock for each item
    for item in items:
        # Get price
        price = get_item_price(item.item_code, profile.selling_price_list)
        item["price"] = price
        
        # Get stock
        stock = get_item_stock(item.item_code, profile.warehouse)
        item["stock_qty"] = stock
        
        # Get barcodes
        barcodes = frappe.get_all(
            "Item Barcode",
            filters={"parent": item.item_code},
            fields=["barcode", "barcode_type"]
        )
        item["barcodes"] = barcodes
    
    # Get total count
    total = frappe.db.count("Item", filters)
    
    return {
        "items": items,
        "total": total,
        "start": start,
        "limit": limit
    }


@frappe.whitelist()
def get_item_by_barcode(barcode: str, pos_profile: str) -> Optional[Dict]:
    """Get item by barcode"""
    # Check Item Barcode table first
    item_code = frappe.db.get_value("Item Barcode", {"barcode": barcode}, "parent")
    
    # Check item_code directly
    if not item_code:
        if frappe.db.exists("Item", {"item_code": barcode, "disabled": 0}):
            item_code = barcode
    
    if not item_code:
        return None
    
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    item = frappe.get_doc("Item", item_code)
    price = get_item_price(item_code, profile.selling_price_list)
    stock = get_item_stock(item_code, profile.warehouse)
    
    return {
        "item_code": item.item_code,
        "item_name": item.item_name,
        "item_group": item.item_group,
        "stock_uom": item.stock_uom,
        "image": item.image,
        "price": price,
        "stock_qty": stock,
        "description": item.description
    }


def get_item_price(item_code: str, price_list: str) -> float:
    """Get item price from price list"""
    price = frappe.db.get_value(
        "Item Price",
        {"item_code": item_code, "price_list": price_list, "selling": 1},
        "price_list_rate"
    )
    return flt(price)


def get_item_stock(item_code: str, warehouse: str) -> float:
    """Get item stock quantity"""
    stock = frappe.db.get_value(
        "Bin",
        {"item_code": item_code, "warehouse": warehouse},
        "actual_qty"
    )
    return flt(stock)


@frappe.whitelist()
def get_all_items_for_offline(pos_profile: str) -> List[Dict]:
    """Get all items for offline storage"""
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    # Build filters
    filters = {
        "disabled": 0,
        "is_sales_item": 1,
        "has_variants": 0
    }
    
    # Filter by item groups if specified
    item_groups = [ig.item_group for ig in profile.item_groups]
    if item_groups:
        filters["item_group"] = ["in", item_groups]
    
    items = frappe.get_all(
        "Item",
        filters=filters,
        fields=[
            "name", "item_code", "item_name", "item_group",
            "stock_uom", "image", "description", "brand"
        ]
    )
    
    # Get prices and stock
    for item in items:
        item["price"] = get_item_price(item.item_code, profile.selling_price_list)
        item["stock_qty"] = get_item_stock(item.item_code, profile.warehouse)
        
        # Get barcodes
        barcodes = frappe.get_all(
            "Item Barcode",
            filters={"parent": item.item_code},
            fields=["barcode"]
        )
        item["barcodes"] = [b.barcode for b in barcodes]
    
    return items


# =============================================================================
# Customers
# =============================================================================

@frappe.whitelist()
def get_customers(search_term: str = None, start: int = 0, limit: int = 20) -> Dict:
    """Get customers for POS"""
    filters = {"disabled": 0}
    or_filters = None
    
    if search_term:
        or_filters = {
            "name": ["like", f"%{search_term}%"],
            "customer_name": ["like", f"%{search_term}%"],
            "mobile_no": ["like", f"%{search_term}%"]
        }
    
    customers = frappe.get_all(
        "Customer",
        filters=filters,
        or_filters=or_filters,
        fields=[
            "name", "customer_name", "customer_group", "territory",
            "mobile_no", "email_id", "customer_type"
        ],
        start=start,
        limit=limit,
        order_by="customer_name asc"
    )
    
    # Get loyalty points for each customer
    for cust in customers:
        cust["loyalty_points"] = frappe.db.get_value(
            "Customer", cust.name, "pos_loyalty_points"
        ) or 0
    
    total = frappe.db.count("Customer", filters)
    
    return {
        "customers": customers,
        "total": total
    }


@frappe.whitelist()
def create_customer(customer_name: str, mobile_no: str = None, email_id: str = None,
                   customer_type: str = "Individual", customer_group: str = None) -> Dict:
    """Create a new customer quickly from POS"""
    customer = frappe.new_doc("Customer")
    customer.customer_name = customer_name
    customer.customer_type = customer_type
    customer.mobile_no = mobile_no
    customer.email_id = email_id
    
    if customer_group:
        customer.customer_group = customer_group
    
    customer.insert(ignore_permissions=True)
    frappe.db.commit()
    
    return {
        "name": customer.name,
        "customer_name": customer.customer_name,
        "mobile_no": customer.mobile_no,
        "email_id": customer.email_id
    }


@frappe.whitelist()
def get_all_customers_for_offline() -> List[Dict]:
    """Get all customers for offline storage"""
    customers = frappe.get_all(
        "Customer",
        filters={"disabled": 0},
        fields=[
            "name", "customer_name", "customer_group", "territory",
            "mobile_no", "email_id", "customer_type"
        ]
    )
    
    for cust in customers:
        cust["loyalty_points"] = frappe.db.get_value(
            "Customer", cust.name, "pos_loyalty_points"
        ) or 0
    
    return customers


# =============================================================================
# Invoice Operations
# =============================================================================

@frappe.whitelist()
def create_pos_invoice(invoice_data) -> Dict:
    """Create POS Invoice"""
    if isinstance(invoice_data, str):
        invoice_data = json.loads(invoice_data)
    
    # Get user-specific POS settings first
    user_settings = frappe.db.get_value(
        "POS User Settings",
        {"user": frappe.session.user, "enabled": 1},
        ["company", "cost_center", "income_account", "expense_account", "warehouse", "default_customer"],
        as_dict=True
    )
    
    frappe.logger().info(f"User POS Settings: {user_settings}")
    
    # Check for duplicate offline invoice
    offline_id = invoice_data.get("offline_id")
    if offline_id:
        existing = frappe.db.exists("POS Invoice", {"offline_id": offline_id})
        if existing:
            return {"name": existing, "status": "duplicate", "message": "Invoice already synced"}
    
    invoice = frappe.new_doc("POS Invoice")
    
    # Set company - Priority: user_settings > invoice_data > session > profile
    company = None
    
    # 1. First try user settings
    if user_settings and user_settings.company:
        company = user_settings.company
        frappe.logger().info(f"Company from user_settings: {company}")
    
    # 2. Then try invoice data
    if not company:
        company = invoice_data.get("company")
        frappe.logger().info(f"Company from invoice_data: {company}")
    
    # 3. Then try session
    if not company and invoice_data.get("pos_session"):
        company = frappe.db.get_value("POS Session", invoice_data.get("pos_session"), "company")
        frappe.logger().info(f"Company from session: {company}")
    
    # 4. Finally try POS Profile
    if not company and invoice_data.get("pos_profile"):
        company = frappe.db.get_value("POS Profile", invoice_data.get("pos_profile"), "company")
        frappe.logger().info(f"Company from profile: {company}")
    
    if not company:
        frappe.throw(_("Company is required. Please check your POS User Settings or POS Profile."))
    
    frappe.logger().info(f"Final company for invoice: {company}")
    invoice.company = company
    
    # Get cost center - MUST belong to the selected company
    cost_center = None
    
    # 1. First try from user settings
    if user_settings and user_settings.cost_center:
        # Verify it belongs to the correct company
        cc_company = frappe.db.get_value("Cost Center", user_settings.cost_center, "company")
        if cc_company == company:
            cost_center = user_settings.cost_center
            frappe.logger().info(f"Cost center from user_settings: {cost_center}")
    
    # 2. If not found or invalid, get from company default
    if not cost_center:
        cost_center = frappe.db.get_value("Company", company, "cost_center")
        frappe.logger().info(f"Cost center from company default: {cost_center}")
    
    # 3. If still not found, find any cost center for this company
    if not cost_center:
        cost_center = frappe.db.get_value(
            "Cost Center", 
            {"company": company, "is_group": 0}, 
            "name",
            order_by="creation asc"
        )
        frappe.logger().info(f"Cost center found for company: {cost_center}")
    
    # 4. Final validation - ensure cost center belongs to company
    if cost_center:
        cc_company = frappe.db.get_value("Cost Center", cost_center, "company")
        if cc_company != company:
            frappe.logger().warning(f"Cost center {cost_center} belongs to {cc_company}, not {company}. Finding correct one.")
            cost_center = frappe.db.get_value(
                "Cost Center", 
                {"company": company, "is_group": 0}, 
                "name"
            )
    
    frappe.logger().info(f"Final cost_center for invoice: {cost_center}")
    
    # Set cost center on invoice
    if cost_center:
        invoice.cost_center = cost_center
    
    # Get customer - Priority: invoice_data > user_settings > POS Profile > Smart POS Settings
    customer = invoice_data.get("customer")
    if not customer and user_settings and user_settings.default_customer:
        customer = user_settings.default_customer
    if not customer and invoice_data.get("pos_profile"):
        customer = frappe.db.get_value("POS Profile", invoice_data.get("pos_profile"), "customer")
    if not customer:
        try:
            settings = frappe.get_single("Smart POS Settings")
            customer = settings.default_customer
        except Exception:
            pass
    if not customer:
        frappe.throw(_("Please select a customer or set a default customer in POS User Settings"))
    
    invoice.customer = customer
    invoice.pos_profile = invoice_data.get("pos_profile")
    invoice.posting_date = invoice_data.get("posting_date") or nowdate()
    invoice.posting_time = invoice_data.get("posting_time")
    invoice.due_date = invoice_data.get("due_date") or nowdate()
    invoice.is_pos = 1
    
    # Session
    if invoice_data.get("pos_session"):
        invoice.pos_session = invoice_data.get("pos_session")
    
    # Offline tracking
    if offline_id:
        invoice.offline_id = offline_id
        invoice.synced_from_offline = 1
        invoice.sync_timestamp = now_datetime()
        invoice.device_id = invoice_data.get("device_id")
    
    # Set warehouse - Priority: user_settings > invoice_data > profile
    profile = frappe.get_doc("POS Profile", invoice.pos_profile)
    
    warehouse = None
    if user_settings and user_settings.warehouse:
        warehouse = user_settings.warehouse
    else:
        warehouse = invoice_data.get("warehouse") or profile.warehouse
    
    # Use cost_center already determined above (from user_settings or company default)
    frappe.logger().info(f"Using cost_center: {cost_center}, warehouse: {warehouse}")
    
    # Add items with correct cost center - FORCE cost center to match company
    for item in invoice_data.get("items", []):
        item_data = {
            "item_code": item.get("item_code"),
            "item_name": item.get("item_name"),
            "qty": flt(item.get("qty")),
            "rate": flt(item.get("rate")),
            "warehouse": item.get("warehouse") or warehouse,
            "uom": item.get("uom") or item.get("stock_uom"),
            "discount_percentage": flt(item.get("discount_percentage")),
            "discount_amount": flt(item.get("discount_amount")),
            "cost_center": cost_center  # Always set cost center
        }
        # Set income account from user settings if available
        if user_settings and user_settings.income_account:
            item_data["income_account"] = user_settings.income_account
        invoice.append("items", item_data)
    
    # Add payments - get correct account for this company
    for payment in invoice_data.get("payments", []):
        mode_of_payment = payment.get("mode_of_payment")
        # Get the correct account for this mode of payment and company
        account = frappe.db.get_value(
            "Mode of Payment Account",
            {"parent": mode_of_payment, "company": company},
            "default_account"
        )
        invoice.append("payments", {
            "mode_of_payment": mode_of_payment,
            "amount": flt(payment.get("amount")),
            "account": account or payment.get("account")
        })
    
    # Add taxes - from invoice_data OR from POS Profile taxes_and_charges template
    taxes_added = False
    for tax in invoice_data.get("taxes", []):
        invoice.append("taxes", {
            "charge_type": tax.get("charge_type"),
            "account_head": tax.get("account_head"),
            "rate": flt(tax.get("rate")),
            "tax_amount": flt(tax.get("tax_amount")),
            "description": tax.get("description")
        })
        taxes_added = True
    
    # If no taxes from invoice_data, get from POS Profile taxes_and_charges template
    if not taxes_added and invoice.pos_profile:
        taxes_template = frappe.db.get_value("POS Profile", invoice.pos_profile, "taxes_and_charges")
        if taxes_template:
            # Set the taxes_and_charges field
            invoice.taxes_and_charges = taxes_template
            # Get taxes from template
            template_taxes = frappe.get_all(
                "Sales Taxes and Charges",
                filters={"parent": taxes_template},
                fields=["charge_type", "account_head", "rate", "description", "included_in_print_rate", "included_in_paid_amount"]
            )
            for tax in template_taxes:
                invoice.append("taxes", {
                    "charge_type": tax.charge_type,
                    "account_head": tax.account_head,
                    "rate": flt(tax.rate),
                    "description": tax.description or tax.account_head,
                    "included_in_print_rate": tax.included_in_print_rate,
                    "included_in_paid_amount": tax.included_in_paid_amount
                })
            frappe.logger().info(f"Added {len(template_taxes)} taxes from template: {taxes_template}")
    
    # Set discount
    if invoice_data.get("discount_amount"):
        invoice.discount_amount = flt(invoice_data.get("discount_amount"))
    if invoice_data.get("additional_discount_percentage"):
        invoice.additional_discount_percentage = flt(invoice_data.get("additional_discount_percentage"))
    
    # CRITICAL: Force set cost center again before insert to override any defaults
    invoice.cost_center = cost_center
    for item in invoice.items:
        item.cost_center = cost_center
    
    frappe.logger().info(f"Before insert - Invoice cost_center: {invoice.cost_center}")
    frappe.logger().info(f"Before insert - Items cost_centers: {[i.cost_center for i in invoice.items]}")
    
    # Save and submit with flags to skip certain validations
    invoice.flags.ignore_validate = False
    invoice.insert()
    
    # Force update cost center after insert if it was changed by hooks
    if invoice.cost_center != cost_center:
        frappe.logger().warning(f"Cost center changed after insert! Forcing back to {cost_center}")
        invoice.cost_center = cost_center
        for item in invoice.items:
            item.cost_center = cost_center
        invoice.save()
    
    if invoice_data.get("submit", True):
        invoice.submit()
    
    frappe.db.commit()
    
    return {
        "name": invoice.name,
        "status": "success",
        "grand_total": invoice.grand_total,
        "posting_date": str(invoice.posting_date),
        "customer": invoice.customer
    }


@frappe.whitelist()
def get_invoice(invoice_name: str) -> Dict:
    """Get POS Invoice details"""
    invoice = frappe.get_doc("POS Invoice", invoice_name)
    
    items = []
    for item in invoice.items:
        items.append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "qty": item.qty,
            "rate": item.rate,
            "amount": item.amount,
            "discount_percentage": item.discount_percentage,
            "discount_amount": item.discount_amount
        })
    
    payments = []
    for payment in invoice.payments:
        payments.append({
            "mode_of_payment": payment.mode_of_payment,
            "amount": payment.amount
        })
    
    return {
        "name": invoice.name,
        "company": invoice.company,
        "customer": invoice.customer,
        "customer_name": invoice.customer_name,
        "posting_date": str(invoice.posting_date),
        "posting_time": str(invoice.posting_time),
        "grand_total": invoice.grand_total,
        "net_total": invoice.net_total,
        "total_taxes_and_charges": invoice.total_taxes_and_charges,
        "discount_amount": invoice.discount_amount,
        "items": items,
        "payments": payments,
        "status": invoice.status,
        "docstatus": invoice.docstatus
    }


@frappe.whitelist()
def create_return_invoice(original_invoice: str, return_items: List[Dict]) -> Dict:
    """Create return invoice for POS"""
    if isinstance(return_items, str):
        return_items = json.loads(return_items)
    
    original = frappe.get_doc("POS Invoice", original_invoice)
    
    if original.docstatus != 1:
        frappe.throw(_("Cannot create return for draft or cancelled invoice"))
    
    # Create return invoice
    return_invoice = frappe.copy_doc(original)
    return_invoice.is_return = 1
    return_invoice.return_against = original_invoice
    return_invoice.posting_date = nowdate()
    return_invoice.posting_time = now_datetime().strftime("%H:%M:%S")
    
    # Clear and add return items
    return_invoice.items = []
    for item in return_items:
        return_invoice.append("items", {
            "item_code": item.get("item_code"),
            "item_name": item.get("item_name"),
            "qty": -abs(flt(item.get("qty"))),  # Negative quantity for returns
            "rate": flt(item.get("rate")),
            "warehouse": item.get("warehouse") or original.items[0].warehouse
        })
    
    # Adjust payments for return
    total_return = sum(abs(flt(item.get("qty")) * flt(item.get("rate"))) for item in return_items)
    return_invoice.payments = []
    return_invoice.append("payments", {
        "mode_of_payment": original.payments[0].mode_of_payment if original.payments else "Cash",
        "amount": -total_return
    })
    
    return_invoice.insert()
    return_invoice.submit()
    frappe.db.commit()
    
    return {
        "name": return_invoice.name,
        "status": "success",
        "grand_total": return_invoice.grand_total,
        "return_against": original_invoice
    }


# =============================================================================
# Tax Calculation
# =============================================================================

@frappe.whitelist()
def get_tax_template(pos_profile: str) -> Dict:
    """Get tax template for POS Profile"""
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    taxes = []
    if profile.taxes_and_charges:
        template = frappe.get_doc("Sales Taxes and Charges Template", profile.taxes_and_charges)
        for tax in template.taxes:
            taxes.append({
                "charge_type": tax.charge_type,
                "account_head": tax.account_head,
                "rate": tax.rate,
                "description": tax.description
            })
    
    return {
        "template_name": profile.taxes_and_charges,
        "taxes": taxes
    }


@frappe.whitelist()
def calculate_taxes(items: List[Dict], tax_template: str = None) -> Dict:
    """Calculate taxes for items"""
    if isinstance(items, str):
        items = json.loads(items)
    
    subtotal = sum(flt(item.get("qty", 1)) * flt(item.get("rate", 0)) for item in items)
    
    taxes = []
    total_tax = 0
    
    if tax_template:
        template = frappe.get_doc("Sales Taxes and Charges Template", tax_template)
        for tax in template.taxes:
            if tax.charge_type == "On Net Total":
                tax_amount = subtotal * flt(tax.rate) / 100
            else:
                tax_amount = flt(tax.tax_amount)
            
            taxes.append({
                "charge_type": tax.charge_type,
                "account_head": tax.account_head,
                "rate": tax.rate,
                "tax_amount": tax_amount,
                "description": tax.description
            })
            total_tax += tax_amount
    
    return {
        "subtotal": subtotal,
        "taxes": taxes,
        "total_tax": total_tax,
        "grand_total": subtotal + total_tax
    }


# =============================================================================
# Printing
# =============================================================================

@frappe.whitelist()
def get_print_format(invoice_name: str, print_format: str = None) -> str:
    """Get print format HTML for invoice"""
    if not print_format:
        settings = frappe.get_single("Smart POS Settings")
        print_format = settings.default_print_format or "POS Invoice"
    
    html = frappe.get_print(
        "POS Invoice",
        invoice_name,
        print_format=print_format
    )
    
    return html


@frappe.whitelist()
def get_receipt_data(invoice_name: str) -> Dict:
    """Get receipt data for thermal printing"""
    invoice = frappe.get_doc("POS Invoice", invoice_name)
    company = frappe.get_doc("Company", invoice.company)
    
    items = []
    for item in invoice.items:
        items.append({
            "item_name": item.item_name,
            "qty": item.qty,
            "rate": item.rate,
            "amount": item.amount
        })
    
    payments = []
    for payment in invoice.payments:
        payments.append({
            "mode": payment.mode_of_payment,
            "amount": payment.amount
        })
    
    return {
        "company_name": company.company_name,
        "company_address": company.address or "",
        "company_phone": company.phone_no or "",
        "tax_id": company.tax_id or "",
        "invoice_name": invoice.name,
        "posting_date": str(invoice.posting_date),
        "posting_time": str(invoice.posting_time),
        "customer_name": invoice.customer_name,
        "items": items,
        "subtotal": invoice.net_total,
        "tax_amount": invoice.total_taxes_and_charges,
        "discount": invoice.discount_amount,
        "grand_total": invoice.grand_total,
        "payments": payments,
        "cashier": frappe.db.get_value("User", invoice.owner, "full_name")
    }


# =============================================================================
# Document Event Handlers
# =============================================================================

def on_pos_invoice_submit(doc, method):
    """Handle POS Invoice submission"""
    # Update session totals
    if doc.pos_session:
        session = frappe.get_doc("POS Session", doc.pos_session)
        if doc.is_return:
            session.total_returns = flt(session.total_returns) + abs(flt(doc.grand_total))
        else:
            session.total_sales = flt(session.total_sales) + flt(doc.grand_total)
        session.total_invoices = cint(session.total_invoices) + 1
        session.total_items_sold = cint(session.total_items_sold) + sum(item.qty for item in doc.items)
        session.save()
    
    # Update customer loyalty points
    update_customer_loyalty(doc)


def on_pos_invoice_cancel(doc, method):
    """Handle POS Invoice cancellation"""
    # Reverse session totals
    if doc.pos_session:
        session = frappe.get_doc("POS Session", doc.pos_session)
        if doc.is_return:
            session.total_returns = flt(session.total_returns) - abs(flt(doc.grand_total))
        else:
            session.total_sales = flt(session.total_sales) - flt(doc.grand_total)
        session.total_invoices = cint(session.total_invoices) - 1
        session.total_items_sold = cint(session.total_items_sold) - sum(item.qty for item in doc.items)
        session.save()
    
    # Reverse loyalty points
    reverse_customer_loyalty(doc)


def on_opening_entry_submit(doc, method):
    """Handle POS Opening Entry submission"""
    pass


def on_closing_entry_submit(doc, method):
    """Handle POS Closing Entry submission"""
    pass


def update_customer_loyalty(doc):
    """Update customer loyalty points after sale"""
    if not doc.customer:
        return
    
    try:
        settings = frappe.get_single("Smart POS Settings")
        if not settings.enable_loyalty_program:
            return
        
        points_per_currency = flt(settings.points_per_currency) or 1
        points = flt(doc.grand_total) * points_per_currency
        
        current_points = frappe.db.get_value("Customer", doc.customer, "pos_loyalty_points") or 0
        frappe.db.set_value("Customer", doc.customer, "pos_loyalty_points", current_points + points)
    except Exception:
        pass


def reverse_customer_loyalty(doc):
    """Reverse customer loyalty points after cancellation"""
    if not doc.customer:
        return
    
    try:
        settings = frappe.get_single("Smart POS Settings")
        if not settings.enable_loyalty_program:
            return
        
        points_per_currency = flt(settings.points_per_currency) or 1
        points = flt(doc.grand_total) * points_per_currency
        
        current_points = frappe.db.get_value("Customer", doc.customer, "pos_loyalty_points") or 0
        frappe.db.set_value("Customer", doc.customer, "pos_loyalty_points", max(0, current_points - points))
    except Exception:
        pass


# =============================================================================
# Cleanup & Maintenance
# =============================================================================

def cleanup_old_sessions():
    """Clean up old sessions (scheduled daily)"""
    from frappe.utils import add_days
    
    cutoff_date = add_days(nowdate(), -30)
    
    # Close sessions older than 30 days that are still open
    old_sessions = frappe.get_all(
        "POS Session",
        filters={
            "status": "Open",
            "opening_time": ["<", cutoff_date]
        }
    )
    
    for session in old_sessions:
        try:
            doc = frappe.get_doc("POS Session", session.name)
            doc.close_session(0, "Auto-closed by system due to inactivity")
            frappe.logger().info(f"Auto-closed old POS Session: {session.name}")
        except Exception as e:
            frappe.logger().error(f"Error closing POS Session {session.name}: {e}")


# =============================================================================
# Printer Support
# =============================================================================

@frappe.whitelist()
def check_printer(printer_ip: str, printer_port: int = 9100):
    """Check if a network printer is reachable"""
    import socket
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((printer_ip, int(printer_port)))
        sock.close()
        
        return {
            "connected": result == 0,
            "ip": printer_ip,
            "port": printer_port
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }


@frappe.whitelist()
def send_to_printer(printer_ip: str, printer_port: int = 9100, data: str = None):
    """Send raw data to network printer"""
    import socket
    import base64
    
    if not data:
        return {"success": False, "error": "No data provided"}
    
    try:
        # Decode base64 data
        raw_data = base64.b64decode(data)
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((printer_ip, int(printer_port)))
        sock.sendall(raw_data)
        sock.close()
        
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_print_receipt_data(invoice_name: str):
    """Get formatted receipt data for an invoice"""
    invoice = frappe.get_doc("POS Invoice", invoice_name)
    company = frappe.get_doc("Company", invoice.company)
    
    # Get payment details
    payments = []
    for payment in invoice.payments:
        payments.append({
            "mode_of_payment": payment.mode_of_payment,
            "amount": payment.amount
        })
    
    return {
        "company_name": company.company_name,
        "company_address": company.address or "",
        "company_phone": company.phone_no or "",
        "company_tax_id": company.tax_id or "",
        "invoice_name": invoice.name,
        "posting_date": str(invoice.posting_date),
        "posting_time": str(invoice.posting_time) if invoice.posting_time else "",
        "cashier": frappe.db.get_value("User", invoice.owner, "full_name") or invoice.owner,
        "customer_name": invoice.customer_name,
        "items": [{
            "item_name": item.item_name,
            "qty": item.qty,
            "rate": item.rate,
            "amount": item.amount,
            "discount_amount": item.discount_amount or 0
        } for item in invoice.items],
        "subtotal": invoice.total,
        "discount": invoice.discount_amount or 0,
        "tax": invoice.total_taxes_and_charges or 0,
        "total": invoice.grand_total,
        "payments": payments,
        "qr_code": getattr(invoice, 'custom_ksa_einvoicing_qr', None)
    }

