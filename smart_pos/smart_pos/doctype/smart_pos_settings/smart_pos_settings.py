# Smart POS Settings
# Copyright (c) 2026, Ahmad
# License: MIT

import frappe
from frappe.model.document import Document


class SmartPOSSettings(Document):
    def validate(self):
        self.validate_sync_interval()
        self.validate_offline_settings()
    
    def validate_sync_interval(self):
        if self.sync_interval < 10:
            frappe.throw("Sync interval must be at least 10 seconds")
        if self.sync_interval > 3600:
            frappe.throw("Sync interval cannot exceed 1 hour (3600 seconds)")
    
    def validate_offline_settings(self):
        if self.max_offline_days < 1:
            frappe.throw("Max offline days must be at least 1")
        if self.max_offline_days > 30:
            frappe.throw("Max offline days cannot exceed 30")
        if self.offline_data_limit_mb < 10:
            frappe.throw("Offline data limit must be at least 10 MB")


@frappe.whitelist()
def get_settings():
    """Get Smart POS Settings for frontend"""
    settings = frappe.get_single("Smart POS Settings")
    return {
        "enabled": settings.enabled,
        "default_pos_profile": settings.default_pos_profile,
        "default_company": settings.default_company,
        "default_warehouse": settings.default_warehouse,
        "default_customer": settings.default_customer,
        "default_income_account": settings.default_income_account,
        "default_tax_template": settings.default_tax_template,
        "enable_offline_mode": settings.enable_offline_mode,
        "sync_interval": settings.sync_interval,
        "max_offline_days": settings.max_offline_days,
        "auto_sync_on_connect": settings.auto_sync_on_connect,
        "offline_data_limit_mb": settings.offline_data_limit_mb,
        "enable_barcode_scanning": settings.enable_barcode_scanning,
        "barcode_scan_delay": settings.barcode_scan_delay,
        "enable_cash_drawer": settings.enable_cash_drawer,
        "cash_drawer_command": settings.cash_drawer_command,
        "enable_auto_print": settings.enable_auto_print,
        "default_print_format": settings.default_print_format,
        "printer_type": settings.printer_type,
        "printer_ip": settings.printer_ip,
        "printer_port": settings.printer_port,
        "enable_loyalty_program": settings.enable_loyalty_program,
        "default_loyalty_program": settings.default_loyalty_program,
        "points_per_currency": settings.points_per_currency,
        "min_points_to_redeem": settings.min_points_to_redeem,
        "redemption_value": settings.redemption_value,
        "theme": settings.theme,
        "show_stock_qty": settings.show_stock_qty,
        "items_per_page": settings.items_per_page,
        "enable_quick_keys": settings.enable_quick_keys
    }
