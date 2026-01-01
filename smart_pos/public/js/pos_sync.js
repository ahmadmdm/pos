/**
 * Smart POS - Sync Engine
 * Handles background synchronization between offline and online
 * Copyright (c) 2026, Ahmad
 */

class POSSyncEngine {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncInterval = null;
        this.syncQueue = [];
        this.listeners = new Set();
        this.settings = {
            syncIntervalMs: 30000,  // 30 seconds
            maxRetries: 5,
            retryDelayMs: 5000
        };
    }

    /**
     * Initialize sync engine
     */
    async init(settings = {}) {
        Object.assign(this.settings, settings);
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Start periodic sync if online
        if (this.isOnline) {
            this.startPeriodicSync();
        }
        
        console.log('✅ Sync Engine initialized');
    }

    /**
     * Handle coming online
     */
    async handleOnline() {
        this.isOnline = true;
        this.emit('online');
        console.log('🌐 Connection restored - starting sync');
        
        // Immediate sync on reconnect
        await this.syncAll();
        
        // Resume periodic sync
        this.startPeriodicSync();
    }

    /**
     * Handle going offline
     */
    handleOffline() {
        this.isOnline = false;
        this.emit('offline');
        console.log('📴 Connection lost - entering offline mode');
        
        // Stop periodic sync
        this.stopPeriodicSync();
    }

    /**
     * Start periodic synchronization
     */
    startPeriodicSync() {
        if (this.syncInterval) return;
        
        this.syncInterval = setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this.syncPending();
            }
        }, this.settings.syncIntervalMs);
        
        console.log(`⏱️ Periodic sync started (every ${this.settings.syncIntervalMs / 1000}s)`);
    }

    /**
     * Stop periodic synchronization
     */
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏱️ Periodic sync stopped');
        }
    }

    /**
     * Sync all pending data
     */
    async syncAll() {
        if (!this.isOnline || this.isSyncing) {
            console.log('⏳ Sync skipped - offline or already syncing');
            return { success: false, reason: 'offline_or_busy' };
        }

        this.isSyncing = true;
        this.emit('syncStart');
        
        const results = {
            invoices: { success: 0, failed: 0 },
            customers: { success: 0, failed: 0 },
            masterData: false
        };

        try {
            // 1. Sync pending invoices
            const invoiceResults = await this.syncPendingInvoices();
            results.invoices = invoiceResults;

            // 2. Sync pending customers
            const customerResults = await this.syncPendingCustomers();
            results.customers = customerResults;

            // 3. Download master data updates
            await this.downloadMasterData();
            results.masterData = true;

            this.emit('syncComplete', results);
            console.log('✅ Full sync completed', results);
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            this.emit('syncError', error);
        } finally {
            this.isSyncing = false;
        }

        return results;
    }

    /**
     * Sync only pending items
     */
    async syncPending() {
        if (!this.isOnline || this.isSyncing) return;

        this.isSyncing = true;
        
        try {
            await this.syncPendingInvoices();
            await this.syncPendingCustomers();
        } catch (error) {
            console.error('Pending sync error:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync pending invoices to server
     */
    async syncPendingInvoices() {
        const results = { success: 0, failed: 0, errors: [] };
        
        const pendingInvoices = await window.POSDatabase.getUnsyncedInvoices();
        console.log(`📤 Syncing ${pendingInvoices.length} pending invoices`);

        for (const invoice of pendingInvoices) {
            try {
                const response = await this.callAPI('smart_pos.smart_pos.api.pos_api.create_pos_invoice', {
                    invoice_data: JSON.stringify(invoice)
                });

                if (response.status === 'success' || response.status === 'duplicate') {
                    await window.POSDatabase.markInvoiceSynced(invoice.offline_id, response.name);
                    results.success++;
                    this.emit('invoiceSynced', { offline_id: invoice.offline_id, server_name: response.name });
                } else {
                    results.failed++;
                    results.errors.push({ offline_id: invoice.offline_id, error: response.message });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ offline_id: invoice.offline_id, error: error.message });
            }
        }

        return results;
    }

    /**
     * Sync pending customers to server
     */
    async syncPendingCustomers() {
        const results = { success: 0, failed: 0, errors: [] };
        
        const customers = await window.POSDatabase.getAllCustomers();
        const pendingCustomers = customers.filter(c => !c.synced);
        
        console.log(`📤 Syncing ${pendingCustomers.length} pending customers`);

        for (const customer of pendingCustomers) {
            try {
                const response = await this.callAPI('smart_pos.smart_pos.api.pos_api.create_customer', {
                    customer_name: customer.customer_name,
                    mobile_no: customer.mobile_no,
                    email_id: customer.email_id,
                    customer_type: customer.customer_type || 'Individual'
                });

                if (response.name) {
                    customer.name = response.name;
                    customer.synced = true;
                    await window.POSDatabase.put(window.POSDatabase.stores.customers, customer);
                    results.success++;
                }
            } catch (error) {
                results.failed++;
                results.errors.push({ customer: customer.customer_name, error: error.message });
            }
        }

        return results;
    }

    /**
     * Download master data from server
     */
    async downloadMasterData() {
        const posProfile = await window.POSDatabase.getSetting('posProfile');
        if (!posProfile) {
            console.log('⚠️ No POS Profile set, skipping master data download');
            return;
        }

        const lastSync = await window.POSDatabase.getLastSyncTime();
        
        try {
            this.emit('downloadStart');
            
            const response = await this.callAPI('smart_pos.smart_pos.api.sync_api.get_master_data_for_offline', {
                pos_profile: posProfile,
                last_sync: lastSync
            });

            // Save items
            if (response.items && response.items.length > 0) {
                await window.POSDatabase.saveItems(response.items);
                console.log(`📥 Downloaded ${response.items.length} items`);
            }

            // Save customers
            if (response.customers && response.customers.length > 0) {
                // Merge with local data
                for (const customer of response.customers) {
                    customer.synced = true;
                }
                await window.POSDatabase.saveCustomers(response.customers);
                console.log(`📥 Downloaded ${response.customers.length} customers`);
            }

            // Save sync timestamp
            await window.POSDatabase.setLastSyncTime(response.sync_timestamp);
            
            this.emit('downloadComplete', {
                items: response.items?.length || 0,
                customers: response.customers?.length || 0
            });

        } catch (error) {
            console.error('Master data download error:', error);
            this.emit('downloadError', error);
        }
    }

    /**
     * Force full data refresh
     */
    async forceFullSync() {
        // Clear last sync time to get all data
        await window.POSDatabase.saveSetting('lastSyncTime', null);
        return this.syncAll();
    }

    /**
     * Get sync status
     */
    async getStatus() {
        const pendingInvoices = await window.POSDatabase.getUnsyncedInvoices();
        const allCustomers = await window.POSDatabase.getAllCustomers();
        const pendingCustomers = allCustomers.filter(c => !c.synced);
        const lastSync = await window.POSDatabase.getLastSyncTime();
        const storage = await window.POSDatabase.getStorageStats();

        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            pendingInvoices: pendingInvoices.length,
            pendingCustomers: pendingCustomers.length,
            totalPending: pendingInvoices.length + pendingCustomers.length,
            lastSync: lastSync,
            storage: storage
        };
    }

    // =============================================================================
    // Event System
    // =============================================================================

    /**
     * Add event listener
     */
    on(event, callback) {
        this.listeners.add({ event, callback });
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        this.listeners.forEach(listener => {
            if (listener.event === event && listener.callback === callback) {
                this.listeners.delete(listener);
            }
        });
    }

    /**
     * Emit event
     */
    emit(event, data = null) {
        this.listeners.forEach(listener => {
            if (listener.event === event) {
                listener.callback(data);
            }
        });
    }

    // =============================================================================
    // API Helper
    // =============================================================================

    /**
     * Call Frappe API
     */
    async callAPI(method, args = {}) {
        const response = await fetch('/api/method/' + method, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Frappe-CSRF-Token': frappe?.csrf_token || ''
            },
            body: JSON.stringify(args)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.exc) {
            throw new Error(result.exc);
        }

        return result.message;
    }
}

// Export singleton instance
window.POSSyncEngine = new POSSyncEngine();
