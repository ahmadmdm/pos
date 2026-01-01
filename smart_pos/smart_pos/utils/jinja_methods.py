# Smart POS - Jinja Methods
# Copyright (c) 2026, Ahmad
# License: MIT

"""
Jinja template methods for Smart POS
"""

import frappe
from frappe import _


def get_pos_settings():
    """Get POS settings for templates"""
    try:
        settings = frappe.get_single("Smart POS Settings")
        return {
            "enabled": settings.enabled,
            "theme": settings.theme or "Modern Blue",
            "enable_offline_mode": settings.enable_offline_mode,
            "show_stock_qty": settings.show_stock_qty
        }
    except Exception:
        return {}


def format_currency(amount, currency=None):
    """Format currency for display"""
    return frappe.format(amount, {"fieldtype": "Currency"})


def get_user_pos_profile():
    """Get default POS profile for current user"""
    profiles = frappe.get_all(
        "POS Profile",
        filters={"disabled": 0},
        limit=1
    )
    return profiles[0].name if profiles else None


# Export methods
jinja_methods = {
    "get_pos_settings": get_pos_settings,
    "format_currency": format_currency,
    "get_user_pos_profile": get_user_pos_profile
}
