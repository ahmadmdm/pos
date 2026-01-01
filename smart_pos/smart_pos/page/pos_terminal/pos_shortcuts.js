/**
 * Smart POS - Keyboard Shortcuts & Quick Keys
 * Copyright (c) 2026, Ahmad
 * Comprehensive keyboard shortcut system for fast POS operations
 */

class KeyboardShortcutsManager {
    constructor(posTerminal) {
        this.pos = posTerminal;
        this.enabled = true;
        this.shortcuts = new Map();
        this.quickKeys = [];
        this.setupDefaultShortcuts();
        this.bindGlobalListener();
    }
    
    setupDefaultShortcuts() {
        // Navigation & Search
        this.register('F1', 'Help / Show Shortcuts', () => this.showShortcutsHelp());
        this.register('F2', 'Focus Product Search', () => this.focusSearch());
        this.register('F3', 'Open Payment', () => this.openPayment());
        this.register('F4', 'Select Customer', () => this.pos.showCustomerModal());
        this.register('F5', 'Refresh Data', () => this.refreshData());
        this.register('F6', 'Hold Invoice', () => this.holdInvoice());
        this.register('F7', 'Recall Invoice', () => this.recallInvoice());
        this.register('F8', 'Toggle Fullscreen', () => this.toggleFullscreen());
        this.register('F9', 'Print Last Invoice', () => this.printLastInvoice());
        this.register('F10', 'Close Session', () => this.pos.showCloseSessionModal());
        
        // Cart Operations
        this.register('Escape', 'Cancel / Close Modal', () => this.cancelAction());
        this.register('Delete', 'Remove Selected Item', () => this.removeSelectedItem());
        this.register('Ctrl+Delete', 'Clear Cart', () => this.clearCart());
        this.register('+', 'Increase Quantity', () => this.changeQuantity(1));
        this.register('-', 'Decrease Quantity', () => this.changeQuantity(-1));
        
        // Payment Shortcuts
        this.register('Ctrl+Enter', 'Complete Payment', () => this.completePayment());
        this.register('Ctrl+C', 'Cash Payment', () => this.setPaymentMethod('Cash'));
        this.register('Ctrl+V', 'Card Payment', () => this.setPaymentMethod('Card'));
        this.register('Ctrl+B', 'Bank Transfer', () => this.setPaymentMethod('Bank'));
        
        // Quick Amount Keys (during payment)
        this.register('Ctrl+1', 'Quick Amount 10', () => this.setQuickAmount(10));
        this.register('Ctrl+2', 'Quick Amount 20', () => this.setQuickAmount(20));
        this.register('Ctrl+5', 'Quick Amount 50', () => this.setQuickAmount(50));
        this.register('Ctrl+0', 'Exact Amount', () => this.setExactAmount());
        
        // Navigation
        this.register('ArrowUp', 'Select Previous Item', () => this.navigateCart(-1));
        this.register('ArrowDown', 'Select Next Item', () => this.navigateCart(1));
        this.register('PageUp', 'Previous Product Page', () => this.navigateProducts(-1));
        this.register('PageDown', 'Next Product Page', () => this.navigateProducts(1));
        
        // Discount
        this.register('Ctrl+D', 'Apply Discount', () => this.showDiscountDialog());
        
        // Reports
        this.register('Ctrl+R', 'Session Report', () => this.showSessionReport());
    }
    
    register(key, description, action) {
        this.shortcuts.set(key.toLowerCase(), {
            key,
            description,
            action
        });
    }
    
    unregister(key) {
        this.shortcuts.delete(key.toLowerCase());
    }
    
    bindGlobalListener() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            
            // Don't capture if typing in input
            if (this.isTypingInInput(e)) return;
            
            const keyCombo = this.getKeyCombo(e);
            const shortcut = this.shortcuts.get(keyCombo.toLowerCase());
            
