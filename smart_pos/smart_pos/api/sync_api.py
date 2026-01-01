# Smart POS - Sync API
# Copyright (c) 2026, Ahmad
# License: MIT

"""
Sync API for Smart POS System
Handles offline/online data synchronization
"""

import frappe
from frappe import _
from frappe.utils import now_datetime, nowdate, flt, cint, add_days
import json
from typing import Dict, List, Optional, Any


# =============================================================================
# Sync Operations
# =============================================================================

@frappe.whitelist()
def sync_offline_data(data: Dict) -> Dict:
    """
    Main sync endpoint for offline data
    Handles invoices, customers, and other documents created offline
    """
    if isinstance(data, str):
        data = json.loads(data)
    
    results = {
        "success": [],
        "failed": [],
        "conflicts": [],
        "timestamp": now_datetime()
    }
    
    # Sync invoices
    for invoice in data.get("invoices", []):
        try:
            result = sync_invoice(invoice)
            if result.get("status") == "success":
                results["success"].append({
                    "type": "invoice",
                    "offline_id": invoice.get("offline_id"),
                    "server_id": result.get("name")
                })
            elif result.get("status") == "conflict":
                results["conflicts"].append({
                    "type": "invoice",
                    "offline_id": invoice.get("offline_id"),
                    "message": result.get("message")
                })
            else:
                results["failed"].append({
                    "type": "invoice",
                    "offline_id": invoice.get("offline_id"),
                    "error": result.get("error")
                })
        except Exception as e:
            results["failed"].append({
                "type": "invoice",
                "offline_id": invoice.get("offline_id"),
                "error": str(e)
            })
    
    # Sync customers
    for customer in data.get("customers", []):
        try:
            result = sync_customer(customer)
            if result.get("status") == "success":
                results["success"].append({
                    "type": "customer",
                    "offline_id": customer.get("offline_id"),
                    "server_id": result.get("name")
                })
            else:
                results["failed"].append({
                    "type": "customer",
                    "offline_id": customer.get("offline_id"),
                    "error": result.get("error")
                })
        except Exception as e:
            results["failed"].append({
                "type": "customer",
                "offline_id": customer.get("offline_id"),
                "error": str(e)
            })
    
    frappe.db.commit()
    
    return results


def sync_invoice(invoice_data: Dict) -> Dict:
    """Sync a single invoice from offline"""
    offline_id = invoice_data.get("offline_id")
    
    # Check if already synced
    existing = frappe.db.get_value("POS Invoice", {"offline_id": offline_id}, "name")
    if existing:
        return {"status": "success", "name": existing, "message": "Already synced"}
    
    # Create sync log
    sync_log = frappe.new_doc("POS Sync Log")
    sync_log.offline_id = offline_id
    sync_log.document_type = "POS Invoice"
    sync_log.data_json = json.dumps(invoice_data)
    sync_log.device_id = invoice_data.get("device_id")
    sync_log.user = frappe.session.user
    sync_log.session_id = invoice_data.get("session_id")
    sync_log.created_offline_at = invoice_data.get("created_at")
    sync_log.status = "Pending"
    sync_log.insert(ignore_permissions=True)
    
    # Process sync
    result = sync_log.process_sync()
    
    return result


def sync_customer(customer_data: Dict) -> Dict:
    """Sync a customer from offline"""
    # Check if customer already exists
    existing = frappe.db.get_value(
        "Customer", 
        {"customer_name": customer_data.get("customer_name")},
        "name"
    )
    if existing:
        return {"status": "success", "name": existing, "message": "Already exists"}
    
    # Check by mobile
    if customer_data.get("mobile_no"):
        existing = frappe.db.get_value(
            "Customer",
            {"mobile_no": customer_data.get("mobile_no")},
            "name"
        )
        if existing:
            return {"status": "success", "name": existing, "message": "Already exists"}
    
    # Create new customer
    customer = frappe.new_doc("Customer")
    customer.customer_name = customer_data.get("customer_name")
    customer.customer_type = customer_data.get("customer_type", "Individual")
    customer.mobile_no = customer_data.get("mobile_no")
    customer.email_id = customer_data.get("email_id")
    customer.customer_group = customer_data.get("customer_group")
    customer.insert(ignore_permissions=True)
    
    return {"status": "success", "name": customer.name}


# =============================================================================
# Master Data Sync
# =============================================================================

