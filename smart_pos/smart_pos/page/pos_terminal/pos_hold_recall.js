/**
 * Smart POS - Hold & Recall System
 * Copyright (c) 2026, Ahmad
 * Allows holding invoices and recalling them later
 */

class HoldRecallManager {
    constructor(posTerminal) {
        this.pos = posTerminal;
        this.storeName = 'held_invoices';
        this.maxHeldInvoices = 50;
    }
    
    /**
     * Hold current cart
     */
    async holdCart(notes = '') {
        const cart = this.pos.state.cart;
        
        if (cart.length === 0) {
            frappe.msgprint(__('Cart is empty'));
            return null;
        }
        
        const heldInvoice = {
            id: this.generateHoldId(),
            timestamp: new Date().toISOString(),
            user: frappe.session.user,
            customer: this.pos.state.customer,
            items: JSON.parse(JSON.stringify(cart)), // Deep copy
            notes: notes,
            session_id: this.pos.state.session?.session_id || this.pos.state.session?.name,
            pos_profile: this.pos.state.profile?.name
        };
        
        // Calculate totals
        heldInvoice.subtotal = cart.reduce((sum, item) => sum + item.amount, 0);
        heldInvoice.item_count = cart.reduce((sum, item) => sum + item.qty, 0);
        
        // Save to IndexedDB
        await this.saveHeldInvoice(heldInvoice);
        
        // Clear cart
        this.pos.clearCart();
        
        frappe.show_alert({
            message: __('Invoice held successfully. ID: ') + heldInvoice.id,
            indicator: 'blue'
        });
        
        return heldInvoice;
    }
    
    /**
     * Recall a held invoice back to cart
     */
    async recallInvoice(holdId) {
        const heldInvoice = await this.getHeldInvoice(holdId);
        
        if (!heldInvoice) {
            frappe.msgprint(__('Held invoice not found'));
            return false;
        }
        
        // Check if current cart has items
        if (this.pos.state.cart.length > 0) {
            return new Promise((resolve) => {
                frappe.confirm(
                    __('Current cart has items. Do you want to replace them?'),
                    async () => {
                        await this.doRecall(heldInvoice, holdId);
                        resolve(true);
                    },
                    () => resolve(false)
                );
            });
        }
        
        await this.doRecall(heldInvoice, holdId);
        return true;
    }
    
    async doRecall(heldInvoice, holdId) {
        // Restore cart
        this.pos.state.cart = heldInvoice.items;
        
        // Restore customer
        if (heldInvoice.customer) {
            this.pos.state.customer = heldInvoice.customer;
            this.pos.updateCustomerDisplay();
        }
        
        // Render cart
        this.pos.renderCart();
        
        // Remove from held invoices
        await this.deleteHeldInvoice(holdId);
        
        frappe.show_alert({
            message: __('Invoice recalled successfully'),
            indicator: 'green'
        });
    }
    
