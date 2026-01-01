# Smart POS - Reports API
# Copyright (c) 2026, Ahmad
# License: MIT

"""
Enhanced Reports and Analytics API for Smart POS
Provides detailed session reports, sales analytics, and dashboard data
"""

import frappe
from frappe import _
from frappe.utils import now_datetime, flt, cint, getdate, add_days, nowdate
import json
from datetime import datetime, timedelta


@frappe.whitelist()
def get_session_detailed_report(session_id):
    """Get comprehensive session report with all details"""
    session = frappe.get_doc("POS Session", session_id)
    
    # Get all invoices for session
    invoices = frappe.get_all(
        "POS Invoice",
        filters={"pos_session": session_id},
        fields=["name", "customer", "grand_total", "is_return", "posting_date", 
                "posting_time", "docstatus", "status"]
    )
    
    # Get payment breakdown
    payment_breakdown = frappe.db.sql("""
        SELECT 
            sip.mode_of_payment,
            COUNT(DISTINCT pi.name) as transaction_count,
            SUM(sip.amount) as total_amount
        FROM `tabSales Invoice Payment` sip
        JOIN `tabPOS Invoice` pi ON pi.name = sip.parent
        WHERE pi.pos_session = %s AND pi.docstatus = 1
        GROUP BY sip.mode_of_payment
        ORDER BY total_amount DESC
    """, session_id, as_dict=True)
    
    # Get hourly sales breakdown
    hourly_sales = frappe.db.sql("""
        SELECT 
            HOUR(posting_time) as hour,
            COUNT(*) as count,
            SUM(grand_total) as total
        FROM `tabPOS Invoice`
        WHERE pos_session = %s AND docstatus = 1
        GROUP BY HOUR(posting_time)
        ORDER BY hour
    """, session_id, as_dict=True)
    
    # Get top selling items
    top_items = frappe.db.sql("""
        SELECT 
            item.item_code,
            item.item_name,
            SUM(item.qty) as total_qty,
            SUM(item.amount) as total_amount
        FROM `tabPOS Invoice Item` item
        JOIN `tabPOS Invoice` pi ON pi.name = item.parent
        WHERE pi.pos_session = %s AND pi.docstatus = 1
        GROUP BY item.item_code, item.item_name
        ORDER BY total_qty DESC
        LIMIT 10
    """, session_id, as_dict=True)
    
    # Get item group breakdown
    group_sales = frappe.db.sql("""
        SELECT 
            i.item_group,
            SUM(item.qty) as total_qty,
            SUM(item.amount) as total_amount
        FROM `tabPOS Invoice Item` item
        JOIN `tabPOS Invoice` pi ON pi.name = item.parent
        JOIN `tabItem` i ON i.name = item.item_code
        WHERE pi.pos_session = %s AND pi.docstatus = 1
        GROUP BY i.item_group
        ORDER BY total_amount DESC
    """, session_id, as_dict=True)
    
    # Calculate statistics
    submitted_invoices = [inv for inv in invoices if inv.docstatus == 1]
    returns = [inv for inv in submitted_invoices if inv.is_return]
    sales = [inv for inv in submitted_invoices if not inv.is_return]
    
    total_sales = sum(inv.grand_total for inv in sales)
    total_returns = sum(inv.grand_total for inv in returns)
    net_sales = total_sales - abs(total_returns)
    
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
            "cash_difference": session.cash_difference
        },
        "summary": {
            "total_invoices": len(submitted_invoices),
            "sales_count": len(sales),
            "returns_count": len(returns),
            "total_sales": total_sales,
            "total_returns": abs(total_returns),
            "net_sales": net_sales,
            "average_sale": total_sales / len(sales) if sales else 0
        },
        "payments": payment_breakdown,
        "hourly_sales": hourly_sales,
        "top_items": top_items,
        "group_sales": group_sales,
        "invoices": invoices
    }


@frappe.whitelist()
def get_daily_sales_report(date=None, pos_profile=None):
    """Get daily sales report"""
    if not date:
        date = nowdate()
    
    filters = {"posting_date": date, "docstatus": 1}
    if pos_profile:
        filters["pos_profile"] = pos_profile
    
    # Get invoices
    invoices = frappe.get_all(
        "POS Invoice",
        filters=filters,
        fields=["name", "customer", "grand_total", "is_return", "posting_time",
                "pos_profile", "user"]
    )
    
    # Get hourly breakdown
    hourly = frappe.db.sql("""
        SELECT 
            HOUR(posting_time) as hour,
            COUNT(*) as count,
            SUM(grand_total) as total
        FROM `tabPOS Invoice`
        WHERE posting_date = %s AND docstatus = 1
        GROUP BY HOUR(posting_time)
        ORDER BY hour
    """, date, as_dict=True)
    
    # Fill missing hours with zeros
    hourly_dict = {h['hour']: h for h in hourly}
    hourly_complete = []
    for h in range(24):
        if h in hourly_dict:
            hourly_complete.append(hourly_dict[h])
        else:
            hourly_complete.append({'hour': h, 'count': 0, 'total': 0})
    
    # Get payment breakdown
    payments = frappe.db.sql("""
        SELECT 
            sip.mode_of_payment,
            SUM(sip.amount) as total
        FROM `tabSales Invoice Payment` sip
        JOIN `tabPOS Invoice` pi ON pi.name = sip.parent
        WHERE pi.posting_date = %s AND pi.docstatus = 1
        GROUP BY sip.mode_of_payment
    """, date, as_dict=True)
    
    sales = [inv for inv in invoices if not inv.is_return]
    returns = [inv for inv in invoices if inv.is_return]
    
    return {
        "date": date,
        "summary": {
            "total_invoices": len(invoices),
            "total_sales": sum(inv.grand_total for inv in sales),
            "total_returns": abs(sum(inv.grand_total for inv in returns)),
            "net_sales": sum(inv.grand_total for inv in sales) - abs(sum(inv.grand_total for inv in returns))
        },
        "hourly": hourly_complete,
        "payments": payments,
        "invoices": invoices
    }


