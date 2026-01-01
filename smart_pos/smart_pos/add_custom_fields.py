import frappe

def execute():
    # Add pos_session field to POS Invoice
    if not frappe.db.exists('Custom Field', 'POS Invoice-pos_session'):
        cf = frappe.get_doc({
            'doctype': 'Custom Field',
            'name': 'POS Invoice-pos_session',
            'dt': 'POS Invoice',
            'fieldname': 'pos_session',
            'fieldtype': 'Link',
            'label': 'POS Session',
            'options': 'POS Session',
            'insert_after': 'pos_profile',
            'module': 'Smart POS',
            'in_standard_filter': 1
        })
        cf.insert(ignore_permissions=True)
        print('Created pos_session custom field')
    else:
        print('pos_session field already exists')

    # Add is_offline field
    if not frappe.db.exists('Custom Field', 'POS Invoice-is_offline'):
        cf = frappe.get_doc({
            'doctype': 'Custom Field',
            'name': 'POS Invoice-is_offline',
            'dt': 'POS Invoice',
            'fieldname': 'is_offline',
            'fieldtype': 'Check',
            'label': 'Created Offline',
            'insert_after': 'pos_session',
            'module': 'Smart POS',
            'default': '0',
            'read_only': 1
        })
        cf.insert(ignore_permissions=True)
        print('Created is_offline custom field')

    # Add offline_invoice_id field
    if not frappe.db.exists('Custom Field', 'POS Invoice-offline_invoice_id'):
        cf = frappe.get_doc({
            'doctype': 'Custom Field',
            'name': 'POS Invoice-offline_invoice_id',
            'dt': 'POS Invoice',
            'fieldname': 'offline_invoice_id',
            'fieldtype': 'Data',
            'label': 'Offline Invoice ID',
            'insert_after': 'is_offline',
            'module': 'Smart POS',
            'read_only': 1,
            'hidden': 1
        })
        cf.insert(ignore_permissions=True)
        print('Created offline_invoice_id custom field')

    frappe.db.commit()