@frappe.whitelist()
def get_master_data_for_offline(pos_profile: str, last_sync: str = None) -> Dict:
    """
    Get all master data needed for offline operation
    Includes items, customers, prices, taxes
    """
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    # Items filter
    item_filters = {
        "disabled": 0,
        "is_sales_item": 1,
        "has_variants": 0
    }
    
    # Apply last sync filter if provided
    if last_sync:
        item_filters["modified"] = [">=", last_sync]
    
    # Get items
    items = frappe.get_all(
        "Item",
        filters=item_filters,
        fields=[
            "name", "item_code", "item_name", "item_group",
            "stock_uom", "image", "description", "brand", "modified"
        ]
    )
    
    # Enrich items with prices, stock, and barcodes
    for item in items:
        # Price
        price = frappe.db.get_value(
            "Item Price",
            {"item_code": item.item_code, "price_list": profile.selling_price_list, "selling": 1},
            "price_list_rate"
        )
        item["price"] = flt(price)
        
        # Stock
        stock = frappe.db.get_value(
            "Bin",
            {"item_code": item.item_code, "warehouse": profile.warehouse},
            "actual_qty"
        )
        item["stock_qty"] = flt(stock)
        
        # Barcodes
        barcodes = frappe.get_all(
            "Item Barcode",
            filters={"parent": item.item_code},
            fields=["barcode"]
        )
        item["barcodes"] = [b.barcode for b in barcodes]
    
    # Get customers
    customer_filters = {"disabled": 0}
    if last_sync:
        customer_filters["modified"] = [">=", last_sync]
    
    customers = frappe.get_all(
        "Customer",
        filters=customer_filters,
        fields=[
            "name", "customer_name", "customer_group", "territory",
            "mobile_no", "email_id", "customer_type", "modified"
        ]
    )
    
    # Get item groups
    item_groups = []
    for ig in profile.item_groups:
        item_groups.append({
            "name": ig.item_group
        })
    if not item_groups:
        item_groups = frappe.get_all(
            "Item Group",
            filters={"is_group": 0},
            fields=["name", "parent_item_group"]
        )
    
    # Get payment methods
    payments = []
    for pm in profile.payments:
        payments.append({
            "mode_of_payment": pm.mode_of_payment,
            "account": pm.account,
            "type": frappe.db.get_value("Mode of Payment", pm.mode_of_payment, "type"),
            "default": pm.default
        })
    
    # Get taxes
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
        "items": items,
        "customers": customers,
        "item_groups": item_groups,
        "payment_methods": payments,
        "taxes": taxes,
        "profile": {
            "name": profile.name,
            "company": profile.company,
            "warehouse": profile.warehouse,
            "currency": profile.currency,
            "selling_price_list": profile.selling_price_list,
            "customer": profile.customer
        },
        "sync_timestamp": str(now_datetime()),
        "total_items": len(items),
        "total_customers": len(customers)
    }


@frappe.whitelist()
def get_stock_update(pos_profile: str, item_codes: List[str] = None) -> List[Dict]:
    """Get latest stock quantities for items"""
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    if isinstance(item_codes, str):
        item_codes = json.loads(item_codes)
    
    filters = {"warehouse": profile.warehouse}
    if item_codes:
        filters["item_code"] = ["in", item_codes]
    
    stocks = frappe.get_all(
        "Bin",
        filters=filters,
        fields=["item_code", "actual_qty", "reserved_qty", "projected_qty"]
    )
    
    return stocks


@frappe.whitelist()
def get_price_update(pos_profile: str, item_codes: List[str] = None, last_sync: str = None) -> List[Dict]:
    """Get latest prices for items"""
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    if isinstance(item_codes, str):
        item_codes = json.loads(item_codes)
    
    filters = {
        "price_list": profile.selling_price_list,
        "selling": 1
    }
    
    if item_codes:
        filters["item_code"] = ["in", item_codes]
    
    if last_sync:
        filters["modified"] = [">=", last_sync]
    
    prices = frappe.get_all(
        "Item Price",
        filters=filters,
        fields=["item_code", "price_list_rate", "modified"]
    )
    
    return prices


# =============================================================================
# Scheduled Sync Tasks
# =============================================================================

