# Copyright (c) 2026, Ahmad
# License: MIT

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import nowdate, now_datetime, flt


class POSUserSettings(Document):
    def validate(self):
        self.validate_company_links()
        self.validate_pos_profile()
        self.validate_payment_methods()
        self.update_opening_entry_status()
    
    def validate_company_links(self):
        """Ensure all linked fields belong to the selected company"""
        if not self.company:
            return
            
        # Validate Cost Center
        if self.cost_center:
            cc_company = frappe.db.get_value("Cost Center", self.cost_center, "company")
            if cc_company != self.company:
                frappe.throw(
                    _("Cost Center {0} does not belong to Company {1}").format(
                        frappe.bold(self.cost_center), frappe.bold(self.company)
                    )
                )
        
        # Validate Income Account
        if self.income_account:
            acc_company = frappe.db.get_value("Account", self.income_account, "company")
            if acc_company != self.company:
                frappe.throw(
                    _("Income Account {0} does not belong to Company {1}").format(
                        frappe.bold(self.income_account), frappe.bold(self.company)
                    )
                )
        
        # Validate Expense Account
        if self.expense_account:
            acc_company = frappe.db.get_value("Account", self.expense_account, "company")
            if acc_company != self.company:
                frappe.throw(
                    _("Expense Account {0} does not belong to Company {1}").format(
                        frappe.bold(self.expense_account), frappe.bold(self.company)
                    )
                )
        
        # Validate Warehouse
        if self.warehouse:
            wh_company = frappe.db.get_value("Warehouse", self.warehouse, "company")
            if wh_company and wh_company != self.company:
                frappe.throw(
                    _("Warehouse {0} does not belong to Company {1}").format(
                        frappe.bold(self.warehouse), frappe.bold(self.company)
                    )
                )
    
    def validate_pos_profile(self):
        """Ensure POS Profile belongs to company and is not disabled"""
        if self.pos_profile and self.company:
            profile = frappe.db.get_value(
                "POS Profile", 
                self.pos_profile, 
                ["company", "disabled"],
                as_dict=True
            )
            if profile:
                if profile.company != self.company:
                    frappe.throw(
                        _("POS Profile {0} belongs to Company {1}, not {2}").format(
                            frappe.bold(self.pos_profile),
                            frappe.bold(profile.company),
                            frappe.bold(self.company)
                        )
                    )
                if profile.disabled:
                    frappe.throw(
                        _("POS Profile {0} is disabled").format(frappe.bold(self.pos_profile))
                    )
    
    def validate_payment_methods(self):
        """Validate payment methods have accounts for this company"""
        if not self.payment_methods:
            return
            
        for pm in self.payment_methods:
            # Get account for this mode of payment and company
            account = frappe.db.get_value(
                "Mode of Payment Account",
                {"parent": pm.mode_of_payment, "company": self.company},
                "default_account"
            )
            
            if account:
                pm.account = account
                pm.account_status = "✓ OK"
            else:
                pm.account = ""
                pm.account_status = "✗ Missing Account"
    
    def update_opening_entry_status(self):
        """Update POS Opening Entry status"""
        if self.pos_profile:
            # Check for open POS Opening Entry
            opening = frappe.db.get_value(
                "POS Opening Entry",
                {
                    "pos_profile": self.pos_profile,
                    "status": "Open",
                    "docstatus": 1
                },
                ["name", "status"],
                as_dict=True
            )
            
            if opening:
                self.pos_opening_entry = opening.name
                self.pos_opening_status = "✓ Open"
            else:
                self.pos_opening_entry = ""
                self.pos_opening_status = "✗ No Open Entry"
    
    def on_update(self):
        """Clear cache after update"""
        frappe.clear_cache(user=self.user)


@frappe.whitelist()
def get_user_pos_settings(user=None):
    """Get POS settings for a user"""
    if not user:
        user = frappe.session.user
    
    settings = frappe.db.get_value(
        "POS User Settings",
        {"user": user, "enabled": 1},
        ["name", "user", "company", "cost_center", "income_account", 
         "expense_account", "warehouse", "default_customer", "pos_profile",
         "auto_create_opening_entry", "default_opening_amount"],
        as_dict=True
    )
    
    return settings


