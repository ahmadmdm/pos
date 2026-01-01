/**
 * Smart POS - Thermal Printer Support
 * Copyright (c) 2026, Ahmad
 * Support for ESC/POS thermal printers
 */

class ThermalPrinter {
    constructor(options = {}) {
        this.options = {
            printerType: 'network', // network, usb, bluetooth
            printerIp: options.printerIp || '192.168.1.100',
            printerPort: options.printerPort || 9100,
            paperWidth: options.paperWidth || 80, // mm
            encoding: options.encoding || 'UTF-8',
            ...options
        };
        
        this.connected = false;
        this.socket = null;
        this.printQueue = [];
        
        // ESC/POS Commands
        this.ESC = '\x1B';
        this.GS = '\x1D';
        this.COMMANDS = {
            INIT: '\x1B\x40',           // Initialize printer
            ALIGN_LEFT: '\x1B\x61\x00',
            ALIGN_CENTER: '\x1B\x61\x01',
            ALIGN_RIGHT: '\x1B\x61\x02',
            BOLD_ON: '\x1B\x45\x01',
            BOLD_OFF: '\x1B\x45\x00',
            DOUBLE_WIDTH: '\x1B\x21\x20',
            DOUBLE_HEIGHT: '\x1B\x21\x10',
            DOUBLE_SIZE: '\x1B\x21\x30',
            NORMAL_SIZE: '\x1B\x21\x00',
            UNDERLINE_ON: '\x1B\x2D\x01',
            UNDERLINE_OFF: '\x1B\x2D\x00',
            CUT_PAPER: '\x1D\x56\x00',   // Full cut
            CUT_PARTIAL: '\x1D\x56\x01', // Partial cut
            FEED_LINES: '\x1B\x64',      // Feed n lines
            OPEN_DRAWER: '\x1B\x70\x00\x19\xFA', // Open cash drawer
            BARCODE_HEIGHT: '\x1D\x68',
            BARCODE_WIDTH: '\x1D\x77',
            PRINT_BARCODE: '\x1D\x6B',
            QR_MODEL: '\x1D\x28\x6B\x04\x00\x31\x41',
            QR_SIZE: '\x1D\x28\x6B\x03\x00\x31\x43',
            QR_ERROR: '\x1D\x28\x6B\x03\x00\x31\x45',
            QR_STORE: '\x1D\x28\x6B',
            QR_PRINT: '\x1D\x28\x6B\x03\x00\x31\x51\x30'
        };
    }
    
    /**
     * Connect to printer
     */
    async connect() {
        if (this.options.printerType === 'network') {
            return this.connectNetwork();
        } else if (this.options.printerType === 'usb') {
            return this.connectUSB();
        } else if (this.options.printerType === 'bluetooth') {
            return this.connectBluetooth();
        }
    }
    
    async connectNetwork() {
        // For web, we'll use a local print server or WebSocket bridge
        // This is a simplified implementation
        try {
            // Check if we can reach the printer through a print server
            const response = await fetch('/api/method/smart_pos.smart_pos.api.pos_api.check_printer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': frappe.csrf_token
                },
                body: JSON.stringify({
                    printer_ip: this.options.printerIp,
                    printer_port: this.options.printerPort
                })
            });
            
