# Smart POS - Enterprise Point of Sale System
# Copyright (c) 2026, Ahmad
# License: MIT

app_name = "smart_pos"
app_title = "Smart POS"
app_publisher = "Ahmad"
app_description = "Enterprise-grade Offline-First Point of Sale System for Frappe/ERPNext"
app_email = "ahmad@example.com"
app_license = "MIT"
app_version = "1.0.0"

# Required Apps
required_apps = ["frappe", "erpnext"]

# Apps Screen
add_to_apps_screen = [
    {
        "name": "smart_pos",
        "logo": "/assets/smart_pos/images/pos_logo.png",
        "title": "Smart POS",
        "route": "/app/pos-terminal",
        "has_permission": "smart_pos.smart_pos.api.pos_api.has_pos_permission"
    }
]

# Includes in <head>
app_include_css = [
    "/assets/smart_pos/css/smart_pos.css"
]

app_include_js = [
    "/assets/smart_pos/js/pos_database.js",
    "/assets/smart_pos/js/pos_sync.js",
    "/assets/smart_pos/js/pos_hardware.js",
    "/assets/smart_pos/js/pos_performance.js",
    "/assets/smart_pos/js/pos_hold_recall.js",
    "/assets/smart_pos/js/pos_shortcuts.js",
    "/assets/smart_pos/js/pos_discount.js",
    "/assets/smart_pos/js/pos_printer.js",
    "/assets/smart_pos/js/smart_pos.bundle.js"
]

# Document Events
doc_events = {
    "POS Invoice": {
        "on_submit": "smart_pos.smart_pos.api.pos_api.on_pos_invoice_submit",
        "on_cancel": "smart_pos.smart_pos.api.pos_api.on_pos_invoice_cancel"
    },
    "POS Opening Entry": {
        "on_submit": "smart_pos.smart_pos.api.pos_api.on_opening_entry_submit"
    },
    "POS Closing Entry": {
        "on_submit": "smart_pos.smart_pos.api.pos_api.on_closing_entry_submit"
    }
}

# Scheduled Tasks
scheduler_events = {
    "cron": {
        "*/5 * * * *": [
            "smart_pos.smart_pos.api.sync_api.process_pending_sync"
        ]
    },
    "daily": [
        "smart_pos.smart_pos.api.pos_api.cleanup_old_sessions"
    ],
    "hourly": [
        "smart_pos.smart_pos.api.sync_api.sync_master_data"
    ]
}

# Installation
after_install = "smart_pos.install.after_install"

# Fixtures
fixtures = [
    {
        "dt": "Custom Field",
        "filters": [["module", "=", "Smart POS"]]
    },
    {
        "dt": "Property Setter",
        "filters": [["module", "=", "Smart POS"]]
    },
    {
        "dt": "Workspace",
        "filters": [["module", "=", "Smart POS"]]
    }
]

# PWA Settings
website_route_rules = [
    {"from_route": "/smart-pos", "to_route": "smart_pos"},
    {"from_route": "/smart-pos/<path:app_path>", "to_route": "smart_pos"},
]

# Jinja
jinja = {
    "methods": [
        "smart_pos.smart_pos.utils.jinja_methods"
    ]
}
