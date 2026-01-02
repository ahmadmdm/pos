// Copyright (c) 2026, Smart POS and contributors
// For license information, please see license.txt

frappe.ui.form.on('POS User Settings', {
    setup: function(frm) {
        // Set up filters based on company
        frm.set_query('cost_center', function() {
            return {
                filters: {
                    'company': frm.doc.company,
                    'is_group': 0
                }
            };
        });

        frm.set_query('income_account', function() {
            return {
                filters: {
                    'company': frm.doc.company,
                    'is_group': 0,
                    'root_type': 'Income'
                }
            };
        });

        frm.set_query('expense_account', function() {
            return {
                filters: {
                    'company': frm.doc.company,
                    'is_group': 0,
                    'root_type': 'Expense'
                }
            };
        });

        frm.set_query('warehouse', function() {
            return {
                filters: {
                    'company': frm.doc.company,
                    'is_group': 0
                }
            };
        });

        frm.set_query('pos_profile', function() {
            return {
                filters: {
                    'company': frm.doc.company,
                    'disabled': 0
                }
            };
        });

        // Filter payment methods
        frm.set_query('mode_of_payment', 'payment_methods', function() {
            return {
                filters: {}
            };
        });
    },

    refresh: function(frm) {
        // Show status HTML
        frm.trigger('render_status');
        
        // Add action buttons
        if (!frm.is_new() && frm.doc.company && frm.doc.pos_profile) {
            // Validate Configuration button
            frm.add_custom_button(__('Validate Configuration'), function() {
                frm.trigger('validate_configuration');
            }, __('Actions'));

            // Create Opening Entry button
            if (frm.doc.pos_opening_status !== '✓ Open') {
                frm.add_custom_button(__('Create POS Opening Entry'), function() {
                    frm.trigger('create_opening_entry');
                }, __('Actions'));
            } else {
                frm.add_custom_button(__('Close POS Opening Entry'), function() {
                    frm.trigger('close_opening_entry');
                }, __('Actions'));
            }

            // Copy from POS Profile button
            frm.add_custom_button(__('Copy from POS Profile'), function() {
                frm.trigger('copy_from_profile');
            }, __('Actions'));

            // Load Payment Methods button
            frm.add_custom_button(__('Load Payment Methods'), function() {
                frm.trigger('load_payment_methods');
            }, __('Actions'));
        }

        // Show intro message for new forms
        if (frm.is_new()) {
            frm.set_intro(__('Configure all POS settings for this user. Fill all required fields to ensure POS works correctly.'), 'blue');
        }
    },

    company: function(frm) {
        if (frm.doc.company) {
            // Clear dependent fields
            frm.set_value('cost_center', '');
            frm.set_value('income_account', '');
            frm.set_value('expense_account', '');
            frm.set_value('warehouse', '');
            frm.set_value('pos_profile', '');
            frm.set_value('payment_methods', []);

            // Fetch defaults from company
            frappe.call({
                method: 'smart_pos.smart_pos.doctype.pos_user_settings.pos_user_settings.get_company_defaults',
                args: { company: frm.doc.company },
                callback: function(r) {
                    if (r.message) {
                        const defaults = r.message;
                        
                        if (defaults.cost_center) {
                            frm.set_value('cost_center', defaults.cost_center);
                        }
                        if (defaults.default_income_account) {
                            frm.set_value('income_account', defaults.default_income_account);
                        }
                        if (defaults.default_expense_account) {
                            frm.set_value('expense_account', defaults.default_expense_account);
                        }
                        if (defaults.warehouse) {
                            frm.set_value('warehouse', defaults.warehouse);
                        }
                        
                        // Auto-select first POS Profile
                        if (defaults.pos_profiles && defaults.pos_profiles.length > 0) {
                            frm.set_value('pos_profile', defaults.pos_profiles[0].name);
                            
                            // Set customer from profile if available
                            if (defaults.pos_profiles[0].customer) {
                                frm.set_value('default_customer', defaults.pos_profiles[0].customer);
                            }
                        }

                        frappe.show_alert({
                            message: __('Default values loaded from company'),
                            indicator: 'green'
                        });
                    }
                }
            });
        }
    },

    pos_profile: function(frm) {
        if (frm.doc.pos_profile) {
            // Check opening entry status
            frm.trigger('check_opening_entry');
            
            // Load customer from profile if not set
            if (!frm.doc.default_customer) {
                frappe.db.get_value('POS Profile', frm.doc.pos_profile, 'customer', function(r) {
                    if (r && r.customer) {
                        frm.set_value('default_customer', r.customer);
                    }
                });
            }
        }
    },

    render_status: function(frm) {
        if (frm.is_new()) {
            frm.fields_dict.status_html.$wrapper.html(`
                <div class="alert alert-info">
                    <h5><i class="fa fa-info-circle"></i> ${__('New Configuration')}</h5>
                    <p>${__('Fill all required fields and save to validate the configuration.')}</p>
                </div>
            `);
            return;
        }

        // Validate and show status
        frappe.call({
            method: 'smart_pos.smart_pos.doctype.pos_user_settings.pos_user_settings.validate_pos_configuration',
            args: { user: frm.doc.user },
            callback: function(r) {
                if (r.message) {
                    frm.trigger('render_validation_result', r.message);
                }
            }
        });
    },

    render_validation_result: function(frm, result) {
        let html = '';
        
        if (result.valid) {
            html = `
                <div class="alert alert-success">
                    <h5><i class="fa fa-check-circle"></i> ${__('Configuration Valid')}</h5>
                    <p>${__('All settings are correctly configured. POS is ready to use.')}</p>
                </div>
            `;
        } else {
            html = `<div class="alert alert-danger">
                <h5><i class="fa fa-exclamation-triangle"></i> ${__('Configuration Issues')}</h5>
                <ul class="mb-0">`;
            
            for (const issue of result.issues) {
                html += `<li><strong>${issue.message}</strong><br><small class="text-muted">${issue.solution}</small></li>`;
            }
            html += '</ul></div>';
        }

        // Warnings
        if (result.warnings && result.warnings.length > 0) {
            html += `<div class="alert alert-warning">
                <h5><i class="fa fa-warning"></i> ${__('Warnings')}</h5>
                <ul class="mb-0">`;
            for (const warning of result.warnings) {
                html += `<li>${warning.message}<br><small class="text-muted">${warning.solution}</small></li>`;
            }
            html += '</ul></div>';
        }

        // Success info
        if (result.info && result.info.length > 0) {
            html += `<div class="alert alert-info">
                <ul class="mb-0">`;
            for (const info of result.info) {
                html += `<li><i class="fa fa-check text-success"></i> ${info.message}</li>`;
            }
            html += '</ul></div>';
        }

        frm.fields_dict.status_html.$wrapper.html(html);

        // Also update validation_status HTML
        let validationHtml = '';
        if (result.valid) {
            validationHtml = `<div class="text-success"><i class="fa fa-check-circle fa-2x"></i><br>${__('Ready')}</div>`;
        } else {
            validationHtml = `<div class="text-danger"><i class="fa fa-times-circle fa-2x"></i><br>${__('Issues Found')}: ${result.issues.length}</div>`;
        }
        frm.fields_dict.validation_status.$wrapper.html(validationHtml);
    },

    validate_configuration: function(frm) {
        frappe.call({
            method: 'smart_pos.smart_pos.doctype.pos_user_settings.pos_user_settings.validate_pos_configuration',
            args: { user: frm.doc.user },
            callback: function(r) {
                if (r.message) {
                    frm.trigger('render_validation_result', r.message);
                    
                    if (r.message.valid) {
                        frappe.msgprint({
                            title: __('Validation Successful'),
                            message: __('All POS settings are correctly configured!'),
                            indicator: 'green'
                        });
                    } else {
                        frappe.msgprint({
                            title: __('Validation Failed'),
                            message: __('Please fix the issues listed above.'),
                            indicator: 'red'
                        });
                    }
                }
            }
        });
    },

    check_opening_entry: function(frm) {
        if (!frm.doc.pos_profile) return;
        
        frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'POS Opening Entry',
                filters: {
                    pos_profile: frm.doc.pos_profile,
                    status: 'Open',
                    docstatus: 1
                },
                fieldname: ['name', 'status']
            },
            callback: function(r) {
                if (r.message && r.message.name) {
                    frm.set_value('pos_opening_entry', r.message.name);
                    frm.set_value('pos_opening_status', '✓ Open');
                } else {
                    frm.set_value('pos_opening_entry', '');
                    frm.set_value('pos_opening_status', '✗ No Open Entry');
                }
            }
        });
    },

    create_opening_entry: function(frm) {
        frappe.confirm(
            __('Create a new POS Opening Entry for profile {0}?', [frm.doc.pos_profile]),
            function() {
                frappe.call({
                    method: 'smart_pos.smart_pos.doctype.pos_user_settings.pos_user_settings.create_pos_opening_entry',
                    args: {
                        pos_profile: frm.doc.pos_profile,
                        company: frm.doc.company,
                        opening_amount: frm.doc.default_opening_amount || 0
                    },
                    callback: function(r) {
                        if (r.message) {
                            if (r.message.status === 'success') {
                                frappe.show_alert({
                                    message: r.message.message,
                                    indicator: 'green'
                                });
                                frm.reload_doc();
                            } else if (r.message.status === 'exists') {
                                frappe.show_alert({
                                    message: r.message.message,
                                    indicator: 'blue'
                                });
                                frm.reload_doc();
                            } else {
                                frappe.msgprint({
                                    title: __('Error'),
                                    message: r.message.message,
                                    indicator: 'red'
                                });
                            }
                        }
                    }
                });
            }
        );
    },

    close_opening_entry: function(frm) {
        frappe.confirm(
            __('Close the current POS Opening Entry for profile {0}?', [frm.doc.pos_profile]),
            function() {
                frappe.call({
                    method: 'smart_pos.smart_pos.doctype.pos_user_settings.pos_user_settings.close_pos_opening_entry',
                    args: {
                        pos_profile: frm.doc.pos_profile
                    },
                    callback: function(r) {
                        if (r.message) {
                            if (r.message.status === 'success') {
                                frappe.show_alert({
                                    message: r.message.message,
                                    indicator: 'green'
                                });
                                frm.reload_doc();
                            } else {
                                frappe.msgprint({
                                    title: __('Error'),
                                    message: r.message.message,
                                    indicator: 'red'
                                });
                            }
                        }
                    }
                });
            }
        );
    },

    copy_from_profile: function(frm) {
        if (!frm.doc.pos_profile) {
            frappe.msgprint(__('Please select a POS Profile first'));
            return;
        }

        frappe.db.get_doc('POS Profile', frm.doc.pos_profile).then(profile => {
            if (profile.company && profile.company !== frm.doc.company) {
                frappe.confirm(
                    __('POS Profile uses different company ({0}). Update company?', [profile.company]),
                    function() {
                        frm.set_value('company', profile.company);
                        apply_profile_settings(frm, profile);
                    }
                );
            } else {
                apply_profile_settings(frm, profile);
            }
        });

        function apply_profile_settings(frm, profile) {
            if (profile.cost_center) frm.set_value('cost_center', profile.cost_center);
            if (profile.income_account) frm.set_value('income_account', profile.income_account);
            if (profile.expense_account) frm.set_value('expense_account', profile.expense_account);
            if (profile.warehouse) frm.set_value('warehouse', profile.warehouse);
            if (profile.customer) frm.set_value('default_customer', profile.customer);
            
            frappe.show_alert({
                message: __('Settings copied from POS Profile'),
                indicator: 'green'
            });
        }
    },

    load_payment_methods: function(frm) {
        if (!frm.doc.pos_profile || !frm.doc.company) {
            frappe.msgprint(__('Please select Company and POS Profile first'));
            return;
        }

        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'POS Profile',
                name: frm.doc.pos_profile
            },
            callback: function(r) {
                if (r.message && r.message.payments) {
                    frm.clear_table('payment_methods');
                    
                    for (const pm of r.message.payments) {
                        // Check if account exists
                        frappe.call({
                            method: 'frappe.client.get_value',
                            args: {
                                doctype: 'Mode of Payment Account',
                                filters: {
                                    parent: pm.mode_of_payment,
                                    company: frm.doc.company
                                },
                                fieldname: 'default_account'
                            },
                            async: false,
                            callback: function(acc) {
                                const row = frm.add_child('payment_methods');
                                row.mode_of_payment = pm.mode_of_payment;
                                row.default = pm.default || 0;
                                
                                if (acc.message && acc.message.default_account) {
                                    row.account = acc.message.default_account;
                                    row.account_status = '✓ OK';
                                } else {
                                    row.account = '';
                                    row.account_status = '✗ Missing Account';
                                }
                            }
                        });
                    }
                    
                    frm.refresh_field('payment_methods');
                    frappe.show_alert({
                        message: __('Payment methods loaded from POS Profile'),
                        indicator: 'green'
                    });
                }
            }
        });
    }
});

