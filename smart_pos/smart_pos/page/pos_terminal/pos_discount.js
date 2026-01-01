/**
 * Smart POS - Discount System
 * Copyright (c) 2026, Ahmad
 * Comprehensive discount management for POS
 */

class DiscountManager {
    constructor(posTerminal) {
        this.pos = posTerminal;
        this.discountTypes = ['percentage', 'amount'];
        this.appliedDiscounts = [];
    }
    
    /**
     * Show discount modal
     */
    showDiscountModal(targetType = 'cart') {
        const cart = this.pos.state.cart;
        
        if (cart.length === 0) {
            frappe.msgprint(__('Cart is empty'));
            return;
        }
        
        const subtotal = cart.reduce((sum, item) => sum + item.amount, 0);
        
        const modalHtml = `
            <div class="pos-modal" id="discount-modal">
                <div class="pos-modal-content" style="max-width: 500px;">
                    <div class="pos-modal-header">
                        <h2>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="19" y1="5" x2="5" y2="19"/>
                                <circle cx="6.5" cy="6.5" r="2.5"/>
                                <circle cx="17.5" cy="17.5" r="2.5"/>
                            </svg>
                            ${__('Apply Discount')}
                        </h2>
                    </div>
                    <div class="pos-modal-body">
                        <div class="discount-tabs">
                            <button class="discount-tab active" data-target="cart">${__('Cart Discount')}</button>
                            <button class="discount-tab" data-target="item">${__('Item Discount')}</button>
                        </div>
                        
                        <!-- Cart Discount -->
                        <div class="discount-panel active" id="cart-discount-panel">
                            <div class="discount-summary">
                                <span>${__('Cart Subtotal')}:</span>
                                <strong>${frappe.format(subtotal, {fieldtype: 'Currency'})}</strong>
                            </div>
                            
                            <div class="discount-type-selector">
                                <button class="discount-type-btn active" data-type="percentage">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="19" y1="5" x2="5" y2="19"/>
                                        <circle cx="6.5" cy="6.5" r="2.5"/>
                                        <circle cx="17.5" cy="17.5" r="2.5"/>
                                    </svg>
                                    ${__('Percentage')}
                                </button>
                                <button class="discount-type-btn" data-type="amount">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="12" y1="1" x2="12" y2="23"/>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                    </svg>
                                    ${__('Amount')}
                                </button>
                            </div>
                            
                            <div class="discount-input-group">
                                <input type="number" id="cart-discount-value" class="form-control" 
                                       placeholder="${__('Enter discount')}" min="0" step="0.01">
                                <span class="discount-suffix" id="cart-discount-suffix">%</span>
                            </div>
                            
                            <div class="quick-discount-btns">
                                <button class="quick-discount-btn" data-value="5">5%</button>
                                <button class="quick-discount-btn" data-value="10">10%</button>
                                <button class="quick-discount-btn" data-value="15">15%</button>
                                <button class="quick-discount-btn" data-value="20">20%</button>
                                <button class="quick-discount-btn" data-value="25">25%</button>
                            </div>
                            
                            <div class="discount-preview">
                                <div class="discount-preview-row">
                                    <span>${__('Discount Amount')}:</span>
                                    <span id="cart-discount-amount">-</span>
                                </div>
                                <div class="discount-preview-row highlight">
                                    <span>${__('New Total')}:</span>
                                    <span id="cart-new-total">${frappe.format(subtotal, {fieldtype: 'Currency'})}</span>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label>${__('Reason (Optional)')}</label>
                                <input type="text" id="cart-discount-reason" class="form-control" 
                                       placeholder="${__('Enter reason for discount')}">
                            </div>
                        </div>
                        
                        <!-- Item Discount -->
                        <div class="discount-panel" id="item-discount-panel">
                            <div class="form-group">
                                <label>${__('Select Item')}</label>
                                <select id="discount-item-select" class="form-control">
                                    ${cart.map((item, idx) => `
                                        <option value="${idx}">${item.item_name} (${frappe.format(item.rate, {fieldtype: 'Currency'})} × ${item.qty})</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="discount-type-selector">
                                <button class="discount-type-btn item-type active" data-type="percentage">
                                    ${__('Percentage')}
                                </button>
                                <button class="discount-type-btn item-type" data-type="amount">
                                    ${__('Amount')}
                                </button>
                            </div>
                            
                            <div class="discount-input-group">
                                <input type="number" id="item-discount-value" class="form-control" 
                                       placeholder="${__('Enter discount')}" min="0" step="0.01">
                                <span class="discount-suffix" id="item-discount-suffix">%</span>
                            </div>
                            
                            <div class="discount-preview">
                                <div class="discount-preview-row">
                                    <span>${__('Original Amount')}:</span>
                                    <span id="item-original-amount">-</span>
                                </div>
                                <div class="discount-preview-row highlight">
                                    <span>${__('After Discount')}:</span>
                                    <span id="item-after-discount">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="pos-modal-footer">
                        <button class="btn btn-secondary" id="cancel-discount">${__('Cancel')}</button>
                        <button class="btn btn-danger" id="clear-discounts">${__('Clear All')}</button>
                        <button class="btn btn-primary" id="apply-discount">${__('Apply')}</button>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(modalHtml);
        
        // Initialize state
        this.discountState = {
            type: 'cart',
            discountType: 'percentage',
            value: 0,
            subtotal: subtotal
        };
        
        this.bindDiscountModalEvents();
        this.updateItemPreview();
    }
    
