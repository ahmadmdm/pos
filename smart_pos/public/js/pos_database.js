/**
 * Smart POS - IndexedDB Database Manager
 * Handles all local storage operations for offline-first functionality
 * Copyright (c) 2026, Ahmad
 */

class POSDatabase {
    constructor() {
        this.dbName = 'SmartPOS';
        this.dbVersion = 1;
        this.db = null;
        this.stores = {
            items: 'items',
            customers: 'customers',
            invoices: 'invoices',
            pendingSync: 'pendingSync',
            sessions: 'sessions',
            settings: 'settings',
            cache: 'cache'
        };
    }

    /**
     * Initialize the database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
            };
        });
    }

    /**
     * Create object stores
     */
    createStores(db) {
        // Items store - for product catalog
        if (!db.objectStoreNames.contains(this.stores.items)) {
            const itemStore = db.createObjectStore(this.stores.items, { keyPath: 'item_code' });
            itemStore.createIndex('item_name', 'item_name', { unique: false });
            itemStore.createIndex('item_group', 'item_group', { unique: false });
            itemStore.createIndex('barcode', 'barcodes', { unique: false, multiEntry: true });
        }

        // Customers store
        if (!db.objectStoreNames.contains(this.stores.customers)) {
            const customerStore = db.createObjectStore(this.stores.customers, { keyPath: 'name' });
            customerStore.createIndex('customer_name', 'customer_name', { unique: false });
            customerStore.createIndex('mobile_no', 'mobile_no', { unique: false });
        }

        // Invoices store - for offline invoices
        if (!db.objectStoreNames.contains(this.stores.invoices)) {
            const invoiceStore = db.createObjectStore(this.stores.invoices, { keyPath: 'offline_id' });
            invoiceStore.createIndex('synced', 'synced', { unique: false });
            invoiceStore.createIndex('created_at', 'created_at', { unique: false });
            invoiceStore.createIndex('customer', 'customer', { unique: false });
        }

        // Pending sync store
        if (!db.objectStoreNames.contains(this.stores.pendingSync)) {
            const syncStore = db.createObjectStore(this.stores.pendingSync, { keyPath: 'id', autoIncrement: true });
            syncStore.createIndex('type', 'type', { unique: false });
            syncStore.createIndex('status', 'status', { unique: false });
            syncStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Sessions store
        if (!db.objectStoreNames.contains(this.stores.sessions)) {
            const sessionStore = db.createObjectStore(this.stores.sessions, { keyPath: 'id' });
            sessionStore.createIndex('status', 'status', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(this.stores.settings)) {
            db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }

        // Cache store for temporary data
        if (!db.objectStoreNames.contains(this.stores.cache)) {
            const cacheStore = db.createObjectStore(this.stores.cache, { keyPath: 'key' });
            cacheStore.createIndex('expires', 'expires', { unique: false });
        }

        console.log('✅ Object stores created');
    }

    // =============================================================================
    // Generic CRUD Operations
    // =============================================================================

    /**
     * Add or update a record
     */
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a record by key
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all records from a store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a record by key
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all records from a store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Query by index
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Bulk insert/update
     */
    async bulkPut(storeName, items) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            let completed = 0;
            const total = items.length;

            if (total === 0) {
                resolve();
                return;
            }

            items.forEach(item => {
                const request = store.put(item);
                request.onsuccess = () => {
                    completed++;
                    if (completed === total) resolve();
                };
                request.onerror = () => reject(request.error);
            });
        });
    }

    // =============================================================================
    // Items Operations
    // =============================================================================

    async saveItems(items) {
        return this.bulkPut(this.stores.items, items);
    }

    async getItem(itemCode) {
        return this.get(this.stores.items, itemCode);
    }

    async getAllItems() {
        return this.getAll(this.stores.items);
    }

    async searchItems(query) {
        const items = await this.getAllItems();
        const searchLower = query.toLowerCase();
        
        return items.filter(item => 
            item.item_code.toLowerCase().includes(searchLower) ||
            item.item_name.toLowerCase().includes(searchLower) ||
            (item.barcodes && item.barcodes.some(b => b.includes(query)))
        );
    }

    async getItemByBarcode(barcode) {
        const items = await this.getAllItems();
        return items.find(item => 
            item.barcodes && item.barcodes.includes(barcode)
        );
    }

    async getItemsByGroup(itemGroup) {
        return this.getByIndex(this.stores.items, 'item_group', itemGroup);
    }

    // =============================================================================
    // Customers Operations
    // =============================================================================

    async saveCustomers(customers) {
        return this.bulkPut(this.stores.customers, customers);
    }

    async getCustomer(name) {
        return this.get(this.stores.customers, name);
    }

    async getAllCustomers() {
        return this.getAll(this.stores.customers);
    }

    async searchCustomers(query) {
        const customers = await this.getAllCustomers();
        const searchLower = query.toLowerCase();
        
        return customers.filter(c =>
            c.customer_name.toLowerCase().includes(searchLower) ||
            (c.mobile_no && c.mobile_no.includes(query)) ||
            c.name.toLowerCase().includes(searchLower)
        );
    }

    async addCustomer(customer) {
        customer.offline_id = this.generateOfflineId();
        customer.synced = false;
        await this.put(this.stores.customers, customer);
        await this.addToPendingSync('customer', customer);
        return customer;
    }

    // =============================================================================
    // Invoice Operations
    // =============================================================================

    async saveInvoice(invoice) {
        if (!invoice.offline_id) {
            invoice.offline_id = this.generateOfflineId();
        }
        invoice.created_at = new Date().toISOString();
        invoice.synced = false;
        
        await this.put(this.stores.invoices, invoice);
        await this.addToPendingSync('invoice', invoice);
        
        return invoice;
    }

    async getInvoice(offlineId) {
        return this.get(this.stores.invoices, offlineId);
    }

    async getAllInvoices() {
        return this.getAll(this.stores.invoices);
    }

    async getUnsyncedInvoices() {
        // IndexedDB can't query boolean false directly, so filter manually
        const invoices = await this.getAll(this.stores.invoices);
        return invoices.filter(inv => inv.synced === false);
    }

    async markInvoiceSynced(offlineId, serverName) {
        const invoice = await this.getInvoice(offlineId);
        if (invoice) {
            invoice.synced = true;
            invoice.server_name = serverName;
            invoice.synced_at = new Date().toISOString();
            await this.put(this.stores.invoices, invoice);
        }
    }

    // =============================================================================
    // Pending Sync Operations
    // =============================================================================

    async addToPendingSync(type, data) {
        const syncItem = {
            type,
            data,
            status: 'pending',
            created_at: new Date().toISOString(),
            attempts: 0
        };
        return this.put(this.stores.pendingSync, syncItem);
    }

    async getPendingSync() {
        // Filter manually to avoid IndexedDB key issues
        const allItems = await this.getAll(this.stores.pendingSync);
        return allItems.filter(item => item.status === 'pending');
    }

    async markSynced(id) {
        const item = await this.get(this.stores.pendingSync, id);
        if (item) {
            item.status = 'synced';
            item.synced_at = new Date().toISOString();
            await this.put(this.stores.pendingSync, item);
        }
    }

    async markSyncFailed(id, error) {
        const item = await this.get(this.stores.pendingSync, id);
        if (item) {
            item.attempts = (item.attempts || 0) + 1;
            item.last_error = error;
            item.last_attempt = new Date().toISOString();
            if (item.attempts >= 5) {
                item.status = 'failed';
            }
            await this.put(this.stores.pendingSync, item);
        }
    }

    // =============================================================================
    // Session Operations
    // =============================================================================

    async saveSession(session) {
        return this.put(this.stores.sessions, session);
    }

    async getActiveSession() {
        const sessions = await this.getByIndex(this.stores.sessions, 'status', 'Open');
        return sessions[0] || null;
    }

    // =============================================================================
    // Settings Operations
    // =============================================================================

    async saveSetting(key, value) {
        return this.put(this.stores.settings, { key, value, updated_at: new Date().toISOString() });
    }

    async getSetting(key) {
        const setting = await this.get(this.stores.settings, key);
        return setting ? setting.value : null;
    }

    async getLastSyncTime() {
        return this.getSetting('lastSyncTime');
    }

    async setLastSyncTime(time) {
        return this.saveSetting('lastSyncTime', time);
    }

    // =============================================================================
    // Utility Functions
    // =============================================================================

    generateOfflineId() {
        return `OFF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async getStorageStats() {
        const stats = {};
        for (const [name, store] of Object.entries(this.stores)) {
            const items = await this.getAll(store);
            stats[name] = {
                count: items.length,
                size: new Blob([JSON.stringify(items)]).size
            };
        }
        
        // Total size
        stats.total = Object.values(stats).reduce((acc, s) => acc + s.size, 0);
        stats.totalFormatted = this.formatBytes(stats.total);
        
        return stats;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async clearAllData() {
        for (const store of Object.values(this.stores)) {
            await this.clear(store);
        }
        console.log('✅ All IndexedDB data cleared');
    }
}

// Export singleton instance
window.POSDatabase = new POSDatabase();