            const result = await response.json();
            this.connected = result.message?.connected || false;
            return this.connected;
        } catch (e) {
            console.error('Printer connection error:', e);
            this.connected = false;
            return false;
        }
    }
    
    async connectUSB() {
        // USB printing through WebUSB API
        if (!navigator.usb) {
            console.warn('WebUSB not supported');
            return false;
        }
        
        try {
            this.device = await navigator.usb.requestDevice({
                filters: [
                    { vendorId: 0x04b8 }, // Epson
                    { vendorId: 0x0416 }, // Winbond (common POS printers)
                ]
            });
            
            await this.device.open();
            await this.device.selectConfiguration(1);
            await this.device.claimInterface(0);
            
            this.connected = true;
            return true;
        } catch (e) {
            console.error('USB printer error:', e);
            return false;
        }
    }
    
    async connectBluetooth() {
        // Bluetooth printing through Web Bluetooth API
        if (!navigator.bluetooth) {
            console.warn('Web Bluetooth not supported');
            return false;
        }
        
        try {
            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'] // Serial Port Profile
            });
            
            const server = await this.device.gatt.connect();
            this.service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
            this.characteristic = await this.service.getCharacteristic('00002a00-0000-1000-8000-00805f9b34fb');
            
            this.connected = true;
            return true;
        } catch (e) {
            console.error('Bluetooth printer error:', e);
            return false;
        }
    }
    
    /**
     * Print receipt
     */
    async printReceipt(receiptData) {
        const commands = this.buildReceiptCommands(receiptData);
        return this.sendToPrinter(commands);
    }
    
    buildReceiptCommands(data) {
        let commands = '';
        
        // Initialize
        commands += this.COMMANDS.INIT;
        
        // Header
        commands += this.COMMANDS.ALIGN_CENTER;
        commands += this.COMMANDS.DOUBLE_SIZE;
        commands += (data.company_name || 'Smart POS') + '\n';
        commands += this.COMMANDS.NORMAL_SIZE;
        
        if (data.company_address) {
            commands += data.company_address + '\n';
        }
        if (data.company_phone) {
            commands += 'Tel: ' + data.company_phone + '\n';
        }
        if (data.company_tax_id) {
            commands += 'VAT: ' + data.company_tax_id + '\n';
        }
        
        commands += this.printLine();
        
        // Invoice info
        commands += this.COMMANDS.ALIGN_LEFT;
        commands += this.COMMANDS.BOLD_ON;
        commands += 'Invoice: ' + data.invoice_name + '\n';
        commands += this.COMMANDS.BOLD_OFF;
        commands += 'Date: ' + data.posting_date + ' ' + (data.posting_time || '') + '\n';
        commands += 'Cashier: ' + data.cashier + '\n';
        
        if (data.customer_name) {
            commands += 'Customer: ' + data.customer_name + '\n';
        }
        
        commands += this.printLine();
        
        // Items header
        commands += this.formatLine('Item', 'Qty', 'Price', 'Total');
        commands += this.printLine('-');
        
        // Items
        for (const item of data.items) {
            // Item name (may wrap)
            commands += item.item_name + '\n';
            // Item details
            commands += this.formatLine(
                '',
                item.qty.toString(),
                this.formatMoney(item.rate),
                this.formatMoney(item.amount)
            );
            
            if (item.discount_amount > 0) {
                commands += '  Discount: -' + this.formatMoney(item.discount_amount) + '\n';
            }
        }
        
        commands += this.printLine();
        
        // Totals
        commands += this.COMMANDS.ALIGN_RIGHT;
        commands += 'Subtotal: ' + this.formatMoney(data.subtotal) + '\n';
        
        if (data.discount > 0) {
            commands += 'Discount: -' + this.formatMoney(data.discount) + '\n';
        }
        
        if (data.tax > 0) {
            commands += 'Tax (15%): ' + this.formatMoney(data.tax) + '\n';
        }
        
        commands += this.COMMANDS.BOLD_ON;
        commands += this.COMMANDS.DOUBLE_SIZE;
        commands += 'TOTAL: ' + this.formatMoney(data.total) + '\n';
        commands += this.COMMANDS.NORMAL_SIZE;
        commands += this.COMMANDS.BOLD_OFF;
        
        // Payment
        commands += this.printLine();
        commands += this.COMMANDS.ALIGN_LEFT;
        
        for (const payment of data.payments) {
            commands += payment.mode_of_payment + ': ' + this.formatMoney(payment.amount) + '\n';
        }
        
        if (data.change > 0) {
            commands += 'Change: ' + this.formatMoney(data.change) + '\n';
        }
        
        // QR Code (if ZATCA)
        if (data.qr_code) {
            commands += this.printLine();
            commands += this.COMMANDS.ALIGN_CENTER;
            commands += this.printQRCode(data.qr_code);
        }
        
        // Footer
        commands += this.printLine();
        commands += this.COMMANDS.ALIGN_CENTER;
        commands += (data.footer_message || 'Thank you for your business!') + '\n';
        
        if (data.company_website) {
            commands += data.company_website + '\n';
        }
        
        // Feed and cut
        commands += '\n\n\n\n';
        commands += this.COMMANDS.CUT_PARTIAL;
        
        return commands;
    }
    
    printLine(char = '=') {
        const width = this.options.paperWidth === 80 ? 48 : 32;
        return char.repeat(width) + '\n';
    }
    
    formatLine(col1, col2, col3, col4) {
        const width = this.options.paperWidth === 80 ? 48 : 32;
        const col1Width = Math.floor(width * 0.35);
        const col2Width = Math.floor(width * 0.15);
        const col3Width = Math.floor(width * 0.25);
        const col4Width = width - col1Width - col2Width - col3Width;
        
        return col1.padEnd(col1Width).substring(0, col1Width) +
               col2.padStart(col2Width).substring(0, col2Width) +
               col3.padStart(col3Width).substring(0, col3Width) +
               col4.padStart(col4Width) + '\n';
    }
    
    formatMoney(amount) {
        return parseFloat(amount || 0).toFixed(2);
    }
    
    printQRCode(data) {
        let commands = '';
        const dataLength = data.length + 3;
        const pL = dataLength % 256;
        const pH = Math.floor(dataLength / 256);
        
        // Set QR model
        commands += this.COMMANDS.QR_MODEL + '\x32';
        
        // Set QR size
        commands += this.COMMANDS.QR_SIZE + '\x06'; // Size 6
        
        // Set error correction level
        commands += this.COMMANDS.QR_ERROR + '\x31'; // Level L
        
        // Store QR data
        commands += '\x1D\x28\x6B' + String.fromCharCode(pL) + String.fromCharCode(pH) + '\x31\x50\x30' + data;
        
        // Print QR
        commands += this.COMMANDS.QR_PRINT;
        
        return commands + '\n';
    }
    
    /**
     * Print barcode
     */
    printBarcode(code, type = 'CODE128') {
        let commands = '';
        
        // Set barcode height
        commands += this.COMMANDS.BARCODE_HEIGHT + '\x50'; // 80 dots
        
        // Set barcode width
        commands += this.COMMANDS.BARCODE_WIDTH + '\x02'; // Width 2
        
        // Print barcode
        const types = {
            'UPC-A': '\x00',
            'UPC-E': '\x01',
            'EAN13': '\x02',
            'EAN8': '\x03',
            'CODE39': '\x04',
            'CODE128': '\x49'
        };
        
        commands += this.COMMANDS.PRINT_BARCODE + (types[type] || types['CODE128']);
        commands += String.fromCharCode(code.length) + code;
        
        return commands;
    }
    
    /**
     * Open cash drawer
     */
    async openCashDrawer() {
        return this.sendToPrinter(this.COMMANDS.OPEN_DRAWER);
    }
    
    /**
     * Send commands to printer
     */
    async sendToPrinter(commands) {
        if (this.options.printerType === 'network') {
            return this.sendNetworkPrint(commands);
        } else if (this.options.printerType === 'usb' && this.device) {
            return this.sendUSBPrint(commands);
        } else if (this.options.printerType === 'bluetooth' && this.characteristic) {
            return this.sendBluetoothPrint(commands);
        }
        
        // Fallback to browser print
        return this.browserPrint(commands);
    }
    
    async sendNetworkPrint(commands) {
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.pos_api.send_to_printer',
                args: {
                    printer_ip: this.options.printerIp,
                    printer_port: this.options.printerPort,
                    data: btoa(commands) // Base64 encode
                }
            });
            
            return response.message?.success || false;
        } catch (e) {
            console.error('Network print error:', e);
            return false;
        }
    }
    
    async sendUSBPrint(commands) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(commands);
            await this.device.transferOut(1, data);
            return true;
        } catch (e) {
            console.error('USB print error:', e);
            return false;
        }
    }
    
    async sendBluetoothPrint(commands) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(commands);
            await this.characteristic.writeValue(data);
            return true;
        } catch (e) {
            console.error('Bluetooth print error:', e);
            return false;
        }
    }
    
    browserPrint(commands) {
        // Fallback: Open print dialog
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Receipt</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        width: ${this.options.paperWidth}mm;
                        margin: 0 auto;
                        padding: 10px;
                    }
                    pre {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                </style>
            </head>
            <body>
                <pre>${this.stripESCCommands(commands)}</pre>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
        return true;
    }
    
    stripESCCommands(text) {
        // Remove ESC/POS commands for browser display
        return text.replace(/[\x00-\x1F\x7F]/g, '');
    }
    
    /**
     * Print test page
     */
    async printTestPage() {
        const testReceipt = {
            company_name: 'Smart POS',
            company_address: 'Test Address\n123 Main Street',
            invoice_name: 'TEST-001',
            posting_date: new Date().toLocaleDateString(),
            posting_time: new Date().toLocaleTimeString(),
            cashier: frappe.session.user,
            items: [
                { item_name: 'Test Item 1', qty: 2, rate: 10.00, amount: 20.00, discount_amount: 0 },
                { item_name: 'Test Item 2', qty: 1, rate: 25.00, amount: 25.00, discount_amount: 0 }
            ],
            subtotal: 45.00,
            discount: 0,
            tax: 6.75,
            total: 51.75,
            payments: [{ mode_of_payment: 'Cash', amount: 60.00 }],
            change: 8.25,
            footer_message: 'This is a test print'
        };
        
        return this.printReceipt(testReceipt);
    }
}