@frappe.whitelist()
def validate_pos_configuration(user=None):
    """
    Comprehensive validation of POS configuration
    Returns list of issues and their solutions
    """
    if not user:
        user = frappe.session.user
    
    issues = []
    warnings = []
    info = []
    
    # Check if POS User Settings exist
    settings = frappe.db.get_value(
        "POS User Settings",
        {"user": user, "enabled": 1},
        ["name", "company", "pos_profile", "cost_center", "income_account",
         "warehouse", "default_customer"],
        as_dict=True
    )
    
    if not settings:
        issues.append({
            "type": "error",
            "message": _("No POS User Settings found for user {0}").format(user),
            "solution": _("Create POS User Settings from the form")
        })
        return {"issues": issues, "warnings": warnings, "info": info, "valid": False}
    
    company = settings.company
    pos_profile = settings.pos_profile
    
    # 1. Check Company
    if not company:
        issues.append({
            "type": "error",
            "field": "company",
            "message": _("Company is required"),
            "solution": _("Select a company in the settings")
        })
    
    # 2. Check POS Profile
    if not pos_profile:
        issues.append({
            "type": "error",
            "field": "pos_profile",
            "message": _("POS Profile is required"),
            "solution": _("Select a POS Profile in the settings")
        })
    else:
        profile = frappe.db.get_value(
            "POS Profile", pos_profile,
            ["company", "disabled", "warehouse"],
            as_dict=True
        )
        if profile:
            if profile.disabled:
                issues.append({
                    "type": "error",
                    "field": "pos_profile",
                    "message": _("POS Profile {0} is disabled").format(pos_profile),
                    "solution": _("Enable the POS Profile or select a different one")
                })
            if profile.company != company:
                issues.append({
                    "type": "error",
                    "field": "pos_profile",
                    "message": _("POS Profile company mismatch"),
                    "solution": _("POS Profile belongs to {0}, but settings use {1}").format(
                        profile.company, company)
                })
    
    # 3. Check Cost Center
    if not settings.cost_center:
        issues.append({
            "type": "error",
            "field": "cost_center",
            "message": _("Cost Center is required"),
            "solution": _("Select a Cost Center that belongs to {0}").format(company)
        })
    else:
        cc_company = frappe.db.get_value("Cost Center", settings.cost_center, "company")
        if cc_company != company:
            issues.append({
                "type": "error",
                "field": "cost_center",
                "message": _("Cost Center belongs to wrong company"),
                "solution": _("Cost Center {0} belongs to {1}, select one for {2}").format(
                    settings.cost_center, cc_company, company)
            })
    
    # 4. Check Income Account
    if not settings.income_account:
        issues.append({
            "type": "error",
            "field": "income_account",
            "message": _("Income Account is required"),
            "solution": _("Select an Income Account for {0}").format(company)
        })
    else:
        acc_company = frappe.db.get_value("Account", settings.income_account, "company")
        if acc_company != company:
            issues.append({
                "type": "error",
                "field": "income_account",
                "message": _("Income Account belongs to wrong company"),
                "solution": _("Account {0} belongs to {1}, select one for {2}").format(
                    settings.income_account, acc_company, company)
            })
    
    # 5. Check Warehouse
    if not settings.warehouse:
        issues.append({
            "type": "error",
            "field": "warehouse",
            "message": _("Warehouse is required"),
            "solution": _("Select a Warehouse for {0}").format(company)
        })
    else:
        wh_company = frappe.db.get_value("Warehouse", settings.warehouse, "company")
        if wh_company and wh_company != company:
            issues.append({
                "type": "error",
                "field": "warehouse",
                "message": _("Warehouse belongs to wrong company"),
                "solution": _("Warehouse {0} belongs to {1}, select one for {2}").format(
                    settings.warehouse, wh_company, company)
            })
    
    # 6. Check Default Customer
    if not settings.default_customer:
        warnings.append({
            "type": "warning",
            "field": "default_customer",
            "message": _("No default customer set"),
            "solution": _("Set a default customer for walk-in sales")
        })
    
    # 7. Check POS Opening Entry
    if pos_profile:
        opening = frappe.db.get_value(
            "POS Opening Entry",
            {"pos_profile": pos_profile, "status": "Open", "docstatus": 1},
            "name"
        )
        if not opening:
            issues.append({
                "type": "error",
                "field": "pos_opening_entry",
                "message": _("No open POS Opening Entry found"),
                "solution": _("Create a POS Opening Entry using the button below")
            })
        else:
            info.append({
                "type": "success",
                "message": _("POS Opening Entry: {0}").format(opening)
            })
    
    # 8. Check Payment Methods
    if pos_profile:
        payments = frappe.get_all(
            "POS Payment Method",
            filters={"parent": pos_profile},
            fields=["mode_of_payment"]
        )
        
        missing_accounts = []
        for pm in payments:
            account = frappe.db.get_value(
                "Mode of Payment Account",
                {"parent": pm.mode_of_payment, "company": company},
                "default_account"
            )
            if not account:
                missing_accounts.append(pm.mode_of_payment)
        
        if missing_accounts:
            issues.append({
                "type": "error",
                "field": "payment_methods",
                "message": _("Payment methods missing accounts: {0}").format(
                    ", ".join(missing_accounts)),
                "solution": _("Add accounts for these payment methods in Mode of Payment")
            })
    
    is_valid = len(issues) == 0
    
    return {
        "issues": issues,
        "warnings": warnings,
        "info": info,
        "valid": is_valid,
        "settings": settings
    }