    /**
     * Get all held invoices
     */
    async getHeldInvoices() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SmartPOS', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                // Check if store exists
                if (!db.objectStoreNames.contains(this.storeName)) {
                    resolve([]);
                    return;
                }
                
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                    const invoices = getAllRequest.result || [];
                    // Sort by timestamp descending
                    invoices.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    resolve(invoices);
                };
                
                getAllRequest.onerror = () => reject(getAllRequest.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Get single held invoice
     */
    async getHeldInvoice(holdId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SmartPOS', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const getRequest = store.get(holdId);
                
                getRequest.onsuccess = () => resolve(getRequest.result || null);
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Save held invoice to IndexedDB
     */
    async saveHeldInvoice(invoice) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SmartPOS', 2);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                const addRequest = store.put(invoice);
                addRequest.onsuccess = () => resolve(invoice);
                addRequest.onerror = () => reject(addRequest.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Delete held invoice
     */
    async deleteHeldInvoice(holdId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SmartPOS', 2);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    resolve(false);
                    return;
                }
                
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const deleteRequest = store.delete(holdId);
                
                deleteRequest.onsuccess = () => resolve(true);
                deleteRequest.onerror = () => reject(deleteRequest.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Show held invoices modal
     */
    async showHeldInvoicesModal() {
        const invoices = await this.getHeldInvoices();
        
        const modalHtml = `
            <div class="pos-modal" id="held-invoices-modal">
                <div class="pos-modal-content" style="max-width: 600px;">
                    <div class="pos-modal-header">
                        <h2>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                            ${__('Held Invoices')} (${invoices.length})
                        </h2>
                        <button class="pos-modal-close" id="close-held-modal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="pos-modal-body" style="max-height: 400px; overflow-y: auto;">
                        ${invoices.length === 0 
                            ? `<div class="pos-empty-state">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                </svg>
                                <p>${__('No held invoices')}</p>
                               </div>`
                            : `<div class="held-invoices-list">
                                ${invoices.map(inv => this.renderHeldInvoiceCard(inv)).join('')}
                               </div>`
                        }
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM
        $('body').append(modalHtml);
        
        // Bind events
        $('#close-held-modal').on('click', () => $('#held-invoices-modal').remove());
        
        $('#held-invoices-modal').on('click', '.btn-recall', (e) => {
            const holdId = $(e.currentTarget).data('hold-id');
            $('#held-invoices-modal').remove();
            this.recallInvoice(holdId);
        });
        
        $('#held-invoices-modal').on('click', '.btn-delete-held', async (e) => {
            e.stopPropagation();
            const holdId = $(e.currentTarget).data('hold-id');
            await this.deleteHeldInvoice(holdId);
            $(e.currentTarget).closest('.held-invoice-card').fadeOut(300, function() {
                $(this).remove();
                // Update count
                const remaining = $('#held-invoices-modal .held-invoice-card').length;
                $('#held-invoices-modal h2').html(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    ${__('Held Invoices')} (${remaining})
                `);
                if (remaining === 0) {
                    $('#held-invoices-modal .pos-modal-body').html(`
                        <div class="pos-empty-state">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                            </svg>
                            <p>${__('No held invoices')}</p>
                        </div>
                    `);
                }
            });
        });
        
        // Close on outside click
        $('#held-invoices-modal').on('click', (e) => {
            if (e.target.id === 'held-invoices-modal') {
                $('#held-invoices-modal').remove();
            }
        });
    }
    
    renderHeldInvoiceCard(invoice) {
        const time = new Date(invoice.timestamp);
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = time.toLocaleDateString();
        
        return `
            <div class="held-invoice-card" data-hold-id="${invoice.id}">
                <div class="held-invoice-info">
                    <div class="held-invoice-id">#${invoice.id}</div>
                    <div class="held-invoice-time">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        ${dateStr} ${timeStr}
                    </div>
                    ${invoice.customer ? `<div class="held-invoice-customer">${invoice.customer.customer_name}</div>` : ''}
                    ${invoice.notes ? `<div class="held-invoice-notes">${invoice.notes}</div>` : ''}
                </div>
                <div class="held-invoice-summary">
                    <div class="held-invoice-items">${invoice.item_count} ${__('items')}</div>
                    <div class="held-invoice-total">${frappe.format(invoice.subtotal, {fieldtype: 'Currency'})}</div>
                </div>
                <div class="held-invoice-actions">
                    <button class="btn btn-primary btn-recall" data-hold-id="${invoice.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="1 4 1 10 7 10"/>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                        </svg>
                        ${__('Recall')}
                    </button>
                    <button class="btn btn-outline btn-delete-held" data-hold-id="${invoice.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Show hold dialog with optional notes
     */
    showHoldDialog() {
        if (this.pos.state.cart.length === 0) {
            frappe.msgprint(__('Cart is empty'));
            return;
        }
        
        const d = new frappe.ui.Dialog({
            title: __('Hold Invoice'),
            fields: [
                {
                    fieldname: 'notes',
                    fieldtype: 'Small Text',
                    label: __('Notes (Optional)'),
                    placeholder: __('Add a note to identify this held invoice...')
                }
            ],
            primary_action_label: __('Hold'),
            primary_action: async (values) => {
                await this.holdCart(values.notes || '');
                d.hide();
            }
        });
        
        d.show();
    }
    
    /**
     * Generate unique hold ID
     */
    generateHoldId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 4);
        return `H${timestamp}${random}`.toUpperCase();
    }
    
    /**
     * Get held invoices count
     */
    async getHeldCount() {
        const invoices = await this.getHeldInvoices();
        return invoices.length;
    }
    
    /**
     * Update held count badge
     */
    async updateHeldBadge() {
        const count = await this.getHeldCount();
        const $badge = $('#held-count');
        
        if (count > 0) {
            $badge.text(count).show();
        } else {
            $badge.hide();
        }
    }
}

// Add CSS for hold/recall UI
const holdRecallStyles = `
<style>
.held-invoices-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.held-invoice-card {
    background: var(--pos-surface);
    border: 1px solid var(--pos-border);
    border-radius: var(--pos-radius);
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: var(--pos-transition);
}

.held-invoice-card:hover {
    border-color: var(--pos-primary);
    box-shadow: var(--pos-shadow);
}

.held-invoice-info {
    flex: 1;
}

.held-invoice-id {
    font-weight: 600;
    color: var(--pos-primary);
    margin-bottom: 4px;
}

.held-invoice-time {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--pos-text-secondary);
}

.held-invoice-customer {
    font-size: 13px;
    color: var(--pos-text);
    margin-top: 4px;
}

.held-invoice-notes {
    font-size: 12px;
    color: var(--pos-text-muted);
    font-style: italic;
    margin-top: 4px;
}

.held-invoice-summary {
    text-align: right;
    min-width: 100px;
}

.held-invoice-items {
    font-size: 12px;
    color: var(--pos-text-secondary);
}

.held-invoice-total {
    font-size: 16px;
    font-weight: 600;
    color: var(--pos-text);
}

.held-invoice-actions {
    display: flex;
    gap: 8px;
}

.pos-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--pos-text-secondary);
    padding: 4px;
    border-radius: var(--pos-radius-sm);
    transition: var(--pos-transition);
}

.pos-modal-close:hover {
    background: var(--pos-surface-hover);
    color: var(--pos-text);
}

.pos-empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--pos-text-muted);
}

.pos-empty-state svg {
    margin-bottom: 16px;
    opacity: 0.5;
}

.pos-empty-state p {
    font-size: 14px;
}

.btn-outline {
    background: transparent;
    border: 1px solid var(--pos-border);
    color: var(--pos-text-secondary);
}

.btn-outline:hover {
    background: var(--pos-surface-hover);
    border-color: var(--pos-text-muted);
}

#held-count {
    position: absolute;
    top: -6px;
    right: -6px;
    background: var(--pos-danger);
    color: white;
    font-size: 10px;
    font-weight: 600;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
}
</style>
`;

// Inject styles
if (!document.getElementById('hold-recall-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'hold-recall-styles';
    styleEl.innerHTML = holdRecallStyles;
    document.head.appendChild(styleEl.firstChild);
}

// Export
window.HoldRecallManager = HoldRecallManager;