@frappe.whitelist()
def get_sales_trend(days=7, pos_profile=None):
    """Get sales trend for last N days"""
    end_date = getdate(nowdate())
    start_date = add_days(end_date, -days + 1)
    
    filters = {
        "posting_date": ["between", [start_date, end_date]],
        "docstatus": 1
    }
    if pos_profile:
        filters["pos_profile"] = pos_profile
    
    daily_sales = frappe.db.sql("""
        SELECT 
            posting_date as date,
            COUNT(*) as invoice_count,
            SUM(CASE WHEN is_return = 0 THEN grand_total ELSE 0 END) as sales,
            SUM(CASE WHEN is_return = 1 THEN ABS(grand_total) ELSE 0 END) as returns
        FROM `tabPOS Invoice`
        WHERE posting_date BETWEEN %s AND %s AND docstatus = 1
        {profile_filter}
        GROUP BY posting_date
        ORDER BY posting_date
    """.format(
        profile_filter=f"AND pos_profile = '{pos_profile}'" if pos_profile else ""
    ), (start_date, end_date), as_dict=True)
    
    # Fill missing dates
    daily_dict = {str(d['date']): d for d in daily_sales}
    complete_data = []
    
    current_date = start_date
    while current_date <= end_date:
        date_str = str(current_date)
        if date_str in daily_dict:
            complete_data.append(daily_dict[date_str])
        else:
            complete_data.append({
                'date': current_date,
                'invoice_count': 0,
                'sales': 0,
                'returns': 0
            })
        current_date = add_days(current_date, 1)
    
    total_sales = sum(d['sales'] for d in complete_data)
    total_invoices = sum(d['invoice_count'] for d in complete_data)
    
    return {
        "period": {"start": str(start_date), "end": str(end_date), "days": days},
        "totals": {
            "sales": total_sales,
            "invoices": total_invoices,
            "average_daily": total_sales / days if days > 0 else 0
        },
        "data": complete_data
    }


@frappe.whitelist()
def get_top_products(days=30, limit=20, pos_profile=None):
    """Get top selling products"""
    end_date = nowdate()
    start_date = add_days(getdate(end_date), -days)
    
    profile_filter = f"AND pi.pos_profile = '{pos_profile}'" if pos_profile else ""
    
    products = frappe.db.sql("""
        SELECT 
            item.item_code,
            item.item_name,
            SUM(item.qty) as total_qty,
            SUM(item.amount) as total_amount,
            COUNT(DISTINCT pi.name) as transaction_count
        FROM `tabPOS Invoice Item` item
        JOIN `tabPOS Invoice` pi ON pi.name = item.parent
        WHERE pi.posting_date BETWEEN %s AND %s 
            AND pi.docstatus = 1 
            AND pi.is_return = 0
            {profile_filter}
        GROUP BY item.item_code, item.item_name
        ORDER BY total_qty DESC
        LIMIT %s
    """.format(profile_filter=profile_filter), (start_date, end_date, limit), as_dict=True)
    
    return {
        "period": {"start": str(start_date), "end": str(end_date)},
        "products": products
    }


@frappe.whitelist()
def get_customer_analytics(days=30, limit=20, pos_profile=None):
    """Get customer analytics"""
    end_date = nowdate()
    start_date = add_days(getdate(end_date), -days)
    
    profile_filter = f"AND pos_profile = '{pos_profile}'" if pos_profile else ""
    
    # Top customers
    top_customers = frappe.db.sql("""
        SELECT 
            customer,
            customer_name,
            COUNT(*) as visit_count,
            SUM(grand_total) as total_spent,
            AVG(grand_total) as avg_basket
        FROM `tabPOS Invoice`
        WHERE posting_date BETWEEN %s AND %s 
            AND docstatus = 1 
            AND is_return = 0
            {profile_filter}
        GROUP BY customer, customer_name
        ORDER BY total_spent DESC
        LIMIT %s
    """.format(profile_filter=profile_filter), (start_date, end_date, limit), as_dict=True)
    
    # New vs returning customers
    customer_stats = frappe.db.sql("""
        SELECT 
            COUNT(DISTINCT customer) as unique_customers,
            COUNT(*) as total_transactions
        FROM `tabPOS Invoice`
        WHERE posting_date BETWEEN %s AND %s 
            AND docstatus = 1
            {profile_filter}
    """.format(profile_filter=profile_filter), (start_date, end_date), as_dict=True)[0]
    
    return {
        "period": {"start": str(start_date), "end": str(end_date)},
        "summary": customer_stats,
        "top_customers": top_customers
    }