/**
 * Receipt Builder for formatting receipt data
 */
class ReceiptBuilder {
    constructor(posTerminal) {
        this.pos = posTerminal;
    }
    
    buildFromInvoice(invoice, additionalData = {}) {
        const settings = this.pos.state.settings || {};
        const profile = this.pos.state.profile || {};
        
        return {
            // Company info
            company_name: profile.company || 'Smart POS',
            company_address: additionalData.company_address || '',
            company_phone: additionalData.company_phone || '',
            company_tax_id: additionalData.company_tax_id || '',
            company_website: additionalData.company_website || '',
            
            // Invoice info
            invoice_name: invoice.name || invoice.offline_id,
            posting_date: invoice.posting_date,
            posting_time: invoice.posting_time,
            cashier: frappe.session.user_fullname || frappe.session.user,
            
            // Customer
            customer_name: invoice.customer_name || invoice.customer,
            
            // Items
            items: (invoice.items || []).map(item => ({
                item_name: item.item_name,
                qty: item.qty,
                rate: item.rate,
                amount: item.amount || (item.qty * item.rate),
                discount_amount: item.discount_amount || 0
            })),
            
            // Totals
            subtotal: invoice.total || invoice.items?.reduce((sum, i) => sum + (i.amount || i.qty * i.rate), 0) || 0,
            discount: invoice.discount_amount || 0,
            tax: invoice.total_taxes_and_charges || 0,
            total: invoice.grand_total || invoice.total,
            
            // Payments
            payments: invoice.payments || [],
            change: additionalData.change || 0,
            
            // ZATCA
            qr_code: invoice.custom_ksa_einvoicing_qr || additionalData.qr_code,
            
            // Footer
            footer_message: settings.receipt_footer || 'Thank you for your business!',
            
            // Additional
            ...additionalData
        };
    }
}


// Export
window.ThermalPrinter = ThermalPrinter;
window.ReceiptBuilder = ReceiptBuilder;