// Child table events
frappe.ui.form.on('POS User Payment Method', {
    mode_of_payment: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        
        if (row.mode_of_payment && frm.doc.company) {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Mode of Payment Account',
                    filters: {
                        parent: row.mode_of_payment,
                        company: frm.doc.company
                    },
                    fieldname: 'default_account'
                },
                callback: function(r) {
                    if (r.message && r.message.default_account) {
                        frappe.model.set_value(cdt, cdn, 'account', r.message.default_account);
                        frappe.model.set_value(cdt, cdn, 'account_status', '✓ OK');
                    } else {
                        frappe.model.set_value(cdt, cdn, 'account', '');
                        frappe.model.set_value(cdt, cdn, 'account_status', '✗ Missing Account');
                        
                        // Offer to set up account
                        frappe.confirm(
                            __('No account configured for {0} in company {1}. Set up now?', 
                               [row.mode_of_payment, frm.doc.company]),
                            function() {
                                setup_payment_account(frm, row.mode_of_payment);
                            }
                        );
                    }
                }
            });
        }
    }
});

function setup_payment_account(frm, mode_of_payment) {
    frappe.prompt([
        {
            fieldname: 'account',
            fieldtype: 'Link',
            label: __('Account'),
            options: 'Account',
            reqd: 1,
            get_query: function() {
                return {
                    filters: {
                        company: frm.doc.company,
                        is_group: 0,
                        account_type: ['in', ['Cash', 'Bank']]
                    }
                };
            }
        }
    ], function(values) {
        frappe.call({
            method: 'smart_pos.smart_pos.doctype.pos_user_settings.pos_user_settings.setup_payment_method_account',
            args: {
                mode_of_payment: mode_of_payment,
                company: frm.doc.company,
                account: values.account
            },
            callback: function(r) {
                if (r.message) {
                    frappe.show_alert({
                        message: r.message.message,
                        indicator: 'green'
                    });
                    frm.reload_doc();
                }
            }
        });
    }, __('Setup Payment Account for {0}', [mode_of_payment]), __('Save'));
}