            if (shortcut) {
                e.preventDefault();
                e.stopPropagation();
                shortcut.action();
            }
        });
    }
    
    getKeyCombo(e) {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        
        // Handle special keys
        let key = e.key;
        if (key === ' ') key = 'Space';
        else if (key === 'ArrowUp') key = 'ArrowUp';
        else if (key === 'ArrowDown') key = 'ArrowDown';
        else if (key === 'ArrowLeft') key = 'ArrowLeft';
        else if (key === 'ArrowRight') key = 'ArrowRight';
        else if (key.length === 1) key = key.toUpperCase();
        
        parts.push(key);
        return parts.join('+');
    }
    
    isTypingInInput(e) {
        const target = e.target;
        const tagName = target.tagName.toLowerCase();
        
        // Allow certain shortcuts even when in input
        if (['F1', 'F2', 'F3', 'Escape'].includes(e.key)) {
            return false;
        }
        
        return tagName === 'input' || 
               tagName === 'textarea' || 
               tagName === 'select' ||
               target.isContentEditable;
    }
    
    // Action handlers
    focusSearch() {
        $('#product-search').focus().select();
    }
    
    openPayment() {
        if (this.pos.state.cart.length > 0) {
            this.pos.showPaymentModal();
        }
    }
    
    refreshData() {
        frappe.show_alert({ message: __('Refreshing data...'), indicator: 'blue' });
        this.pos.loadInitialData();
    }
    
    holdInvoice() {
        if (window.HoldRecallManager && this.pos.holdRecallManager) {
            this.pos.holdRecallManager.showHoldDialog();
        }
    }
    
    recallInvoice() {
        if (window.HoldRecallManager && this.pos.holdRecallManager) {
            this.pos.holdRecallManager.showHeldInvoicesModal();
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    printLastInvoice() {
        // TODO: Implement print last invoice
        frappe.show_alert({ message: __('Print last invoice'), indicator: 'blue' });
    }
    
    cancelAction() {
        // Close any open modal
        $('.pos-modal').hide();
        this.pos.$paymentModal?.hide();
        this.pos.$customerModal?.hide();
        this.pos.$closeSessionModal?.hide();
        $('#held-invoices-modal').remove();
    }
    
    removeSelectedItem() {
        const selectedIndex = this.pos.state.selectedCartIndex;
        if (selectedIndex !== undefined && selectedIndex >= 0) {
            this.pos.removeFromCart(selectedIndex);
        }
    }
    
    clearCart() {
        if (this.pos.state.cart.length > 0) {
            frappe.confirm(__('Clear all items from cart?'), () => {
                this.pos.clearCart();
            });
        }
    }
    
    changeQuantity(delta) {
        const selectedIndex = this.pos.state.selectedCartIndex;
        if (selectedIndex !== undefined && selectedIndex >= 0) {
            const item = this.pos.state.cart[selectedIndex];
            if (item) {
                const newQty = item.qty + delta;
                if (newQty > 0) {
                    this.pos.updateCartItem(selectedIndex, 'qty', newQty);
                }
            }
        }
    }
    
    completePayment() {
        if (this.pos.$paymentModal.is(':visible')) {
            this.pos.completePayment();
        }
    }
    
    setPaymentMethod(method) {
        if (this.pos.$paymentModal.is(':visible')) {
            this.pos.selectPaymentMethod(method);
        }
    }
    
    setQuickAmount(amount) {
        if (this.pos.$paymentModal.is(':visible')) {
            this.pos.state.paymentInput = String(amount);
            $('#payment-input').val(amount.toFixed(2));
            this.pos.updatePaymentChange();
        }
    }
    
    setExactAmount() {
        if (this.pos.$paymentModal.is(':visible')) {
            const total = this.pos.state.paymentTotal;
            this.pos.state.paymentInput = String(total);
            $('#payment-input').val(total.toFixed(2));
            this.pos.updatePaymentChange();
        }
    }
    
    navigateCart(direction) {
        const cart = this.pos.state.cart;
        if (cart.length === 0) return;
        
        let currentIndex = this.pos.state.selectedCartIndex ?? -1;
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) newIndex = cart.length - 1;
        if (newIndex >= cart.length) newIndex = 0;
        
        this.pos.state.selectedCartIndex = newIndex;
        this.highlightCartItem(newIndex);
    }
    
    highlightCartItem(index) {
        $('.pos-cart-item').removeClass('selected');
        $(`.pos-cart-item[data-index="${index}"]`).addClass('selected');
    }
    
    navigateProducts(direction) {
        if (direction < 0) {
            $('#prev-page').click();
        } else {
            $('#next-page').click();
        }
    }
    
    showDiscountDialog() {
        if (window.DiscountManager && this.pos.discountManager) {
            this.pos.discountManager.showDiscountModal();
        }
    }
    
    showSessionReport() {
        // Open session report
        const sessionId = this.pos.state.session?.session_id || this.pos.state.session?.name;
        if (sessionId) {
            frappe.set_route('query-report', 'POS Session Report', { session: sessionId });
        }
    }
    
    showShortcutsHelp() {
        const shortcuts = Array.from(this.shortcuts.values());
        
        // Group shortcuts by category
        const categories = {
            'Navigation': ['F1', 'F2', 'F4', 'F5', 'F8', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'],
            'Cart': ['Escape', 'Delete', 'Ctrl+Delete', '+', '-', 'Ctrl+D'],
            'Payment': ['F3', 'Ctrl+Enter', 'Ctrl+C', 'Ctrl+V', 'Ctrl+B', 'Ctrl+1', 'Ctrl+2', 'Ctrl+5', 'Ctrl+0'],
            'Hold/Recall': ['F6', 'F7'],
            'Session': ['F9', 'F10', 'Ctrl+R']
        };
        
        let html = '<div class="shortcuts-help">';
        
        for (const [category, keys] of Object.entries(categories)) {
            html += `<div class="shortcut-category">
                <h4>${category}</h4>
                <div class="shortcut-list">`;
            
            for (const key of keys) {
                const shortcut = this.shortcuts.get(key.toLowerCase());
                if (shortcut) {
                    html += `
                        <div class="shortcut-item">
                            <kbd>${shortcut.key}</kbd>
                            <span>${shortcut.description}</span>
                        </div>
                    `;
                }
            }
            
            html += '</div></div>';
        }
        
        html += '</div>';
        
        frappe.msgprint({
            title: __('Keyboard Shortcuts'),
            indicator: 'blue',
            message: html
        });
    }
    
    enable() {
        this.enabled = true;
    }
    
    disable() {
        this.enabled = false;
    }
}


/**
 * Quick Keys / Favorites Manager
 * Allows users to set up quick access keys for frequently used items
 */
class QuickKeysManager {
    constructor(posTerminal) {
        this.pos = posTerminal;
        this.quickKeys = [];
        this.maxKeys = 12;
        this.storageKey = 'pos_quick_keys';
        this.loadQuickKeys();
    }
    
    loadQuickKeys() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this.quickKeys = stored ? JSON.parse(stored) : [];
        } catch (e) {
            this.quickKeys = [];
        }
    }
    
    saveQuickKeys() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.quickKeys));
    }
    
    addQuickKey(item, position = null) {
        const quickKey = {
            item_code: item.item_code,
            item_name: item.item_name,
            image: item.image,
            price: item.price,
            position: position ?? this.quickKeys.length
        };
        
        // Check if already exists
        const existingIndex = this.quickKeys.findIndex(qk => qk.item_code === item.item_code);
        if (existingIndex >= 0) {
            this.quickKeys[existingIndex] = quickKey;
        } else if (this.quickKeys.length < this.maxKeys) {
            this.quickKeys.push(quickKey);
        } else {
            frappe.msgprint(__('Maximum quick keys reached. Remove one first.'));
            return false;
        }
        
        this.saveQuickKeys();
        this.render();
        return true;
    }
    
    removeQuickKey(itemCode) {
        this.quickKeys = this.quickKeys.filter(qk => qk.item_code !== itemCode);
        this.saveQuickKeys();
        this.render();
    }
    
    clearQuickKeys() {
        this.quickKeys = [];
        this.saveQuickKeys();
        this.render();
    }
    
    render() {
        const $container = $('#quick-keys-container');
        if (!$container.length) return;
        
        if (this.quickKeys.length === 0) {
            $container.html(`
                <div class="quick-keys-empty">
                    <p>${__('No quick keys set')}</p>
                    <small>${__('Right-click a product to add')}</small>
                </div>
            `);
            return;
        }
        
        $container.html(`
            <div class="quick-keys-grid">
                ${this.quickKeys.map((qk, idx) => `
                    <div class="quick-key-btn" data-item-code="${qk.item_code}" data-index="${idx}">
                        ${qk.image 
                            ? `<img src="${qk.image}" alt="${qk.item_name}" loading="lazy">` 
                            : `<div class="quick-key-initial">${qk.item_name.charAt(0)}</div>`
                        }
                        <div class="quick-key-name">${qk.item_name}</div>
                        <div class="quick-key-number">${idx + 1}</div>
                        <button class="quick-key-remove" data-item-code="${qk.item_code}">×</button>
                    </div>
                `).join('')}
            </div>
        `);
        
        // Bind click events
        $container.find('.quick-key-btn').on('click', (e) => {
            if ($(e.target).hasClass('quick-key-remove')) return;
            const itemCode = $(e.currentTarget).data('item-code');
            this.pos.addToCart(itemCode);
        });
        
        $container.find('.quick-key-remove').on('click', (e) => {
            e.stopPropagation();
            const itemCode = $(e.currentTarget).data('item-code');
            this.removeQuickKey(itemCode);
        });
    }
    
    setupContextMenu() {
        // Add context menu for products to add to quick keys
        $(document).on('contextmenu', '.pos-product-card', (e) => {
            e.preventDefault();
            
            const itemCode = $(e.currentTarget).data('item-code');
            const item = this.pos.state.items.find(i => i.item_code === itemCode);
            
            if (!item) return;
            
            // Show context menu
            this.showContextMenu(e.pageX, e.pageY, item);
        });
    }
    
    showContextMenu(x, y, item) {
        // Remove existing menu
        $('.pos-context-menu').remove();
        
        const isQuickKey = this.quickKeys.some(qk => qk.item_code === item.item_code);
        
        const menuHtml = `
            <div class="pos-context-menu" style="position: fixed; left: ${x}px; top: ${y}px; z-index: 9999;">
                <div class="context-menu-item" data-action="add-to-cart">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    ${__('Add to Cart')}
                </div>
                ${isQuickKey 
                    ? `<div class="context-menu-item context-menu-danger" data-action="remove-quick-key">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        ${__('Remove from Quick Keys')}
                       </div>`
                    : `<div class="context-menu-item" data-action="add-quick-key">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        ${__('Add to Quick Keys')}
                       </div>`
                }
            </div>
        `;
        
        $('body').append(menuHtml);
        
        // Bind actions
        $('.pos-context-menu .context-menu-item').on('click', (e) => {
            const action = $(e.currentTarget).data('action');
            
            switch (action) {
                case 'add-to-cart':
                    this.pos.addToCart(item.item_code);
                    break;
                case 'add-quick-key':
                    this.addQuickKey(item);
                    frappe.show_alert({ message: __('Added to Quick Keys'), indicator: 'green' });
                    break;
                case 'remove-quick-key':
                    this.removeQuickKey(item.item_code);
                    frappe.show_alert({ message: __('Removed from Quick Keys'), indicator: 'orange' });
                    break;
            }
            
            $('.pos-context-menu').remove();
        });
        
        // Close menu on click outside
        $(document).one('click', () => {
            $('.pos-context-menu').remove();
        });
    }
    
    // Keyboard shortcuts for quick keys (1-9, 0)
    setupKeyboardShortcuts(shortcutsManager) {
        for (let i = 1; i <= 9; i++) {
            shortcutsManager.register(`Alt+${i}`, `Quick Key ${i}`, () => {
                const quickKey = this.quickKeys[i - 1];
                if (quickKey) {
                    this.pos.addToCart(quickKey.item_code);
                }
            });
        }
        
        shortcutsManager.register('Alt+0', 'Quick Key 10', () => {
            const quickKey = this.quickKeys[9];
            if (quickKey) {
                this.pos.addToCart(quickKey.item_code);
            }
        });
    }
}