    bindDiscountModalEvents() {
        const self = this;
        
        // Tab switching
        $('.discount-tab').on('click', function() {
            const target = $(this).data('target');
            $('.discount-tab').removeClass('active');
            $(this).addClass('active');
            
            $('.discount-panel').removeClass('active');
            $(`#${target}-discount-panel`).addClass('active');
            
            self.discountState.type = target;
        });
        
        // Discount type selection (cart)
        $('.discount-type-btn:not(.item-type)').on('click', function() {
            $('.discount-type-btn:not(.item-type)').removeClass('active');
            $(this).addClass('active');
            
            const type = $(this).data('type');
            self.discountState.discountType = type;
            $('#cart-discount-suffix').text(type === 'percentage' ? '%' : '');
            self.updateCartPreview();
        });
        
        // Discount type selection (item)
        $('.discount-type-btn.item-type').on('click', function() {
            $('.discount-type-btn.item-type').removeClass('active');
            $(this).addClass('active');
            
            const type = $(this).data('type');
            $('#item-discount-suffix').text(type === 'percentage' ? '%' : '');
            self.updateItemPreview();
        });
        
        // Quick discount buttons
        $('.quick-discount-btn').on('click', function() {
            const value = $(this).data('value');
            $('#cart-discount-value').val(value);
            self.discountState.discountType = 'percentage';
            $('.discount-type-btn:not(.item-type)').removeClass('active');
            $('.discount-type-btn[data-type="percentage"]').addClass('active');
            $('#cart-discount-suffix').text('%');
            self.updateCartPreview();
        });
        
        // Value input change
        $('#cart-discount-value').on('input', function() {
            self.updateCartPreview();
        });
        
        $('#item-discount-value').on('input', function() {
            self.updateItemPreview();
        });
        
        $('#discount-item-select').on('change', function() {
            self.updateItemPreview();
        });
        
        // Apply discount
        $('#apply-discount').on('click', () => this.applyDiscount());
        
        // Clear discounts
        $('#clear-discounts').on('click', () => this.clearAllDiscounts());
        
        // Cancel
        $('#cancel-discount').on('click', () => $('#discount-modal').remove());
        
        // Close on outside click
        $('#discount-modal').on('click', (e) => {
            if (e.target.id === 'discount-modal') {
                $('#discount-modal').remove();
            }
        });
    }
    
    updateCartPreview() {
        const value = parseFloat($('#cart-discount-value').val()) || 0;
        const subtotal = this.discountState.subtotal;
        const type = this.discountState.discountType;
        
        let discountAmount = 0;
        if (type === 'percentage') {
            discountAmount = (subtotal * value) / 100;
        } else {
            discountAmount = value;
        }
        
        // Ensure discount doesn't exceed subtotal
        discountAmount = Math.min(discountAmount, subtotal);
        
        const newTotal = subtotal - discountAmount;
        
        $('#cart-discount-amount').text('-' + frappe.format(discountAmount, {fieldtype: 'Currency'}));
        $('#cart-new-total').text(frappe.format(newTotal, {fieldtype: 'Currency'}));
    }
    
