/**
 * Smart POS - Manager Dashboard
 * Copyright (c) 2026, Ahmad
 * Real-time POS management and analytics dashboard
 */

frappe.pages['pos-manager'].on_page_load = function(wrapper) {
    new POSManagerDashboard(wrapper);
};

class POSManagerDashboard {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: __('POS Manager Dashboard'),
            single_column: true
        });
        
        this.page.set_primary_action(__('Open POS'), () => {
            frappe.set_route('pos-terminal');
        }, 'fa fa-cash-register');
        
        this.page.set_secondary_action(__('Refresh'), () => {
            this.loadDashboard();
        }, 'fa fa-sync');
        
        this.setupFilters();
        this.render();
        this.loadDashboard();
        
        // Auto-refresh every 60 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboard();
        }, 60000);
    }
    
    setupFilters() {
        this.posProfileFilter = this.page.add_field({
            fieldname: 'pos_profile',
            label: __('POS Profile'),
            fieldtype: 'Link',
            options: 'POS Profile',
            change: () => this.loadDashboard()
        });
        
        this.dateRangeFilter = this.page.add_field({
            fieldname: 'date_range',
            label: __('Date Range'),
            fieldtype: 'Select',
            options: 'Today\nYesterday\nThis Week\nThis Month\nLast 7 Days\nLast 30 Days',
            default: 'Today',
            change: () => this.loadDashboard()
        });
    }
    
    render() {
        this.page.main.html(`
            <div class="pos-manager-dashboard">
                <!-- Stats Cards -->
                <div class="dashboard-stats">
                    <div class="stat-card primary">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value" id="today-sales">-</div>
                            <div class="stat-label">${__("Today's Sales")}</div>
                            <div class="stat-change" id="sales-change"></div>
                        </div>
                    </div>
                    
                    <div class="stat-card success">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value" id="today-invoices">-</div>
                            <div class="stat-label">${__("Invoices Today")}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card warning">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                <line x1="1" y1="10" x2="23" y2="10"/>
                            </svg>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value" id="active-sessions">-</div>
                            <div class="stat-label">${__("Active Sessions")}</div>
                        </div>
                    </div>
                    
                    <div class="stat-card danger">
                        <div class="stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value" id="pending-zatca">-</div>
                            <div class="stat-label">${__("Pending ZATCA")}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Charts Row -->
                <div class="dashboard-charts">
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>${__("Sales Trend")}</h3>
                            <select id="trend-period" class="chart-filter">
                                <option value="7">${__("Last 7 Days")}</option>
                                <option value="14">${__("Last 14 Days")}</option>
                                <option value="30">${__("Last 30 Days")}</option>
                            </select>
                        </div>
                        <div class="chart-body">
                            <canvas id="sales-chart"></canvas>
                        </div>
                    </div>
                    
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>${__("Payment Methods")}</h3>
                        </div>
                        <div class="chart-body">
                            <canvas id="payment-chart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Active Sessions -->
                <div class="dashboard-section">
                    <div class="section-header">
                        <h3>${__("Active Sessions")}</h3>
                        <button class="btn btn-sm btn-outline" id="refresh-sessions">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"/>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                            ${__("Refresh")}
                        </button>
                    </div>
                    <div class="section-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>${__("Session")}</th>
                                    <th>${__("POS Profile")}</th>
                                    <th>${__("User")}</th>
                                    <th>${__("Started")}</th>
                                    <th>${__("Sales")}</th>
                                    <th>${__("Invoices")}</th>
                                    <th>${__("Actions")}</th>
                                </tr>
                            </thead>
                            <tbody id="sessions-table">
                                <tr><td colspan="7" class="text-center">${__("Loading...")}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Top Products -->
                <div class="dashboard-row">
                    <div class="dashboard-section half">
                        <div class="section-header">
                            <h3>${__("Top Selling Products")}</h3>
                        </div>
                        <div class="section-body">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>${__("Product")}</th>
                                        <th>${__("Qty Sold")}</th>
                                        <th>${__("Revenue")}</th>
                                    </tr>
                                </thead>
                                <tbody id="top-products-table">
                                    <tr><td colspan="3" class="text-center">${__("Loading...")}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="dashboard-section half">
                        <div class="section-header">
                            <h3>${__("Cashier Performance")}</h3>
                        </div>
                        <div class="section-body">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>${__("Cashier")}</th>
                                        <th>${__("Transactions")}</th>
                                        <th>${__("Total Sales")}</th>
                                    </tr>
                                </thead>
                                <tbody id="cashier-table">
                                    <tr><td colspan="3" class="text-center">${__("Loading...")}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Invoices -->
                <div class="dashboard-section">
                    <div class="section-header">
                        <h3>${__("Recent Invoices")}</h3>
                        <a href="/app/pos-invoice" class="btn btn-sm btn-outline">${__("View All")}</a>
                    </div>
                    <div class="section-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>${__("Invoice")}</th>
                                    <th>${__("Customer")}</th>
                                    <th>${__("Time")}</th>
                                    <th>${__("Amount")}</th>
                                    <th>${__("Payment")}</th>
                                    <th>${__("ZATCA")}</th>
                                </tr>
                            </thead>
                            <tbody id="invoices-table">
                                <tr><td colspan="6" class="text-center">${__("Loading...")}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `);
        
        this.bindEvents();
    }
    
    bindEvents() {
        $('#refresh-sessions').on('click', () => this.loadActiveSessions());
        
        $('#trend-period').on('change', () => {
            const days = parseInt($('#trend-period').val());
            this.loadSalesTrend(days);
        });
    }
    
    async loadDashboard() {
        const posProfile = this.posProfileFilter.get_value();
        
        await Promise.all([
            this.loadStats(posProfile),
            this.loadSalesTrend(7, posProfile),
            this.loadPaymentBreakdown(posProfile),
            this.loadActiveSessions(),
            this.loadTopProducts(posProfile),
            this.loadCashierPerformance(posProfile),
            this.loadRecentInvoices(posProfile)
        ]);
    }
    
    async loadStats(posProfile) {
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.reports_api.get_dashboard_stats',
                args: { pos_profile: posProfile }
            });
            
            const stats = response.message || {};
            
            $('#today-sales').text(this.formatCurrency(stats.today?.sales || 0));
            $('#today-invoices').text(stats.today?.invoices || 0);
            $('#active-sessions').text(stats.active_sessions || 0);
            $('#pending-zatca').text(stats.pending_zatca || 0);
            
            // Show growth indicator
            const growth = stats.today?.growth || 0;
            const growthEl = $('#sales-change');
            if (growth > 0) {
                growthEl.html(`<span class="positive">↑ ${growth.toFixed(1)}%</span>`);
            } else if (growth < 0) {
                growthEl.html(`<span class="negative">↓ ${Math.abs(growth).toFixed(1)}%</span>`);
            } else {
                growthEl.html('');
            }
            
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }
    
    async loadSalesTrend(days = 7, posProfile = null) {
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.reports_api.get_sales_trend',
                args: { days, pos_profile: posProfile }
            });
            
            const data = response.message?.data || [];
            this.renderSalesChart(data);
            
        } catch (e) {
            console.error('Error loading sales trend:', e);
        }
    }
    
    renderSalesChart(data) {
        const ctx = document.getElementById('sales-chart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.salesChart) {
            this.salesChart.destroy();
        }
        
        const labels = data.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const values = data.map(d => d.sales || 0);
        
        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: __('Sales'),
                    data: values,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value, true)
                        }
                    }
                }
            }
        });
    }
    
    async loadPaymentBreakdown(posProfile) {
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.reports_api.get_daily_sales_report',
                args: { pos_profile: posProfile }
            });
            
            const payments = response.message?.payments || [];
            this.renderPaymentChart(payments);
            
        } catch (e) {
            console.error('Error loading payments:', e);
        }
    }
    
    renderPaymentChart(payments) {
        const ctx = document.getElementById('payment-chart');
        if (!ctx) return;
        
        if (this.paymentChart) {
            this.paymentChart.destroy();
        }
        
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        this.paymentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: payments.map(p => p.mode_of_payment),
                datasets: [{
                    data: payments.map(p => p.total || 0),
                    backgroundColor: colors.slice(0, payments.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    async loadActiveSessions() {
        try {
            const response = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'POS Session',
                    filters: { status: 'Open' },
                    fields: ['name', 'pos_profile', 'user', 'opening_time', 'total_sales', 'total_invoices'],
                    order_by: 'opening_time desc'
                }
            });
            
            const sessions = response.message || [];
            this.renderSessionsTable(sessions);
            
        } catch (e) {
            console.error('Error loading sessions:', e);
        }
    }
    
    renderSessionsTable(sessions) {
        const tbody = $('#sessions-table');
        
        if (sessions.length === 0) {
            tbody.html(`<tr><td colspan="7" class="text-center text-muted">${__("No active sessions")}</td></tr>`);
            return;
        }
        
        tbody.html(sessions.map(s => `
            <tr>
                <td><a href="/app/pos-session/${s.name}">${s.name}</a></td>
                <td>${s.pos_profile}</td>
                <td>${s.user}</td>
                <td>${frappe.datetime.prettyDate(s.opening_time)}</td>
                <td>${this.formatCurrency(s.total_sales || 0)}</td>
                <td>${s.total_invoices || 0}</td>
                <td>
                    <button class="btn btn-xs btn-outline" onclick="frappe.set_route('Form', 'POS Session', '${s.name}')">
                        ${__("View")}
                    </button>
                </td>
            </tr>
        `).join(''));
    }
    
    async loadTopProducts(posProfile) {
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.reports_api.get_top_products',
                args: { days: 30, limit: 10, pos_profile: posProfile }
            });
            
            const products = response.message?.products || [];
            this.renderTopProductsTable(products);
            
        } catch (e) {
            console.error('Error loading top products:', e);
        }
    }
    
    renderTopProductsTable(products) {
        const tbody = $('#top-products-table');
        
        if (products.length === 0) {
            tbody.html(`<tr><td colspan="3" class="text-center text-muted">${__("No data")}</td></tr>`);
            return;
        }
        
        tbody.html(products.map(p => `
            <tr>
                <td>${p.item_name}</td>
                <td>${p.total_qty}</td>
                <td>${this.formatCurrency(p.total_amount)}</td>
            </tr>
        `).join(''));
    }
    
    async loadCashierPerformance(posProfile) {
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.reports_api.get_cashier_performance',
                args: { days: 30, pos_profile: posProfile }
            });
            
            const performance = response.message?.performance || [];
            this.renderCashierTable(performance);
            
        } catch (e) {
            console.error('Error loading cashier performance:', e);
        }
    }
    
    renderCashierTable(performance) {
        const tbody = $('#cashier-table');
        
        if (performance.length === 0) {
            tbody.html(`<tr><td colspan="3" class="text-center text-muted">${__("No data")}</td></tr>`);
            return;
        }
        
        tbody.html(performance.map(p => `
            <tr>
                <td>${p.cashier_name || p.cashier}</td>
                <td>${p.transaction_count}</td>
                <td>${this.formatCurrency(p.total_sales)}</td>
            </tr>
        `).join(''));
    }
    
    async loadRecentInvoices(posProfile) {
        try {
            const filters = { docstatus: 1 };
            if (posProfile) filters.pos_profile = posProfile;
            
            const response = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'POS Invoice',
                    filters: filters,
                    fields: ['name', 'customer_name', 'posting_time', 'grand_total', 
                             'custom_zatca_status'],
                    order_by: 'creation desc',
                    limit: 10
                }
            });
            
            const invoices = response.message || [];
            this.renderInvoicesTable(invoices);
            
        } catch (e) {
            console.error('Error loading invoices:', e);
        }
    }
    
    renderInvoicesTable(invoices) {
        const tbody = $('#invoices-table');
        
        if (invoices.length === 0) {
            tbody.html(`<tr><td colspan="6" class="text-center text-muted">${__("No invoices today")}</td></tr>`);
            return;
        }
        
        tbody.html(invoices.map(inv => {
            const zatcaStatus = inv.custom_zatca_status || 'Not Submitted';
            const zatcaClass = zatcaStatus === 'REPORTED' ? 'success' : 
                              zatcaStatus === 'Not Submitted' ? 'warning' : 'danger';
            
            return `
                <tr>
                    <td><a href="/app/pos-invoice/${inv.name}">${inv.name}</a></td>
                    <td>${inv.customer_name || '-'}</td>
                    <td>${inv.posting_time || '-'}</td>
                    <td>${this.formatCurrency(inv.grand_total)}</td>
                    <td>-</td>
                    <td><span class="badge badge-${zatcaClass}">${zatcaStatus}</span></td>
                </tr>
            `;
        }).join(''));
    }
    
    formatCurrency(amount, short = false) {
        if (short && amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return frappe.format(amount, { fieldtype: 'Currency' });
    }
    
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.salesChart) {
            this.salesChart.destroy();
        }
        if (this.paymentChart) {
            this.paymentChart.destroy();
        }
    }
}
