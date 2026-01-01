/**
 * Smart POS - Hardware Integration
 * Handles barcode scanners, receipt printers, and cash drawers
 * Copyright (c) 2026, Ahmad
 */

class POSHardware {
    constructor() {
        this.barcodeBuffer = '';
        this.barcodeTimeout = null;
        this.barcodeDelay = 50; // ms between keystrokes to detect barcode
        this.listeners = {};
        this.printerSettings = {
            type: 'browser', // browser, network, usb
            ip: '',
            port: 9100
        };
    }

    /**
     * Initialize hardware integrations
     */
    init(settings = {}) {
        if (settings.barcodeDelay) {
            this.barcodeDelay = settings.barcodeDelay;
        }
        if (settings.printer) {
            Object.assign(this.printerSettings, settings.printer);
        }

        // Initialize barcode scanner listener
        this.initBarcodeScanner();
        
        console.log('✅ Hardware integration initialized');
    }

    // =============================================================================
    // Barcode Scanner
    // =============================================================================

    /**
     * Initialize barcode scanner (keyboard emulation mode)
     */
    initBarcodeScanner() {
        document.addEventListener('keypress', (e) => this.handleBarcodeInput(e));
    }

    /**
     * Handle barcode input (keyboard events)
     */
    handleBarcodeInput(event) {
        // Ignore if focused on input field (unless it's the search field)
        const activeElement = document.activeElement;
        const isSearchField = activeElement?.classList?.contains('pos-search-input');
        
        if (activeElement?.tagName === 'INPUT' && !isSearchField) {
            return;
        }

        // Clear timeout
        if (this.barcodeTimeout) {
            clearTimeout(this.barcodeTimeout);
        }

        // Handle Enter key - submit barcode
        if (event.key === 'Enter' && this.barcodeBuffer.length > 0) {
            event.preventDefault();
            const barcode = this.barcodeBuffer;
            this.barcodeBuffer = '';
            this.emit('barcodeScan', barcode);
            console.log('📊 Barcode scanned:', barcode);
            return;
        }

        // Add character to buffer
        if (event.key.length === 1) {
            this.barcodeBuffer += event.key;
        }

        // Set timeout to clear buffer (for manual typing detection)
        this.barcodeTimeout = setTimeout(() => {
            // If buffer has content but no Enter, it might be manual typing
            if (this.barcodeBuffer.length > 3 && this.barcodeBuffer.length < 20) {
                // Likely a barcode scan without Enter
                const barcode = this.barcodeBuffer;
                this.barcodeBuffer = '';
                this.emit('barcodeScan', barcode);
            } else {
                this.barcodeBuffer = '';
            }
        }, this.barcodeDelay);
    }

    /**
     * Manually process barcode (for camera/image scanners)
     */
    processBarcode(barcode) {
        if (barcode && barcode.length > 0) {
            this.emit('barcodeScan', barcode);
        }
    }

    // =============================================================================
    // Receipt Printing
    // =============================================================================

    /**
     * Print receipt
     */
    async printReceipt(receiptData) {
        switch (this.printerSettings.type) {
            case 'browser':
                return this.printViaBrowser(receiptData);
            case 'network':
                return this.printViaNetwork(receiptData);
            case 'escpos':
                return this.printViaESCPOS(receiptData);
            default:
                return this.printViaBrowser(receiptData);
        }
    }

    /**
     * Print via browser print dialog
     */
    printViaBrowser(receiptData) {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(this.generateReceiptHTML(receiptData));
        printWindow.document.close();
        
        printWindow.onload = function() {
            printWindow.print();
            // Close after print (optional)
            // printWindow.close();
        };
        
        return Promise.resolve({ success: true, method: 'browser' });
    }