@frappe.whitelist()
def create_pos_opening_entry(pos_profile, company, opening_amount=0):
    """Create POS Opening Entry for the user"""
    # Check if already exists
    existing = frappe.db.get_value(
        "POS Opening Entry",
        {"pos_profile": pos_profile, "status": "Open", "docstatus": 1},
        "name"
    )
    
    if existing:
        return {"status": "exists", "name": existing, "message": _("Opening Entry already exists")}
    
    # Get payment methods from POS Profile
    profile = frappe.get_doc("POS Profile", pos_profile)
    
    # Create opening entry
    opening = frappe.new_doc("POS Opening Entry")
    opening.pos_profile = pos_profile
    opening.company = company
    opening.user = frappe.session.user
    opening.period_start_date = now_datetime()
    opening.posting_date = nowdate()
    
    # Add payment methods with opening amounts
    for pm in profile.payments:
        # Check if account exists for this company
        account = frappe.db.get_value(
            "Mode of Payment Account",
            {"parent": pm.mode_of_payment, "company": company},
            "default_account"
        )
        
        if account:
            amount = flt(opening_amount) if pm.mode_of_payment == "Cash" else 0
            opening.append("balance_details", {
                "mode_of_payment": pm.mode_of_payment,
                "opening_amount": amount
            })
    
    # If no payment methods with accounts, add Cash if it has account
    if not opening.balance_details:
        cash_account = frappe.db.get_value(
            "Mode of Payment Account",
            {"parent": "Cash", "company": company},
            "default_account"
        )
        if cash_account:
            opening.append("balance_details", {
                "mode_of_payment": "Cash",
                "opening_amount": flt(opening_amount)
            })
        else:
            frappe.throw(_("No payment methods have accounts configured for company {0}").format(company))
    
    try:
        opening.insert()
        opening.submit()
        frappe.db.commit()
        
        return {
            "status": "success",
            "name": opening.name,
            "message": _("POS Opening Entry created successfully")
        }
    except Exception as e:
        frappe.log_error(str(e), "POS Opening Entry Creation Error")
        return {
            "status": "error",
            "message": str(e)
        }


@frappe.whitelist()
def close_pos_opening_entry(pos_profile):
    """Close the current POS Opening Entry"""
    opening = frappe.db.get_value(
        "POS Opening Entry",
        {"pos_profile": pos_profile, "status": "Open", "docstatus": 1},
        "name"
    )
    
    if not opening:
        return {"status": "error", "message": _("No open POS Opening Entry found")}
    
    # Check if there are pending invoices
    pending = frappe.db.count(
        "POS Invoice",
        {"pos_profile": pos_profile, "docstatus": 0}
    )
    
    if pending > 0:
        return {
            "status": "error",
            "message": _("There are {0} pending invoices. Please submit or cancel them first.").format(pending)
        }
    
    # Create POS Closing Entry
    try:
        closing = frappe.new_doc("POS Closing Entry")
        closing.pos_opening_entry = opening
        closing.pos_profile = pos_profile
        closing.user = frappe.session.user
        closing.period_end_date = now_datetime()
        closing.posting_date = nowdate()
        
        # Get opening entry details
        opening_doc = frappe.get_doc("POS Opening Entry", opening)
        closing.company = opening_doc.company
        
        # Copy payment details
        for detail in opening_doc.balance_details:
            closing.append("payment_reconciliation", {
                "mode_of_payment": detail.mode_of_payment,
                "opening_amount": detail.opening_amount,
                "expected_amount": detail.opening_amount,
                "closing_amount": detail.opening_amount
            })
        
        closing.insert()
        closing.submit()
        frappe.db.commit()
        
        return {
            "status": "success",
            "name": closing.name,
            "message": _("POS Closing Entry created successfully")
        }
    except Exception as e:
        frappe.log_error(str(e), "POS Closing Entry Creation Error")
        return {
            "status": "error",
            "message": str(e)
        }


