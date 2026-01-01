# Copyright (c) 2026, Ahmad and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import now_datetime


class TestPOSSession(FrappeTestCase):
    """Test cases for POS Session DocType"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test data"""
        super().setUpClass()
        cls.test_user = frappe.session.user
        cls.test_profile = cls.get_or_create_pos_profile()
    
    @classmethod
    def get_or_create_pos_profile(cls):
        """Get or create a test POS Profile"""
        if frappe.db.exists("POS Profile", "Test POS Profile"):
            return "Test POS Profile"
        
        # Get required values
        company = frappe.db.get_single_value("Global Defaults", "default_company")
        if not company:
            company = frappe.get_all("Company", limit=1)[0].name
        
        warehouse = frappe.db.get_value("Warehouse", {"company": company, "is_group": 0})
        
        # Create test profile
        profile = frappe.get_doc({
            "doctype": "POS Profile",
            "name": "Test POS Profile",
            "company": company,
            "warehouse": warehouse,
            "currency": frappe.get_cached_value("Company", company, "default_currency")
        })
        profile.insert(ignore_permissions=True)
        return profile.name
    
    def test_create_session(self):
        """Test creating a new POS session"""
        session = frappe.get_doc({
            "doctype": "POS Session",
            "pos_profile": self.test_profile,
            "company": frappe.db.get_value("POS Profile", self.test_profile, "company"),
            "user": self.test_user,
            "opening_cash": 1000,
            "opening_time": now_datetime()
        })
        session.insert()
        
        self.assertEqual(session.status, "Open")
        self.assertEqual(session.opening_cash, 1000)
        
        # Clean up
        session.delete()
    
    def test_no_duplicate_open_sessions(self):
        """Test that user cannot have multiple open sessions"""
        # Create first session
        session1 = frappe.get_doc({
            "doctype": "POS Session",
            "pos_profile": self.test_profile,
            "company": frappe.db.get_value("POS Profile", self.test_profile, "company"),
            "user": self.test_user,
            "opening_cash": 1000,
            "opening_time": now_datetime()
        })
        session1.insert()
        
        # Try to create second session - should fail
        session2 = frappe.get_doc({
            "doctype": "POS Session",
            "pos_profile": self.test_profile,
            "company": frappe.db.get_value("POS Profile", self.test_profile, "company"),
            "user": self.test_user,
            "opening_cash": 500,
            "opening_time": now_datetime()
        })
        
        with self.assertRaises(frappe.ValidationError):
            session2.insert()
        
        # Clean up
        session1.delete()
    
    def test_close_session(self):
        """Test closing a POS session"""
        session = frappe.get_doc({
            "doctype": "POS Session",
            "pos_profile": self.test_profile,
            "company": frappe.db.get_value("POS Profile", self.test_profile, "company"),
            "user": self.test_user,
            "opening_cash": 1000,
            "opening_time": now_datetime()
        })
        session.insert()
        
        # Close session
        session.close_session(actual_cash=1200, closing_notes="Test close")
        
        self.assertEqual(session.status, "Closed")
        self.assertIsNotNone(session.closing_time)
        self.assertEqual(session.actual_cash, 1200)
        
        # Clean up
        session.delete()