    updateItemPreview() {
        const itemIndex = parseInt($('#discount-item-select').val());
        const item = this.pos.state.cart[itemIndex];
        
        if (!item) return;
        
        const originalAmount = item.rate * item.qty;
        const value = parseFloat($('#item-discount-value').val()) || 0;
        const type = $('.discount-type-btn.item-type.active').data('type');
        
        let discountAmount = 0;
        if (type === 'percentage') {
            discountAmount = (originalAmount * value) / 100;
        } else {
            discountAmount = value;
        }
        
        discountAmount = Math.min(discountAmount, originalAmount);
        const afterDiscount = originalAmount - discountAmount;
        
        $('#item-original-amount').text(frappe.format(originalAmount, {fieldtype: 'Currency'}));
        $('#item-after-discount').text(frappe.format(afterDiscount, {fieldtype: 'Currency'}));
    }
    
    applyDiscount() {
        const type = this.discountState.type;
        
        if (type === 'cart') {
            this.applyCartDiscount();
        } else {
            this.applyItemDiscount();
        }
        
        $('#discount-modal').remove();
    }
    
    applyCartDiscount() {
        const value = parseFloat($('#cart-discount-value').val()) || 0;
        const discountType = this.discountState.discountType;
        const reason = $('#cart-discount-reason').val();
        const subtotal = this.discountState.subtotal;
        
        if (value <= 0) {
            frappe.msgprint(__('Please enter a valid discount value'));
            return;
        }
        
        let discountPercentage = 0;
        let discountAmount = 0;
        
        if (discountType === 'percentage') {
            discountPercentage = Math.min(value, 100);
            discountAmount = (subtotal * discountPercentage) / 100;
        } else {
            discountAmount = Math.min(value, subtotal);
            discountPercentage = (discountAmount / subtotal) * 100;
        }
        
        // Store cart discount
        this.pos.state.cartDiscount = {
            type: discountType,
            value: value,
            percentage: discountPercentage,
            amount: discountAmount,
            reason: reason
        };
        
        // Update cart display
        this.pos.renderCart();
        this.updateCartSummaryWithDiscount();
        
        frappe.show_alert({
            message: __('Cart discount applied: ') + frappe.format(discountAmount, {fieldtype: 'Currency'}),
            indicator: 'green'
        });
    }
    
    applyItemDiscount() {
        const itemIndex = parseInt($('#discount-item-select').val());
        const value = parseFloat($('#item-discount-value').val()) || 0;
        const discountType = $('.discount-type-btn.item-type.active').data('type');
        
        if (value <= 0) {
            frappe.msgprint(__('Please enter a valid discount value'));
            return;
        }
        
        const item = this.pos.state.cart[itemIndex];
        if (!item) return;
        
        if (discountType === 'percentage') {
            item.discount_percentage = Math.min(value, 100);
            item.discount_amount = item.rate * item.qty * (item.discount_percentage / 100);
        } else {
            item.discount_amount = Math.min(value, item.rate * item.qty);
            item.discount_percentage = (item.discount_amount / (item.rate * item.qty)) * 100;
        }
        
        item.amount = (item.rate * item.qty) - item.discount_amount;
        
        this.pos.renderCart();
        
        frappe.show_alert({
            message: __('Item discount applied'),
            indicator: 'green'
        });
    }
    
    clearAllDiscounts() {
        // Clear cart discount
        this.pos.state.cartDiscount = null;
        
        // Clear item discounts
        this.pos.state.cart.forEach(item => {
            item.discount_percentage = 0;
            item.discount_amount = 0;
            item.amount = item.rate * item.qty;
        });
        
        this.pos.renderCart();
        $('#discount-modal').remove();
        
        frappe.show_alert({
            message: __('All discounts cleared'),
            indicator: 'orange'
        });
    }
    
    updateCartSummaryWithDiscount() {
        const subtotal = this.pos.state.cart.reduce((sum, item) => sum + (item.rate * item.qty), 0);
        const itemDiscounts = this.pos.state.cart.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
        const cartDiscount = this.pos.state.cartDiscount?.amount || 0;
        const totalDiscount = itemDiscounts + cartDiscount;
        
        const tax = 0; // TODO: Calculate tax
        const total = subtotal - totalDiscount + tax;
        
        $('#cart-subtotal').html(frappe.format(subtotal, {fieldtype: 'Currency'}));
        $('#cart-discount').html('-' + frappe.format(totalDiscount, {fieldtype: 'Currency'}));
        $('#cart-tax').html(frappe.format(tax, {fieldtype: 'Currency'}));
        $('#cart-total').html(frappe.format(total, {fieldtype: 'Currency'}));
        $('#pay-amount').html(frappe.format(total, {fieldtype: 'Currency'}));
        
        $('#discount-row').toggle(totalDiscount > 0);
        $('#tax-row').toggle(tax > 0);
    }
    
