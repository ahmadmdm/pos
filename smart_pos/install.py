# Smart POS - Installation Script
# Copyright (c) 2026, Ahmad
# License: MIT

import frappe
from frappe import _


def after_install():
    """Run after app installation"""
    create_default_pos_profile()
    create_default_settings()
    setup_custom_fields()
    print("Smart POS installed successfully!")


def create_default_pos_profile():
    """Create default POS Profile if not exists"""
    if not frappe.db.exists("POS Profile", "Default POS"):
        # Get default company and warehouse
        company = frappe.db.get_single_value("Global Defaults", "default_company")
        if not company:
            company = frappe.db.get_value("Company", {}, "name")
        
        if not company:
            print("No company found. Skipping POS Profile creation.")
            return
        
        # Get default warehouse
        warehouse = frappe.db.get_value("Warehouse", {"company": company, "is_group": 0}, "name")
        
        # Get default income account
        income_account = frappe.db.get_value(
            "Account", 
            {"company": company, "account_type": "Income Account", "is_group": 0}, 
            "name"
        )
        
        # Get default expense account
        expense_account = frappe.db.get_value(
            "Account",
            {"company": company, "account_type": "Cost of Goods Sold", "is_group": 0},
            "name"
        )
        
        if not all([warehouse, income_account]):
            print("Required accounts/warehouses not found. Skipping POS Profile creation.")
            return
        
        print(f"Creating default POS Profile for company: {company}")


def create_default_settings():
    """Create Smart POS Settings"""
    if not frappe.db.exists("DocType", "Smart POS Settings"):
        return
    
    if not frappe.db.exists("Smart POS Settings", "Smart POS Settings"):
        settings = frappe.new_doc("Smart POS Settings")
        settings.enable_offline_mode = 1
        settings.sync_interval = 30  # seconds
        settings.max_offline_days = 7
        settings.enable_barcode_scanning = 1
        settings.enable_loyalty_program = 1
        settings.default_print_format = "POS Invoice"
        settings.save(ignore_permissions=True)
        print("Smart POS Settings created")


def setup_custom_fields():
    """Setup custom fields for existing DocTypes"""
    custom_fields = {
        "POS Invoice": [
            {
                "fieldname": "smart_pos_section",
                "label": "Smart POS",
                "fieldtype": "Section Break",
                "insert_after": "remarks",
                "collapsible": 1
            },
            {
                "fieldname": "offline_id",
                "label": "Offline ID",
                "fieldtype": "Data",
                "insert_after": "smart_pos_section",
                "read_only": 1,
                "no_copy": 1,
                "description": "Unique ID generated offline for sync tracking"
            },
            {
                "fieldname": "synced_from_offline",
                "label": "Synced from Offline",
                "fieldtype": "Check",
                "insert_after": "offline_id",
                "read_only": 1,
                "default": 0
            },
            {
                "fieldname": "sync_timestamp",
                "label": "Sync Timestamp",
                "fieldtype": "Datetime",
                "insert_after": "synced_from_offline",
                "read_only": 1
            },
            {
                "fieldname": "device_id",
                "label": "Device ID",
                "fieldtype": "Data",
                "insert_after": "sync_timestamp",
                "read_only": 1
            }
        ],
        "Customer": [
            {
                "fieldname": "pos_loyalty_points",
                "label": "POS Loyalty Points",
                "fieldtype": "Float",
                "insert_after": "loyalty_program",
                "read_only": 1,
                "default": 0
            }
        ]
    }
    
    for doctype, fields in custom_fields.items():
        for field in fields:
            field_name = f"{doctype}-{field['fieldname']}"
            if not frappe.db.exists("Custom Field", field_name):
                custom_field = frappe.new_doc("Custom Field")
                custom_field.dt = doctype
                custom_field.module = "Smart POS"
                for key, value in field.items():
                    setattr(custom_field, key, value)
                try:
                    custom_field.insert(ignore_permissions=True)
                    print(f"Created custom field: {field_name}")
                except Exception as e:
                    print(f"Could not create custom field {field_name}: {e}")