// CSS for keyboard shortcuts and quick keys
const keyboardStyles = `
<style>
.shortcuts-help {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.shortcut-category h4 {
    color: var(--pos-primary);
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 600;
}

.shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.shortcut-item {
    display: flex;
    align-items: center;
    gap: 12px;
}

.shortcut-item kbd {
    background: var(--pos-surface-hover);
    border: 1px solid var(--pos-border);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    font-family: var(--pos-font-mono);
    min-width: 80px;
    text-align: center;
}

.shortcut-item span {
    font-size: 13px;
    color: var(--pos-text-secondary);
}

/* Quick Keys */
.quick-keys-container {
    padding: 12px;
    background: var(--pos-surface);
    border-radius: var(--pos-radius);
    margin-bottom: 16px;
}

.quick-keys-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.quick-keys-header h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--pos-text);
    margin: 0;
}

.quick-keys-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
}

.quick-key-btn {
    position: relative;
    background: var(--pos-surface-hover);
    border: 1px solid var(--pos-border);
    border-radius: var(--pos-radius);
    padding: 8px;
    cursor: pointer;
    transition: var(--pos-transition);
    text-align: center;
}

.quick-key-btn:hover {
    border-color: var(--pos-primary);
    transform: translateY(-2px);
}

.quick-key-btn img {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 4px;
    margin-bottom: 4px;
}

.quick-key-initial {
    width: 40px;
    height: 40px;
    background: var(--pos-primary-bg);
    color: var(--pos-primary);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 18px;
    margin: 0 auto 4px;
}

.quick-key-name {
    font-size: 11px;
    color: var(--pos-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.quick-key-number {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 16px;
    height: 16px;
    background: var(--pos-primary);
    color: white;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.quick-key-remove {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    background: var(--pos-danger);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: var(--pos-transition);
}

.quick-key-btn:hover .quick-key-remove {
    opacity: 1;
}

.quick-keys-empty {
    text-align: center;
    padding: 20px;
    color: var(--pos-text-muted);
}

.quick-keys-empty p {
    margin: 0 0 4px;
    font-size: 13px;
}

.quick-keys-empty small {
    font-size: 11px;
}

/* Context Menu */
.pos-context-menu {
    background: var(--pos-surface);
    border: 1px solid var(--pos-border);
    border-radius: var(--pos-radius);
    box-shadow: var(--pos-shadow-lg);
    min-width: 180px;
    padding: 4px;
}

.context-menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    font-size: 13px;
    color: var(--pos-text);
    cursor: pointer;
    border-radius: var(--pos-radius-sm);
    transition: var(--pos-transition-fast);
}

.context-menu-item:hover {
    background: var(--pos-surface-hover);
}

.context-menu-item svg {
    color: var(--pos-text-secondary);
}

.context-menu-danger {
    color: var(--pos-danger);
}

.context-menu-danger svg {
    color: var(--pos-danger);
}

/* Cart item selected state */
.pos-cart-item.selected {
    background: var(--pos-primary-bg);
    border-color: var(--pos-primary);
}
</style>
`;

// Inject styles
if (!document.getElementById('keyboard-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'keyboard-styles';
    styleEl.innerHTML = keyboardStyles;
    document.head.appendChild(styleEl.firstChild);
}

// Export
window.KeyboardShortcutsManager = KeyboardShortcutsManager;
window.QuickKeysManager = QuickKeysManager;