    getCartTotal() {
        const subtotal = this.pos.state.cart.reduce((sum, item) => sum + item.amount, 0);
        const cartDiscount = this.pos.state.cartDiscount?.amount || 0;
        return subtotal - cartDiscount;
    }
    
    getDiscountSummary() {
        const itemDiscounts = this.pos.state.cart.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
        const cartDiscount = this.pos.state.cartDiscount?.amount || 0;
        
        return {
            item_discounts: itemDiscounts,
            cart_discount: cartDiscount,
            total_discount: itemDiscounts + cartDiscount,
            cart_discount_details: this.pos.state.cartDiscount
        };
    }
}


// CSS for Discount System
const discountStyles = `
<style>
.discount-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
}

.discount-tab {
    flex: 1;
    padding: 10px 16px;
    background: var(--pos-surface-hover);
    border: 1px solid var(--pos-border);
    border-radius: var(--pos-radius);
    font-size: 13px;
    font-weight: 500;
    color: var(--pos-text-secondary);
    cursor: pointer;
    transition: var(--pos-transition);
}

.discount-tab:hover {
    border-color: var(--pos-primary);
}

.discount-tab.active {
    background: var(--pos-primary-bg);
    border-color: var(--pos-primary);
    color: var(--pos-primary);
}

.discount-panel {
    display: none;
}

.discount-panel.active {
    display: block;
}

.discount-summary {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--pos-surface-hover);
    border-radius: var(--pos-radius);
    margin-bottom: 16px;
}

.discount-summary span {
    color: var(--pos-text-secondary);
}

.discount-summary strong {
    color: var(--pos-text);
    font-size: 16px;
}

.discount-type-selector {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}

.discount-type-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: var(--pos-surface);
    border: 1px solid var(--pos-border);
    border-radius: var(--pos-radius);
    font-size: 13px;
    color: var(--pos-text-secondary);
    cursor: pointer;
    transition: var(--pos-transition);
}

.discount-type-btn:hover {
    border-color: var(--pos-primary);
}

.discount-type-btn.active {
    background: var(--pos-primary);
    border-color: var(--pos-primary);
    color: white;
}

.discount-type-btn.active svg {
    stroke: white;
}

.discount-input-group {
    position: relative;
    margin-bottom: 16px;
}

.discount-input-group input {
    padding-right: 40px;
    font-size: 18px;
    font-weight: 500;
    text-align: center;
}

.discount-suffix {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--pos-text-secondary);
    font-size: 16px;
}

.quick-discount-btns {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}

.quick-discount-btn {
    flex: 1;
    padding: 10px;
    background: var(--pos-surface-hover);
    border: 1px solid var(--pos-border);
    border-radius: var(--pos-radius);
    font-size: 13px;
    font-weight: 500;
    color: var(--pos-text);
    cursor: pointer;
    transition: var(--pos-transition);
}

.quick-discount-btn:hover {
    background: var(--pos-primary-bg);
    border-color: var(--pos-primary);
    color: var(--pos-primary);
}

.discount-preview {
    background: var(--pos-surface-hover);
    border-radius: var(--pos-radius);
    padding: 12px 16px;
    margin-bottom: 16px;
}

.discount-preview-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 13px;
    color: var(--pos-text-secondary);
}

.discount-preview-row.highlight {
    border-top: 1px solid var(--pos-border);
    margin-top: 6px;
    padding-top: 12px;
    font-weight: 600;
    color: var(--pos-text);
}

.discount-preview-row.highlight span:last-child {
    color: var(--pos-success);
    font-size: 16px;
}

/* Cart discount indicator */
.cart-discount-indicator {
    background: var(--pos-warning-bg);
    color: var(--pos-warning);
    padding: 8px 12px;
    border-radius: var(--pos-radius);
    margin-bottom: 12px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.cart-discount-indicator button {
    background: none;
    border: none;
    color: var(--pos-danger);
    cursor: pointer;
    padding: 4px;
}
</style>
`;

// Inject styles
if (!document.getElementById('discount-styles')) {
    const styleEl = document.createElement('div');
    styleEl.id = 'discount-styles';
    styleEl.innerHTML = discountStyles;
    document.head.appendChild(styleEl.firstChild);
}

// Export
window.DiscountManager = DiscountManager;