def process_pending_sync():
    """Process pending sync logs (scheduled every 5 minutes)"""
    pending_logs = frappe.get_all(
        "POS Sync Log",
        filters={
            "status": ["in", ["Pending", "Failed"]],
            "attempt_count": ["<", 5]  # Max 5 retries
        },
        order_by="priority desc, creation asc",
        limit=50
    )
    
    for log in pending_logs:
        try:
            sync_log = frappe.get_doc("POS Sync Log", log.name)
            sync_log.process_sync()
        except Exception as e:
            frappe.logger().error(f"Error processing sync log {log.name}: {e}")
    
    frappe.db.commit()


def sync_master_data():
    """Sync master data changes (scheduled hourly)"""
    # This is mainly for tracking - actual data fetch is on-demand
    frappe.logger().info("Smart POS: Master data sync check completed")


# =============================================================================
# Conflict Resolution
# =============================================================================

@frappe.whitelist()
def get_sync_conflicts() -> List[Dict]:
    """Get list of sync conflicts for resolution"""
    conflicts = frappe.get_all(
        "POS Sync Log",
        filters={"status": "Conflict"},
        fields=["name", "offline_id", "document_type", "data_json", "error_message", "creation"]
    )
    
    return conflicts


@frappe.whitelist()
def resolve_conflict(sync_log_name: str, resolution: str, data: Dict = None) -> Dict:
    """
    Resolve a sync conflict
    resolution: 'keep_server', 'keep_offline', 'merge'
    """
    if isinstance(data, str):
        data = json.loads(data)
    
    sync_log = frappe.get_doc("POS Sync Log", sync_log_name)
    
    if resolution == "keep_server":
        # Mark as resolved, keep server version
        sync_log.status = "Synced"
        sync_log.synced_at = now_datetime()
        sync_log.error_message = "Resolved: Kept server version"
        sync_log.save()
        
    elif resolution == "keep_offline":
        # Force sync offline data
        offline_data = json.loads(sync_log.data_json)
        if data:
            offline_data.update(data)
        
        # Delete existing server document if any
        if sync_log.document_name:
            try:
                frappe.delete_doc(sync_log.document_type, sync_log.document_name, force=True)
            except Exception:
                pass
        
        # Re-process sync
        sync_log.process_sync()
        
    elif resolution == "merge":
        # Merge data - requires manual data parameter
        if not data:
            frappe.throw(_("Merge resolution requires merged data"))
        
        sync_log.data_json = json.dumps(data)
        sync_log.process_sync()
    
    frappe.db.commit()
    
    return {"status": "resolved", "sync_log": sync_log.name}


# =============================================================================
# Sync Status & Statistics
# =============================================================================

@frappe.whitelist()
def get_sync_status() -> Dict:
    """Get current sync status and statistics"""
    pending = frappe.db.count("POS Sync Log", {"status": "Pending"})
    processing = frappe.db.count("POS Sync Log", {"status": "Processing"})
    synced = frappe.db.count("POS Sync Log", {"status": "Synced"})
    failed = frappe.db.count("POS Sync Log", {"status": "Failed"})
    conflicts = frappe.db.count("POS Sync Log", {"status": "Conflict"})
    
    # Get last sync time
    last_sync = frappe.db.get_value(
        "POS Sync Log",
        {"status": "Synced"},
        "synced_at",
        order_by="synced_at desc"
    )
    
    return {
        "pending": pending,
        "processing": processing,
        "synced": synced,
        "failed": failed,
        "conflicts": conflicts,
        "last_sync": str(last_sync) if last_sync else None,
        "is_syncing": processing > 0
    }


@frappe.whitelist()
def get_sync_history(limit: int = 50) -> List[Dict]:
    """Get sync history"""
    logs = frappe.get_all(
        "POS Sync Log",
        fields=[
            "name", "offline_id", "document_type", "document_name",
            "status", "sync_direction", "attempt_count", "synced_at",
            "error_message", "creation"
        ],
        order_by="creation desc",
        limit=limit
    )
    
    return logs


# =============================================================================
# Data Cleanup
# =============================================================================

@frappe.whitelist()
def cleanup_old_sync_logs(days: int = 30):
    """Clean up old sync logs"""
    cutoff_date = add_days(nowdate(), -days)
    
    # Delete old successful sync logs
    frappe.db.sql("""
        DELETE FROM `tabPOS Sync Log`
        WHERE status = 'Synced' AND creation < %s
    """, cutoff_date)
    
    frappe.db.commit()
    
    return {"status": "success", "message": f"Cleaned up sync logs older than {days} days"}