@frappe.whitelist()
def get_dashboard_stats(pos_profile=None):
    """Get dashboard statistics for manager view"""
    today = nowdate()
    yesterday = add_days(getdate(today), -1)
    week_start = add_days(getdate(today), -7)
    month_start = add_days(getdate(today), -30)
    
    profile_filter = f"AND pos_profile = '{pos_profile}'" if pos_profile else ""
    
    # Today's stats
    today_stats = frappe.db.sql("""
        SELECT 
            COUNT(*) as invoices,
            COALESCE(SUM(CASE WHEN is_return = 0 THEN grand_total ELSE 0 END), 0) as sales,
            COALESCE(SUM(CASE WHEN is_return = 1 THEN ABS(grand_total) ELSE 0 END), 0) as returns
        FROM `tabPOS Invoice`
        WHERE posting_date = %s AND docstatus = 1 {profile_filter}
    """.format(profile_filter=profile_filter), today, as_dict=True)[0]
    
    # Yesterday's stats for comparison
    yesterday_stats = frappe.db.sql("""
        SELECT 
            COALESCE(SUM(CASE WHEN is_return = 0 THEN grand_total ELSE 0 END), 0) as sales
        FROM `tabPOS Invoice`
        WHERE posting_date = %s AND docstatus = 1 {profile_filter}
    """.format(profile_filter=profile_filter), yesterday, as_dict=True)[0]
    
    # Week stats
    week_stats = frappe.db.sql("""
        SELECT 
            COUNT(*) as invoices,
            COALESCE(SUM(CASE WHEN is_return = 0 THEN grand_total ELSE 0 END), 0) as sales
        FROM `tabPOS Invoice`
        WHERE posting_date BETWEEN %s AND %s AND docstatus = 1 {profile_filter}
    """.format(profile_filter=profile_filter), (week_start, today), as_dict=True)[0]
    
    # Month stats
    month_stats = frappe.db.sql("""
        SELECT 
            COUNT(*) as invoices,
            COALESCE(SUM(CASE WHEN is_return = 0 THEN grand_total ELSE 0 END), 0) as sales
        FROM `tabPOS Invoice`
        WHERE posting_date BETWEEN %s AND %s AND docstatus = 1 {profile_filter}
    """.format(profile_filter=profile_filter), (month_start, today), as_dict=True)[0]
    
    # Active sessions
    active_sessions = frappe.db.count("POS Session", {"status": "Open"})
    
    # Pending sync count
    pending_sync = frappe.db.count("POS Invoice", {
        "docstatus": 1,
        "custom_zatca_status": ["in", ["", "Not Submitted", None]]
    })
    
    # Calculate growth
    today_sales = flt(today_stats.get('sales', 0))
    yesterday_sales = flt(yesterday_stats.get('sales', 0))
    growth = ((today_sales - yesterday_sales) / yesterday_sales * 100) if yesterday_sales > 0 else 0
    
    return {
        "today": {
            "sales": today_sales,
            "invoices": today_stats.get('invoices', 0),
            "returns": today_stats.get('returns', 0),
            "net": today_sales - flt(today_stats.get('returns', 0)),
            "growth": round(growth, 1)
        },
        "week": {
            "sales": week_stats.get('sales', 0),
            "invoices": week_stats.get('invoices', 0)
        },
        "month": {
            "sales": month_stats.get('sales', 0),
            "invoices": month_stats.get('invoices', 0)
        },
        "active_sessions": active_sessions,
        "pending_zatca": pending_sync
    }


@frappe.whitelist()
def get_cashier_performance(days=30, pos_profile=None):
    """Get cashier performance report"""
    end_date = nowdate()
    start_date = add_days(getdate(end_date), -days)
    
    profile_filter = f"AND pos_profile = '{pos_profile}'" if pos_profile else ""
    
    performance = frappe.db.sql("""
        SELECT 
            owner as cashier,
            COUNT(*) as transaction_count,
            SUM(CASE WHEN is_return = 0 THEN grand_total ELSE 0 END) as total_sales,
            SUM(CASE WHEN is_return = 1 THEN 1 ELSE 0 END) as return_count,
            AVG(CASE WHEN is_return = 0 THEN grand_total ELSE NULL END) as avg_transaction
        FROM `tabPOS Invoice`
        WHERE posting_date BETWEEN %s AND %s 
            AND docstatus = 1
            {profile_filter}
        GROUP BY owner
        ORDER BY total_sales DESC
    """.format(profile_filter=profile_filter), (start_date, end_date), as_dict=True)
    
    # Get user full names
    for p in performance:
        p['cashier_name'] = frappe.db.get_value("User", p['cashier'], "full_name") or p['cashier']
    
    return {
        "period": {"start": str(start_date), "end": str(end_date)},
        "performance": performance
    }