    /**
     * Generate receipt HTML
     */
    generateReceiptHTML(data) {
        const items = data.items.map(item => `
            <tr>
                <td style="text-align: left;">${item.item_name}</td>
                <td style="text-align: center;">${item.qty}</td>
                <td style="text-align: right;">${this.formatCurrency(item.rate)}</td>
                <td style="text-align: right;">${this.formatCurrency(item.amount)}</td>
            </tr>
        `).join('');

        const payments = data.payments.map(p => `
            <tr>
                <td>${p.mode}</td>
                <td style="text-align: right;">${this.formatCurrency(p.amount)}</td>
            </tr>
        `).join('');

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt</title>
    <style>
        @page { size: 80mm auto; margin: 0; }
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0;
            padding: 5mm;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .company-name { font-size: 16px; font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 3px 0; }
        .total-row { font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        .barcode { text-align: center; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">${data.company_name}</div>
        ${data.company_address ? `<div>${data.company_address}</div>` : ''}
        ${data.company_phone ? `<div>Tel: ${data.company_phone}</div>` : ''}
        ${data.tax_id ? `<div>Tax ID: ${data.tax_id}</div>` : ''}
    </div>
    
    <div class="divider"></div>
    
    <div>
        <strong>Invoice:</strong> ${data.invoice_name}<br>
        <strong>Date:</strong> ${data.posting_date} ${data.posting_time || ''}<br>
        ${data.customer_name ? `<strong>Customer:</strong> ${data.customer_name}<br>` : ''}
        <strong>Cashier:</strong> ${data.cashier || 'POS'}
    </div>
    
    <div class="divider"></div>
    
    <table>
        <thead>
            <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${items}
        </tbody>
    </table>
    
    <div class="divider"></div>
    
    <table>
        <tr>
            <td>Subtotal</td>
            <td style="text-align: right;">${this.formatCurrency(data.subtotal)}</td>
        </tr>
        ${data.tax_amount > 0 ? `
        <tr>
            <td>Tax</td>
            <td style="text-align: right;">${this.formatCurrency(data.tax_amount)}</td>
        </tr>
        ` : ''}
        ${data.discount > 0 ? `
        <tr>
            <td>Discount</td>
            <td style="text-align: right;">-${this.formatCurrency(data.discount)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
            <td>TOTAL</td>
            <td style="text-align: right;">${this.formatCurrency(data.grand_total)}</td>
        </tr>
    </table>
    
    <div class="divider"></div>
    
    <table>
        <thead>
            <tr>
                <th style="text-align: left;">Payment Method</th>
                <th style="text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${payments}
        </tbody>
    </table>
    
    <div class="divider"></div>
    
    <div class="footer">
        <p>Thank you for your purchase!</p>
        <p>Please keep this receipt for your records.</p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Print via network printer (ESC/POS over TCP)
     */
    async printViaNetwork(receiptData) {
        // This requires a print server or WebSocket bridge
        // For production, use a local print service
        try {
            const escposData = this.generateESCPOS(receiptData);
            
            const response = await fetch('/api/method/smart_pos.smart_pos.api.pos_api.print_to_network', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ip: this.printerSettings.ip,
                    port: this.printerSettings.port,
                    data: escposData
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Network print error:', error);
            // Fallback to browser print
            return this.printViaBrowser(receiptData);
        }
    }

    /**
     * Generate ESC/POS commands
     */
    generateESCPOS(data) {
        const ESC = '\x1B';
        const GS = '\x1D';
        
        let commands = '';
        
        // Initialize printer
        commands += ESC + '@';
        
        // Center align
        commands += ESC + 'a' + '\x01';
        
        // Double height for company name
        commands += GS + '!' + '\x10';
        commands += data.company_name + '\n';
        
        // Normal size
        commands += GS + '!' + '\x00';
        
        if (data.company_address) commands += data.company_address + '\n';
        if (data.company_phone) commands += 'Tel: ' + data.company_phone + '\n';
        if (data.tax_id) commands += 'Tax ID: ' + data.tax_id + '\n';
        
        // Divider
        commands += '--------------------------------\n';
        
        // Left align
        commands += ESC + 'a' + '\x00';
        
        commands += 'Invoice: ' + data.invoice_name + '\n';
        commands += 'Date: ' + data.posting_date + '\n';
        if (data.customer_name) commands += 'Customer: ' + data.customer_name + '\n';
        
        commands += '--------------------------------\n';
        
        // Items
        data.items.forEach(item => {
            commands += item.item_name.substring(0, 20).padEnd(20);
            commands += item.qty.toString().padStart(4);
            commands += this.formatCurrency(item.amount).padStart(8) + '\n';
        });
        
        commands += '--------------------------------\n';
        
        // Totals
        commands += 'Subtotal:'.padEnd(24) + this.formatCurrency(data.subtotal).padStart(8) + '\n';
        if (data.tax_amount > 0) {
            commands += 'Tax:'.padEnd(24) + this.formatCurrency(data.tax_amount).padStart(8) + '\n';
        }
        
        // Bold for total
        commands += ESC + 'E' + '\x01';
        commands += 'TOTAL:'.padEnd(24) + this.formatCurrency(data.grand_total).padStart(8) + '\n';
        commands += ESC + 'E' + '\x00';
        
        commands += '--------------------------------\n';
        
        // Center align for footer
        commands += ESC + 'a' + '\x01';
        commands += '\nThank you for your purchase!\n\n';
        
        // Cut paper
        commands += GS + 'V' + '\x00';
        
        // Open cash drawer
        commands += ESC + 'p' + '\x00' + '\x19' + '\xFA';
        
        return commands;
    }

    /**
     * Print via USB (requires WebUSB API)
     */
    async printViaUSB(receiptData) {
        if (!navigator.usb) {
            console.warn('WebUSB not supported, falling back to browser print');
            return this.printViaBrowser(receiptData);
        }

        try {
            // Request USB device
            const device = await navigator.usb.requestDevice({
                filters: [
                    { vendorId: 0x04b8 }, // Epson
                    { vendorId: 0x0519 }, // Star Micronics
                    { vendorId: 0x0483 }  // STMicroelectronics (Generic)
                ]
            });

            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);

            const escposData = this.generateESCPOS(receiptData);
            const encoder = new TextEncoder();
            const data = encoder.encode(escposData);

            await device.transferOut(1, data);
            await device.close();

            return { success: true, method: 'usb' };
        } catch (error) {
            console.error('USB print error:', error);
            return this.printViaBrowser(receiptData);
        }
    }

    // =============================================================================
    // Cash Drawer
    // =============================================================================

    /**
     * Open cash drawer
     */
    async openCashDrawer() {
        if (this.printerSettings.type === 'network') {
            // Send open drawer command via network printer
            const ESC = '\x1B';
            const command = ESC + 'p' + '\x00' + '\x19' + '\xFA';
            
            try {
                await fetch('/api/method/smart_pos.smart_pos.api.pos_api.send_to_printer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ip: this.printerSettings.ip,
                        port: this.printerSettings.port,
                        data: command
                    })
                });
                return { success: true };
            } catch (error) {
                console.error('Cash drawer error:', error);
                return { success: false, error: error.message };
            }
        }
        
        console.log('💰 Cash drawer command sent (simulated)');
        return { success: true, simulated: true };
    }

    // =============================================================================
    // Event System
    // =============================================================================

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // =============================================================================
    // Utility
    // =============================================================================

    formatCurrency(amount) {
        return parseFloat(amount || 0).toFixed(2);
    }
}

// Export singleton instance
window.POSHardware = new POSHardware();