@frappe.whitelist()
def setup_payment_method_account(mode_of_payment, company, account):
    """Add account to a mode of payment for a company"""
    mode = frappe.get_doc("Mode of Payment", mode_of_payment)
    
    # Check if already exists
    for acc in mode.accounts:
        if acc.company == company:
            acc.default_account = account
            mode.save()
            frappe.db.commit()
            return {"status": "updated", "message": _("Account updated")}
    
    # Add new
    mode.append("accounts", {
        "company": company,
        "default_account": account
    })
    mode.save()
    frappe.db.commit()
    
    return {"status": "created", "message": _("Account added")}


@frappe.whitelist()
def get_company_defaults(company):
    """Get default values for a company"""
    company_doc = frappe.get_doc("Company", company)
    
    # Get default cost center
    cost_center = company_doc.cost_center
    if not cost_center:
        cost_center = frappe.db.get_value(
            "Cost Center",
            {"company": company, "is_group": 0},
            "name"
        )
    
    # Get default warehouse
    warehouse = frappe.db.get_value(
        "Warehouse",
        {"company": company, "is_group": 0},
        "name"
    )
    
    # Get POS Profiles for company
    pos_profiles = frappe.get_all(
        "POS Profile",
        filters={"company": company, "disabled": 0},
        fields=["name", "warehouse", "customer"]
    )
    
    # Get payment methods with accounts for this company
    payment_methods = frappe.db.sql("""
        SELECT mpa.parent as mode_of_payment, mpa.default_account
        FROM `tabMode of Payment Account` mpa
        WHERE mpa.company = %s
    """, company, as_dict=True)
    
    return {
        "cost_center": cost_center,
        "default_income_account": company_doc.default_income_account,
        "default_expense_account": company_doc.default_expense_account,
        "warehouse": warehouse,
        "pos_profiles": pos_profiles,
        "payment_methods": payment_methods
    }


@frappe.whitelist()
def create_user_settings(user, company, cost_center, income_account=None, 
                         expense_account=None, warehouse=None, default_customer=None,
                         pos_profile=None, notes=None):
    """Create or update POS settings for a user"""
    
    # Check permissions
    user_roles = frappe.get_roles()
    if not any(role in user_roles for role in ["System Manager", "Accounts Manager", "Accounts User"]):
        frappe.throw(_("You don't have permission to create POS User Settings"))
    
    # Check if settings already exist
    existing = frappe.db.exists("POS User Settings", {"user": user})
    
    if existing:
        doc = frappe.get_doc("POS User Settings", existing)
        doc.company = company
        doc.cost_center = cost_center
        doc.income_account = income_account
        doc.expense_account = expense_account
        doc.warehouse = warehouse
        doc.default_customer = default_customer
        doc.pos_profile = pos_profile
        doc.notes = notes
        doc.enabled = 1
        doc.save()
    else:
        doc = frappe.new_doc("POS User Settings")
        doc.user = user
        doc.company = company
        doc.cost_center = cost_center
        doc.income_account = income_account
        doc.expense_account = expense_account
        doc.warehouse = warehouse
        doc.default_customer = default_customer
        doc.pos_profile = pos_profile
        doc.notes = notes
        doc.enabled = 1
        doc.insert()
    
    frappe.db.commit()
    return doc.as_dict()


@frappe.whitelist()
def get_pos_users_list():
    """Get list of users with POS access"""
    users = frappe.get_all(
        "Has Role",
        filters={"role": ["in", ["POS User", "Sales User", "Sales Manager"]]},
        fields=["parent"],
        distinct=True
    )
    
    user_list = []
    for u in users:
        user_doc = frappe.db.get_value(
            "User", 
            u.parent, 
            ["name", "full_name", "email", "enabled"],
            as_dict=True
        )
        if user_doc and user_doc.enabled:
            has_settings = frappe.db.exists("POS User Settings", {"user": u.parent})
            user_doc["has_pos_settings"] = bool(has_settings)
            user_list.append(user_doc)
    
    return user_list
