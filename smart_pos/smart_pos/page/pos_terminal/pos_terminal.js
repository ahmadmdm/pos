/**
 * Smart POS Terminal - Main JavaScript
 * Copyright (c) 2026, Ahmad
 */

// Translations object
const POS_TRANSLATIONS = {
    en: {
        // Loading
        loading_pos: "Loading POS...",
        
        // Session
        start_new_session: "Start New Session",
        pos_profile: "POS Profile",
        opening_cash: "Opening Cash",
        notes_optional: "Notes (Optional)",
        add_notes: "Add notes...",
        start_session: "Start Session",
        close_session: "Close Session",
        
        // Header
        online: "Online",
        offline: "Offline",
        syncing: "Syncing...",
        fullscreen: "Fullscreen",
        settings: "Settings",
        
        // Cart
        cart: "Cart",
        clear_all: "Clear All",
        default_customer: "Default Customer",
        click_to_select_customer: "Click to select customer",
        cart_empty: "Cart is empty",
        add_products_to_start: "Add products to start",
        
        // Summary
        subtotal: "Subtotal",
        tax: "Tax",
        discount: "Discount",
        total: "Total",
        pay: "Pay",
        
        // Search
        search_product_or_barcode: "Search product or scan barcode...",
        all: "All",
        no_products_found: "No products found",
        try_different_search: "Try a different search",
        
        // Payment
        amount_due: "Amount Due",
        cash: "Cash",
        card: "Card",
        bank_transfer: "Bank Transfer",
        change: "Change",
        cancel: "Cancel",
        complete_payment: "Complete Payment",
        
        // Customer
        select_customer: "Select Customer",
        search_by_name_or_phone: "Search by name or phone...",
        new_customer: "New Customer",
        no_customers: "No customers",
        
        // Close Session
        cash_sales: "Cash Sales",
        card_sales: "Card Sales",
        expected_cash: "Expected Cash",
        actual_cash_in_drawer: "Actual Cash in Drawer",
        closing_notes: "Closing Notes",
        
        // Messages
        success: "Success",
        error: "Error",
        payment_successful: "Payment successful!",
        invoice_number: "Invoice Number",
        change_due: "Change Due",
        session_closed: "Session closed successfully",
        clear_cart_confirm: "Clear all items from cart?",
        insufficient_payment: "Payment amount is insufficient",
        no_pos_profiles: "No POS Profiles Available",
        select_pos_profile: "Please select a POS Profile",
        no_active_session: "No active session",
        product_not_found: "Product not found",
        out_of_stock: "Out of stock",
        print_receipt: "Print Receipt",
        new_sale: "New Sale",
        print_sent: "Print sent successfully",
        print_error: "Print error",
        please_select_customer: "Please select a customer first"
    },
    ar: {
        // Loading
        loading_pos: "جاري تحميل نقطة البيع...",
        
        // Session
        start_new_session: "بدء جلسة جديدة",
        pos_profile: "ملف نقطة البيع",
        opening_cash: "النقد الافتتاحي",
        notes_optional: "ملاحظات (اختياري)",
        add_notes: "أضف ملاحظات...",
        start_session: "بدء الجلسة",
        close_session: "إغلاق الجلسة",
        
        // Header
        online: "متصل",
        offline: "غير متصل",
        syncing: "جاري المزامنة...",
        fullscreen: "ملء الشاشة",
        settings: "الإعدادات",
        
        // Cart
        cart: "السلة",
        clear_all: "مسح الكل",
        default_customer: "عميل افتراضي",
        click_to_select_customer: "اضغط لاختيار عميل",
        cart_empty: "السلة فارغة",
        add_products_to_start: "أضف منتجات للبدء",
        
        // Summary
        subtotal: "المجموع الفرعي",
        tax: "الضريبة",
        discount: "الخصم",
        total: "الإجمالي",
        pay: "الدفع",
        
        // Search
        search_product_or_barcode: "ابحث عن منتج أو امسح الباركود...",
        all: "الكل",
        no_products_found: "لا توجد منتجات",
        try_different_search: "جرب البحث بكلمة أخرى",
        
        // Payment
        amount_due: "المبلغ المطلوب",
        cash: "نقداً",
        card: "بطاقة",
        bank_transfer: "تحويل بنكي",
        change: "الباقي",
        cancel: "إلغاء",
        complete_payment: "إتمام الدفع",
        
        // Customer
        select_customer: "اختيار العميل",
        search_by_name_or_phone: "ابحث بالاسم أو رقم الهاتف...",
        new_customer: "عميل جديد",
        no_customers: "لا يوجد عملاء",
        
        // Close Session
        cash_sales: "مبيعات نقدية",
        card_sales: "مبيعات بطاقة",
        expected_cash: "النقد المتوقع",
        actual_cash_in_drawer: "النقد الفعلي في الصندوق",
        closing_notes: "ملاحظات الإغلاق",
        
        // Messages
        success: "نجاح",
        error: "خطأ",
        payment_successful: "تمت العملية بنجاح!",
        invoice_number: "رقم الفاتورة",
        change_due: "الباقي",
        session_closed: "تم إغلاق الجلسة بنجاح",
        clear_cart_confirm: "مسح جميع المنتجات من السلة؟",
        insufficient_payment: "المبلغ المدفوع غير كافٍ",
        no_pos_profiles: "لا توجد ملفات نقطة بيع متاحة",
        select_pos_profile: "الرجاء اختيار ملف نقطة البيع",
        no_active_session: "لا توجد جلسة نشطة",
        product_not_found: "المنتج غير موجود",
        out_of_stock: "نفذت الكمية",
        print_receipt: "طباعة الفاتورة",
        new_sale: "عملية جديدة",
        print_sent: "تم إرسال الطباعة بنجاح",
        print_error: "خطأ في الطباعة",
        please_select_customer: "الرجاء اختيار عميل أولاً"
    }
};

frappe.pages['pos-terminal'].on_page_load = function(wrapper) {
    frappe.pos_terminal = new POSTerminal(wrapper);
};

class POSTerminal {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.page = frappe.ui.make_app_page({
            parent: wrapper,
            title: 'POS Terminal',
            single_column: true
        });
        
        // Hide standard page elements
        $(this.page.page_form).hide();
        $(this.wrapper).find('.page-head').hide();
        
        // Detect language
        this.lang = frappe.boot.lang || 'en';
        this.isRTL = this.lang === 'ar';
        
        // State
        this.state = {
            session: null,
            profile: null,
            settings: null,
            cart: [],
            customer: null,
            payments: [],
            items: [],
            customers: [],
            itemGroups: [],
            paymentMethods: [],
            currentPage: 1,
            itemsPerPage: 20,
            searchQuery: '',
            selectedGroup: 'all',
            isOffline: false
        };
        
        this.init();
    }
    
    // Translation helper
    __(key) {
        const translations = POS_TRANSLATIONS[this.lang] || POS_TRANSLATIONS['en'];
        return translations[key] || POS_TRANSLATIONS['en'][key] || key;
    }
    
    // Apply translations to page
    applyTranslations() {
        // Text content translations
        $('[data-translate]').each((i, el) => {
            const key = $(el).data('translate');
            $(el).text(this.__(key));
        });
        
        // Placeholder translations
        $('[data-translate-placeholder]').each((i, el) => {
            const key = $(el).data('translate-placeholder');
            $(el).attr('placeholder', this.__(key));
        });
        
        // Title translations
        $('[data-translate-title]').each((i, el) => {
            const key = $(el).data('translate-title');
            $(el).attr('title', this.__(key));
        });
        
        // Set direction
        const $container = $('#pos-container');
        if (this.isRTL) {
            $container.attr('dir', 'rtl');
            $container.addClass('rtl');
        } else {
            $container.attr('dir', 'ltr');
            $container.removeClass('rtl');
        }
    }
    
    async init() {
        try {
            // Initialize IndexedDB
            await window.POSDatabase.init();
            
            // Initialize Sync Engine
            window.POSSyncEngine.init({
                syncIntervalMs: 30000
            });
            
            // Initialize Hardware
            window.POSHardware.init({
                barcodeDelay: 50
            });
            
            // Initialize new modules
            this.initializeModules();
            
            // Setup event listeners
            this.setupSyncListeners();
            this.setupHardwareListeners();
            
            // Load settings
            await this.loadSettings();
            
            // Render page
            this.render();
            
            // Bind events
            this.bindEvents();
            
            // Check for existing session
            await this.checkExistingSession();
            
        } catch (error) {
            console.error('POS Terminal initialization error:', error);
            frappe.msgprint({
                title: 'Error',
                indicator: 'red',
                message: 'Failed to initialize POS Terminal: ' + error.message
            });
        }
    }
    
    render() {
        // Add POS class to body for fullscreen mode
        $('body').addClass('pos-page');
        
        $(this.wrapper).find('.layout-main-section').html(frappe.render_template('pos_terminal'));
        this.cacheElements();
        this.applyTranslations();
        this.setupOnlineStatus();
        this.hideLoading();
    }
    
    cacheElements() {
        this.$loading = $('#pos-loading');
        this.$sessionModal = $('#session-modal');
        this.$posMain = $('#pos-main');
        this.$productsGrid = $('#products-grid');
        this.$cartItems = $('#cart-items');
        this.$paymentModal = $('#payment-modal');
        this.$customerModal = $('#customer-modal');
        this.$closeSessionModal = $('#close-session-modal');
        this.$successModal = $('#success-modal');
    }
    
    setupOnlineStatus() {
        // Initial status check
        this.updateOnlineStatus(navigator.onLine);
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));
    }
    
    // Initialize additional modules
    initializeModules() {
        // Hold/Recall Manager
        if (window.HoldRecallManager) {
            this.holdRecallManager = new HoldRecallManager(this);
        }
        
        // Keyboard Shortcuts Manager
        if (window.KeyboardShortcutsManager) {
            this.shortcutsManager = new KeyboardShortcutsManager(this);
        }
        
        // Quick Keys Manager
        if (window.QuickKeysManager) {
            this.quickKeysManager = new QuickKeysManager(this);
            this.quickKeysManager.setupContextMenu();
            if (this.shortcutsManager) {
                this.quickKeysManager.setupKeyboardShortcuts(this.shortcutsManager);
            }
        }
        
        // Discount Manager
        if (window.DiscountManager) {
            this.discountManager = new DiscountManager(this);
        }
        
        // Thermal Printer
        if (window.ThermalPrinter) {
            this.printer = new ThermalPrinter(this.state.settings || {});
            this.receiptBuilder = new ReceiptBuilder(this);
        }
        
        console.log('Smart POS modules initialized');
    }
    
    updateOnlineStatus(isOnline) {
        this.state.isOffline = !isOnline;
        const $status = $('#sync-status');
        const $statusText = $('#status-text');
        const $iconOnline = $('.icon-online');
        const $iconOffline = $('.icon-offline');
        const $iconSyncing = $('.icon-syncing');
        
        if (isOnline) {
            $status.removeClass('offline syncing').addClass('online');
            $statusText.text(this.__('online'));
            $iconOnline.show();
            $iconOffline.hide();
            $iconSyncing.hide();
        } else {
            $status.removeClass('online syncing').addClass('offline');
            $statusText.text(this.__('offline'));
            $iconOnline.hide();
            $iconOffline.show();
            $iconSyncing.hide();
        }
    }
    
    showSyncingStatus() {
        const $status = $('#sync-status');
        const $statusText = $('#status-text');
        const $iconOnline = $('.icon-online');
        const $iconOffline = $('.icon-offline');
        const $iconSyncing = $('.icon-syncing');
        
        $status.removeClass('online offline').addClass('syncing');
        $statusText.text(this.__('syncing'));
        $iconOnline.hide();
        $iconOffline.hide();
        $iconSyncing.show();
    }
    
    showLoading(message) {
        this.$loading.find('p').text(message || this.__('loading_pos'));
        this.$loading.show();
    }
    
    hideLoading() {
        this.$loading.hide();
    }
    
    // =============================================================================
    // Settings & Session
    // =============================================================================
    
    async loadSettings() {
        try {
            if (navigator.onLine) {
                const settings = await frappe.call({
                    method: 'smart_pos.smart_pos.api.pos_api.get_smart_pos_settings'
                });
                this.state.settings = settings.message || {};
                // Cache settings for offline
                await window.POSDatabase.saveSetting('smartPosSettings', this.state.settings);
            } else {
                // Load from cache
                this.state.settings = await window.POSDatabase.getSetting('smartPosSettings') || {};
            }
            this.state.itemsPerPage = this.state.settings.items_per_page || 20;
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Try to load from cache
            this.state.settings = await window.POSDatabase.getSetting('smartPosSettings') || {};
        }
    }
    
    async checkExistingSession() {
        try {
            // Check for cached session first (for offline mode)
            const cachedSession = await window.POSDatabase.getActiveSession();
            
            if (navigator.onLine) {
                const response = await frappe.call({
                    method: 'smart_pos.smart_pos.api.pos_api.get_open_session'
                });
                
                if (response.message) {
                    this.state.session = response.message;
                    // Cache session for offline
                    await window.POSDatabase.saveSession({
                        ...response.message,
                        id: response.message.session_id || response.message.name,
                        status: 'Open'
                    });
                    console.log('Existing session loaded:', {
                        session_id: this.state.session.session_id || this.state.session.name,
                        company: this.state.session.company,
                        pos_profile: this.state.session.pos_profile
                    });
                    await this.loadProfileData(response.message.pos_profile);
                    console.log('Profile loaded:', {
                        name: this.state.profile.name,
                        company: this.state.profile.company
                    });
                    this.showPOS();
                } else {
                    this.showSessionModal();
                }
            } else if (cachedSession) {
                // Offline mode with cached session
                this.state.session = cachedSession;
                this.state.isOffline = true;
                console.log('📴 Offline mode - Using cached session:', cachedSession.id);
                await this.loadProfileDataOffline(cachedSession.pos_profile);
                this.showPOS();
            } else {
                // Offline with no session
                this.showOfflineSessionModal();
            }
        } catch (error) {
            console.error('Failed to check session:', error);
            this.showSessionModal();
        }
    }
    
    async showSessionModal() {
        this.$posMain.hide();
        this.$sessionModal.show();
        
        // Load POS Profiles
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.pos_api.get_pos_profiles'
            });
            
            const profiles = response.message || [];
            const $select = $('#pos-profile-select');
            $select.empty();
            
            if (profiles.length === 0) {
                $select.append(`<option value="">${this.__('no_pos_profiles')}</option>`);
                $('#start-session-btn').prop('disabled', true);
            } else {
                profiles.forEach(profile => {
                    $select.append(`<option value="${profile.name}">${profile.name} (${profile.company})</option>`);
                });
                $('#start-session-btn').prop('disabled', false);
            }
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    }
    
    async startSession() {
        const posProfile = $('#pos-profile-select').val();
        const openingCash = parseFloat($('#opening-cash').val()) || 0;
        const notes = $('#opening-notes').val();
        
        if (!posProfile) {
            frappe.msgprint(this.__('select_pos_profile'));
            return;
        }
        
        this.showLoading(this.__('loading_pos'));
        
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.pos_api.open_session',
                args: {
                    pos_profile: posProfile,
                    opening_cash: openingCash,
                    notes: notes,
                    device_info: JSON.stringify({
                        device_id: this.getDeviceId(),
                        device_name: navigator.userAgent.substring(0, 50),
                        ip_address: ''
                    })
                }
            });
            
            if (response.message && response.message.session_id) {
                this.state.session = response.message;
                await this.loadProfileData(posProfile);
                this.$sessionModal.hide();
                this.showPOS();
            }
        } catch (error) {
            console.error('Failed to start session:', error);
            frappe.msgprint({
                title: 'Error',
                indicator: 'red',
                message: 'Failed to start session: ' + error.message
            });
        } finally {
            this.hideLoading();
        }
    }
    
    async loadProfileData(posProfile) {
        try {
            // Load profile details
            const profileResponse = await frappe.call({
                method: 'smart_pos.smart_pos.api.pos_api.get_pos_profile_data',
                args: { pos_profile: posProfile }
            });
            this.state.profile = profileResponse.message;
            this.state.paymentMethods = this.state.profile.payments || [];
            
            // Cache profile for offline use
            await window.POSDatabase.saveSetting('cachedProfile', this.state.profile);
            await window.POSDatabase.saveSetting('posProfile', posProfile);
            
            // Load items from server
            await this.loadItems();
            
            // Load customers
            await this.loadCustomers();
            
            console.log('✅ Data loaded and cached for offline use');
            
        } catch (error) {
            console.error('Failed to load profile data:', error);
            // Try offline mode
            await this.loadProfileDataOffline(posProfile);
        }
    }
    
    async loadProfileDataOffline(posProfile) {
        try {
            // Load cached profile
            const cachedProfile = await window.POSDatabase.getSetting('cachedProfile');
            if (cachedProfile) {
                this.state.profile = cachedProfile;
                this.state.paymentMethods = cachedProfile.payments || [];
            } else {
                // Create minimal profile for offline
                this.state.profile = {
                    name: posProfile,
                    company: this.state.session?.company || 'Unknown',
                    warehouse: this.state.session?.warehouse,
                    payments: [{ mode_of_payment: 'Cash', default: 1 }]
                };
                this.state.paymentMethods = this.state.profile.payments;
            }
            
            // Load items from IndexedDB
            this.state.items = await window.POSDatabase.getAllItems();
            
            // Load customers from IndexedDB
            this.state.customers = await window.POSDatabase.getAllCustomers();
            
            // Extract item groups
            const groups = [...new Set(this.state.items.map(i => i.item_group))];
            this.state.itemGroups = groups;
            
            this.renderCategories();
            this.renderProducts();
            
            console.log('📴 Loaded offline data:', {
                items: this.state.items.length,
                customers: this.state.customers.length
            });
            
        } catch (error) {
            console.error('Failed to load offline data:', error);
            frappe.msgprint({
                title: this.__('error'),
                indicator: 'red',
                message: 'No cached data available for offline mode'
            });
        }
    }
    
    showOfflineSessionModal() {
        // Show a message that offline mode requires a previously opened session
        frappe.msgprint({
            title: '📴 ' + this.__('offline'),
            indicator: 'orange',
            message: `
                <div style="text-align: center; padding: 20px;">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                        <line x1="12" y1="20" x2="12.01" y2="20"></line>
                    </svg>
                    <h3 style="margin-top: 16px;">أنت غير متصل بالإنترنت</h3>
                    <p style="color: #666; margin-top: 8px;">
                        للعمل في وضع عدم الاتصال، يجب أن تكون قد فتحت جلسة مسبقاً أثناء الاتصال بالإنترنت.
                    </p>
                    <p style="color: #666; margin-top: 8px;">
                        To work offline, you must have opened a session while online first.
                    </p>
                </div>
            `
        });
    }
    
    // =============================================================================
    // Products
    // =============================================================================
    
    async loadItems(forceRefresh = false) {
        try {
            // Check if online
            if (!navigator.onLine) {
                console.log('📴 Offline - Loading items from cache');
                const cachedItems = await window.POSDatabase.getAllItems();
                this.state.items = cachedItems;
                this.extractItemGroups();
                this.renderCategories();
                this.renderProducts();
                return;
            }
            
            // Online - fetch from server
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.pos_api.get_all_items_for_offline',
                args: { pos_profile: this.state.profile.name }
            });
            
            let items = response.message || [];
            
            // Save to IndexedDB for offline use
            await window.POSDatabase.saveItems(items);
            console.log(`✅ Cached ${items.length} items for offline use`);
            
            this.state.items = items;
            this.extractItemGroups();
            this.renderCategories();
            this.renderProducts();
            
        } catch (error) {
            console.error('Failed to load items:', error);
            // Fallback to cached items
            const cachedItems = await window.POSDatabase.getAllItems();
            this.state.items = cachedItems;
            this.extractItemGroups();
            this.renderCategories();
            this.renderProducts();
            
            if (cachedItems.length === 0) {
                frappe.show_alert({
                    message: 'No items available. Please connect to internet and refresh.',
                    indicator: 'orange'
                }, 5);
            }
        }
    }
    
    extractItemGroups() {
        const groups = [...new Set(this.state.items.map(i => i.item_group))];
        this.state.itemGroups = groups;
    }
    
    async loadCustomers() {
        try {
            // Check online status
            if (!navigator.onLine) {
                console.log('📴 Offline - Loading customers from cache');
                this.state.customers = await window.POSDatabase.getAllCustomers();
                return;
            }
            
            // Try to get from server
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.pos_api.get_all_customers_for_offline'
            });
            
            let customers = response.message || [];
            
            for (const c of customers) {
                c.synced = true;
            }
            await window.POSDatabase.saveCustomers(customers);
            console.log(`✅ Cached ${customers.length} customers for offline use`);
            
            this.state.customers = customers;
            
        } catch (error) {
            console.error('Failed to load customers:', error);
            this.state.customers = await window.POSDatabase.getAllCustomers();
        }
    }
    
    renderCategories() {
        const $categories = $('.pos-categories');
        $categories.find('.dynamic-category').remove();
        
        this.state.itemGroups.forEach(group => {
            $categories.append(`
                <button class="pos-category-btn dynamic-category" data-group="${group}">
                    ${group}
                </button>
            `);
        });
    }
    
    renderProducts() {
        let items = this.state.items;
        
        // Filter by group
        if (this.state.selectedGroup !== 'all') {
            items = items.filter(i => i.item_group === this.state.selectedGroup);
        }
        
        // Filter by search
        if (this.state.searchQuery) {
            const query = this.state.searchQuery.toLowerCase();
            items = items.filter(i => 
                i.item_code.toLowerCase().includes(query) ||
                i.item_name.toLowerCase().includes(query) ||
                (i.barcodes && i.barcodes.some(b => b.includes(this.state.searchQuery)))
            );
        }
        
        // Pagination
        const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const endIndex = startIndex + this.state.itemsPerPage;
        const paginatedItems = items.slice(startIndex, endIndex);
        const totalPages = Math.ceil(items.length / this.state.itemsPerPage);
        
        // Render
        if (paginatedItems.length === 0) {
            this.$productsGrid.html(`
                <div class="pos-no-products">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <p>${this.__('no_products_found')}</p>
                    <span>${this.__('try_different_search')}</span>
                </div>
            `);
        } else {
            this.$productsGrid.html(paginatedItems.map(item => this.renderProductCard(item)).join(''));
        }
        
        // Update pagination
        const pageText = this.isRTL ? `صفحة ${this.state.currentPage} من ${totalPages || 1}` : `Page ${this.state.currentPage} of ${totalPages || 1}`;
        $('#page-info').text(pageText);
        $('#prev-page').prop('disabled', this.state.currentPage <= 1);
        $('#next-page').prop('disabled', this.state.currentPage >= totalPages);
    }
    
    renderProductCard(item) {
        const stockClass = item.stock_qty <= 0 ? 'out-of-stock' : item.stock_qty < 10 ? 'low-stock' : '';
        const imageUrl = item.image || '';
        const showStock = this.state.settings.show_stock_qty;
        const stockText = item.stock_qty <= 0 ? this.__('out_of_stock') : item.stock_qty;
        
        // Generate color based on item name for placeholder
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981'];
        const colorIndex = item.item_name.charCodeAt(0) % colors.length;
        const bgColor = colors[colorIndex];
        const initial = item.item_name.charAt(0).toUpperCase();
        
        return `
            <div class="pos-product-card ${stockClass}" data-item-code="${item.item_code}">
                <div class="pos-product-image">
                    ${imageUrl ? 
                        `<img src="${imageUrl}" alt="${item.item_name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="pos-product-placeholder" style="display:none; background: linear-gradient(135deg, ${bgColor}, ${bgColor}dd);">${initial}</div>` :
                        `<div class="pos-product-placeholder" style="background: linear-gradient(135deg, ${bgColor}, ${bgColor}dd);">${initial}</div>`
                    }
                    ${showStock ? `<span class="pos-product-stock">${stockText}</span>` : ''}
                </div>
                <div class="pos-product-info">
                    <div class="pos-product-name">${item.item_name}</div>
                    <div class="pos-product-price">${this.formatCurrency(item.price)}</div>
                </div>
            </div>
        `;
    }
    
    // =============================================================================
    // Cart Operations
    // =============================================================================
    
    addToCart(itemCode, qty = 1) {
        // Convert to string for comparison
        itemCode = String(itemCode);
        
        const item = this.state.items.find(i => String(i.item_code) === itemCode || String(i.name) === itemCode);
        
        if (!item) {
            console.error('Item not found:', itemCode);
            return;
        }
        
        // Show warning if out of stock but still allow adding
        if (item.stock_qty <= 0 && this.state.settings.show_stock_qty) {
            frappe.show_alert({ message: this.__('out_of_stock') + ' - ' + item.item_name, indicator: 'orange' });
        }
        
        // Check if already in cart
        const existingIndex = this.state.cart.findIndex(c => c.item_code === itemCode);
        
        if (existingIndex >= 0) {
            this.state.cart[existingIndex].qty += qty;
            this.state.cart[existingIndex].amount = 
                this.state.cart[existingIndex].qty * this.state.cart[existingIndex].rate;
        } else {
            this.state.cart.push({
                item_code: item.item_code,
                item_name: item.item_name,
                qty: qty,
                rate: item.price,
                amount: qty * item.price,
                stock_uom: item.stock_uom,
                discount_percentage: 0,
                discount_amount: 0
            });
        }
        
        this.renderCart();
        this.playSound('add');
    }
    
    updateCartItem(index, field, value) {
        if (index < 0 || index >= this.state.cart.length) return;
        
        const item = this.state.cart[index];
        
        if (field === 'qty') {
            value = parseInt(value) || 0;
            if (value <= 0) {
                this.removeFromCart(index);
                return;
            }
            item.qty = value;
        } else if (field === 'rate') {
            item.rate = parseFloat(value) || 0;
        } else if (field === 'discount_percentage') {
            item.discount_percentage = parseFloat(value) || 0;
            item.discount_amount = item.rate * item.qty * (item.discount_percentage / 100);
        }
        
        item.amount = (item.qty * item.rate) - item.discount_amount;
        this.renderCart();
    }
    
    removeFromCart(index) {
        this.state.cart.splice(index, 1);
        this.renderCart();
    }
    
    clearCart() {
        this.state.cart = [];
        this.state.customer = null;
        this.state.payments = [];
        this.renderCart();
        this.updateCustomerDisplay();
    }
    
    renderCart() {
        if (this.state.cart.length === 0) {
            this.$cartItems.html(`
                <div class="pos-cart-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <p>${this.__('cart_empty')}</p>
                    <span>${this.__('add_products_to_start')}</span>
                </div>
            `);
        } else {
            this.$cartItems.html(this.state.cart.map((item, index) => `
                <div class="pos-cart-item" data-index="${index}">
                    <div class="pos-cart-item-info">
                        <div class="pos-cart-item-name">${item.item_name}</div>
                        <div class="pos-cart-item-price">${this.formatCurrency(item.rate)} × ${item.qty}</div>
                    </div>
                    <div class="pos-cart-item-qty">
                        <button class="pos-qty-btn qty-minus" data-index="${index}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                        <input type="number" class="pos-qty-input qty-input" value="${item.qty}" 
                               data-index="${index}" min="1">
                        <button class="pos-qty-btn qty-plus" data-index="${index}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="pos-cart-item-total">${this.formatCurrency(item.amount)}</div>
                    <button class="pos-cart-item-remove cart-item-remove" data-index="${index}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            `).join(''));
        }
        
        // Update cart count
        const totalItems = this.state.cart.reduce((sum, item) => sum + item.qty, 0);
        $('#cart-count').text(totalItems);
        
        this.updateCartSummary();
    }
    
    updateCartSummary() {
        const subtotal = this.state.cart.reduce((sum, item) => sum + item.amount, 0);
        const discount = this.state.cart.reduce((sum, item) => sum + item.discount_amount, 0);
        
        // Calculate tax from POS Profile tax rate
        let tax = 0;
        let taxRate = 0;
        
        // Get tax rate from profile
        if (this.state.profile && this.state.profile.taxes && this.state.profile.taxes.length > 0) {
            taxRate = this.state.profile.taxes.reduce((sum, t) => sum + (t.rate || 0), 0);
        } else if (this.state.taxRate) {
            taxRate = this.state.taxRate;
        }
        
        // Calculate tax on subtotal after discount
        const taxableAmount = subtotal - discount;
        tax = taxableAmount * (taxRate / 100);
        
        const total = subtotal - discount + tax;
        
        // Store tax info in state
        this.state.taxRate = taxRate;
        this.state.taxAmount = tax;
        
        $('#cart-subtotal').html(this.formatCurrency(subtotal));
        $('#cart-tax').html(this.formatCurrency(tax) + (taxRate > 0 ? ` (${taxRate}%)` : ''));
        $('#cart-discount').html('-' + this.formatCurrency(discount));
        $('#cart-total').html(this.formatCurrency(total));
        $('#pay-amount').html(this.formatCurrency(total));
        
        // Toggle tax/discount rows - show tax row if tax rate is configured
        $('#tax-row').toggle(taxRate > 0);
        $('#discount-row').toggle(discount > 0);
        
        // Enable/disable pay button
        $('#pay-btn').prop('disabled', this.state.cart.length === 0);
    }
    
    // =============================================================================
    // Customer
    // =============================================================================
    
    searchCustomers(query) {
        if (!query || query.length < 2) return [];
        
        const searchLower = query.toLowerCase();
        return this.state.customers.filter(c =>
            c.customer_name.toLowerCase().includes(searchLower) ||
            (c.mobile_no && c.mobile_no.includes(query)) ||
            c.name.toLowerCase().includes(searchLower)
        ).slice(0, 10);
    }
    
    selectCustomer(customer) {
        this.state.customer = customer;
        this.updateCustomerDisplay();
    }
    
    updateCustomerDisplay() {
        if (this.state.customer) {
            $('#customer-search').hide();
            $('#selected-customer').show();
            $('#customer-name').text(this.state.customer.customer_name);
        } else {
            $('#customer-search').show();
            $('#selected-customer').hide();
            $('#customer-search input').val('');
        }
    }
    
    async addNewCustomer() {
        const name = $('#new-customer-name').val().trim();
        const mobile = $('#new-customer-mobile').val().trim();
        const email = $('#new-customer-email').val().trim();
        
        if (!name) {
            frappe.msgprint('Please enter customer name');
            return;
        }
        
        const customer = {
            customer_name: name,
            mobile_no: mobile,
            email_id: email,
            customer_type: 'Individual',
            synced: false
        };
        
        // Save to IndexedDB
        const savedCustomer = await window.POSDatabase.addCustomer(customer);
        
        // Add to local list
        this.state.customers.push(savedCustomer);
        
        // Select this customer
        this.selectCustomer(savedCustomer);
        
        // Close modal
        this.$customerModal.hide();
        
        // Clear form
        $('#new-customer-name').val('');
        $('#new-customer-mobile').val('');
        $('#new-customer-email').val('');
        
        frappe.show_alert({ message: 'Customer added', indicator: 'green' });
    }
    
    // =============================================================================
    // Payment
    // =============================================================================
    
    showPaymentModal() {
        if (this.state.cart.length === 0) return;
        
        // Calculate total from cart state including tax
        const subtotal = this.state.cart.reduce((sum, item) => sum + item.amount, 0);
        const discount = this.state.cart.reduce((sum, item) => sum + item.discount_amount, 0);
        
        // Use stored tax rate or calculate
        let taxRate = this.state.taxRate || 0;
        if (!taxRate && this.state.profile && this.state.profile.taxes && this.state.profile.taxes.length > 0) {
            taxRate = this.state.profile.taxes.reduce((sum, t) => sum + (t.rate || 0), 0);
        }
        
        const taxableAmount = subtotal - discount;
        const tax = taxableAmount * (taxRate / 100);
        const total = subtotal - discount + tax;
        
        this.state.payments = [];
        this.state.paymentTotal = total;
        this.state.taxAmount = tax;
        this.state.currentPaymentMethod = 'Cash';
        this.state.paymentInput = '';
        
        // Update display
        $('#payment-total').html(this.formatCurrency(total));
        $('#payment-input').val('0');
        $('#payment-change').hide();
        $('#complete-payment').prop('disabled', true);
        
        // Reset payment methods selection
        $('.pos-payment-method').removeClass('active');
        $('.pos-payment-method[data-method="Cash"]').addClass('active');
        
        this.$paymentModal.show();
    }
    
    getPaymentIcon(type) {
        switch (type) {
            case 'Cash': return 'money-bill';
            case 'Card': return 'credit-card';
            case 'Bank': return 'university';
            default: return 'wallet';
        }
    }
    
    selectPaymentMethod(method) {
        this.state.currentPaymentMethod = method;
        $('.payment-method-btn').removeClass('active');
        $(`.payment-method-btn[data-method="${method}"]`).addClass('active');
        
        const pm = this.state.paymentMethods.find(p => p.mode_of_payment === method);
        $('#selected-payment-method span').text(method);
        $('#selected-payment-method i').attr('class', 'fa fa-' + this.getPaymentIcon(pm?.type));
    }
    
    handleNumpadInput(value) {
        if (value === 'C') {
            this.state.paymentInput = '';
        } else if (value === '.' && this.state.paymentInput.includes('.')) {
            return;
        } else {
            this.state.paymentInput += value;
        }
        
        const amount = parseFloat(this.state.paymentInput) || 0;
        $('#payment-input').val(amount.toFixed(2));
        this.updatePaymentChange();
    }
    
    updatePaymentChange() {
        const total = this.state.paymentTotal || 0;
        const paid = parseFloat(this.state.paymentInput) || 0;
        const change = paid - total;
        
        if (change >= 0) {
            $('#payment-change').show();
            $('#change-amount').html(this.formatCurrency(change));
        } else {
            $('#payment-change').hide();
        }
        
        $('#complete-payment').prop('disabled', paid < total);
    }
    
    setQuickAmount(amount) {
        if (amount === 'exact') {
            const remaining = this.state.paymentTotal - this.getPaidAmount();
            this.state.paymentInput = remaining.toFixed(2);
        } else {
            this.state.paymentInput = amount;
        }
        $('#payment-amount-input').val(parseFloat(this.state.paymentInput).toFixed(2));
    }
    
    addPayment() {
        const amount = parseFloat(this.state.paymentInput) || 0;
        if (amount <= 0) return;
        
        const pm = this.state.paymentMethods.find(p => p.mode_of_payment === this.state.currentPaymentMethod);
        
        this.state.payments.push({
            mode_of_payment: this.state.currentPaymentMethod,
            amount: amount,
            account: pm?.account
        });
        
        this.state.paymentInput = '';
        $('#payment-amount-input').val('0.00');
        this.updatePaymentSummary();
    }
    
    getPaidAmount() {
        return this.state.payments.reduce((sum, p) => sum + p.amount, 0);
    }
    
    updatePaymentSummary() {
        const paid = this.getPaidAmount();
        const total = this.state.paymentTotal;
        const remaining = Math.max(0, total - paid);
        const change = Math.max(0, paid - total);
        
        $('#payment-paid').html(this.formatCurrency(paid));
        $('#payment-remaining').html(this.formatCurrency(remaining));
        $('#payment-change').html(this.formatCurrency(change));
        
        $('#remaining-row').toggle(remaining > 0);
        $('#change-row').toggle(change > 0);
        
        // Enable complete button if fully paid
        $('#complete-payment').prop('disabled', paid < total);
    }
    
    async completePayment() {
        const paid = parseFloat(this.state.paymentInput) || 0;
        const total = this.state.paymentTotal;
        
        if (paid < total) {
            frappe.msgprint(this.__('insufficient_payment'));
            return;
        }
        
        // Get customer - from state, profile, or settings
        const customer = this.state.customer?.name || 
                        this.state.profile?.customer || 
                        this.state.settings?.default_customer;
        
        if (!customer) {
            frappe.msgprint({
                title: this.__('error'),
                indicator: 'red',
                message: this.__('please_select_customer') || 'Please select a customer'
            });
            return;
        }
        
        this.showLoading(this.__('loading_pos'));
        
        try {
            // Get company from session first, then profile as fallback
            const company = this.state.session?.company || this.state.profile?.company;
            
            if (!company) {
                frappe.msgprint({
                    title: this.__('error'),
                    indicator: 'red',
                    message: 'Company not set in session or profile'
                });
                this.hideLoading();
                return;
            }
            
            const invoiceData = {
                company: company,
                customer: customer,
                pos_profile: this.state.profile.name,
                pos_session: this.state.session.name || this.state.session.session_id,
                warehouse: this.state.profile.warehouse,
                posting_date: frappe.datetime.get_today(),
                posting_time: frappe.datetime.now_time(),
                items: this.state.cart,
                payments: [{
                    mode_of_payment: this.state.currentPaymentMethod,
                    amount: paid
                }],
                taxes: [],
                offline_id: window.POSDatabase.generateOfflineId(),
                device_id: this.getDeviceId(),
                submit: true
            };
            
            let response;
            
            if (navigator.onLine) {
                // Online - create directly on server
                response = await frappe.call({
                    method: 'smart_pos.smart_pos.api.pos_api.create_pos_invoice',
                    args: { invoice_data: JSON.stringify(invoiceData) }
                });
                
                if (response.message && response.message.name) {
                    invoiceData.server_name = response.message.name;
                    invoiceData.synced = true;
                }
            } else {
                // Offline - save locally
                await window.POSDatabase.saveInvoice(invoiceData);
                response = { message: { name: invoiceData.offline_id, status: 'offline' } };
            }
            
            // Show success
            const change = paid - total;
            this.showSuccessMessage(response.message.name, change);
            
            // Auto print if enabled
            if (this.state.settings?.enable_auto_print) {
                setTimeout(() => {
                    this.printInvoice(response.message.name);
                }, 500);
            }
            
            // Clear cart
            this.clearCart();
            
            // Close payment modal
            this.$paymentModal.hide();
            
        } catch (error) {
            console.error('Payment error:', error);
            frappe.msgprint({
                title: this.__('error'),
                indicator: 'red',
                message: error.message
            });
        } finally {
            this.hideLoading();
        }
    }
    
    showSuccessMessage(invoiceName, change) {
        // Store last invoice for printing
        this.lastInvoiceName = invoiceName;
        this.lastInvoiceChange = change;
        
        let message = `<div style="text-align: center; padding: 20px;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" style="margin-bottom: 16px;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <h3 style="color: #10b981; margin-bottom: 8px;">${this.__('payment_successful')}</h3>
            <p style="color: #64748b; margin-bottom: 8px;">${this.__('invoice_number')}: <strong>${invoiceName}</strong></p>`;
        
        if (change > 0) {
            message += `<div style="background: #f0fdf4; padding: 12px; border-radius: 8px; margin-top: 12px;">
                <span style="color: #15803d;">${this.__('change_due')}: </span>
                <strong style="color: #15803d; font-size: 1.25rem;">${this.formatCurrency(change)}</strong>
            </div>`;
        }
        
        // Add print buttons
        message += `
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                <button class="btn btn-primary btn-print-invoice" data-invoice="${invoiceName}" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    ${this.__('print_receipt')}
                </button>
                <button class="btn btn-secondary btn-new-sale" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    ${this.__('new_sale')}
                </button>
            </div>
        `;
        
        message += '</div>';
        
        const dialog = frappe.msgprint({
            title: this.__('success'),
            indicator: 'green',
            message: message
        });
        
        // Bind print button click
        setTimeout(() => {
            $('.btn-print-invoice').on('click', (e) => {
                const invoiceId = $(e.currentTarget).data('invoice');
                this.printInvoice(invoiceId);
            });
            
            $('.btn-new-sale').on('click', () => {
                dialog.hide();
            });
        }, 100);
        
        this.playSound('success');
    }
    
    // Print invoice
    async printInvoice(invoiceName) {
        try {
            // Check if thermal printer is available
            if (this.printer && this.state.settings?.enable_thermal_print) {
                // Get receipt data
                const response = await frappe.call({
                    method: 'smart_pos.smart_pos.api.pos_api.get_print_receipt_data',
                    args: { invoice_name: invoiceName }
                });
                
                if (response.message) {
                    const receiptData = response.message;
                    receiptData.change = this.lastInvoiceChange || 0;
                    await this.printer.printReceipt(receiptData);
                    frappe.show_alert({ message: this.__('print_sent'), indicator: 'green' });
                }
            } else {
                // Use standard Frappe print
                const printFormat = this.state.profile?.print_format || this.state.settings?.default_print_format || 'POS Invoice';
                
                // Open print dialog
                frappe.ui.get_print_settings(false, (print_settings) => {
                    const w = frappe.urllib.get_full_url(
                        '/api/method/frappe.utils.print_format.download_pdf?' +
                        'doctype=' + encodeURIComponent('POS Invoice') +
                        '&name=' + encodeURIComponent(invoiceName) +
                        '&format=' + encodeURIComponent(printFormat) +
                        '&no_letterhead=0' +
                        '&letterhead=' + encodeURIComponent(frappe.boot.sysdefaults.letter_head || '') +
                        '&settings=' + encodeURIComponent(JSON.stringify(print_settings))
                    );
                    
                    // Open in new window for printing
                    const printWindow = window.open(w, '_blank');
                    if (printWindow) {
                        printWindow.focus();
                    }
                });
            }
        } catch (error) {
            console.error('Print error:', error);
            frappe.show_alert({ message: this.__('print_error'), indicator: 'red' });
        }
    }
    
    // =============================================================================
    // Session Close
    // =============================================================================
    
    async showCloseSessionModal() {
        const sessionId = this.state.session?.session_id || this.state.session?.name;
        if (!this.state.session || !sessionId) {
            frappe.msgprint(this.__('no_active_session'));
            return;
        }
        
        try {
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.pos_api.get_session_summary',
                args: { session_id: sessionId }
            });
            
            const summary = response.message?.session || {};
            
            $('#session-opening-cash').html(this.formatCurrency(summary.opening_cash || 0));
            $('#session-cash-sales').html(this.formatCurrency(summary.total_sales || 0));
            $('#session-card-sales').html(this.formatCurrency(summary.total_returns || 0));
            
            const expectedCash = (summary.opening_cash || 0) + (summary.total_sales || 0) - (summary.total_returns || 0);
            $('#session-expected-cash').html(this.formatCurrency(expectedCash));
            
            this.state.expectedCash = expectedCash;
            
            this.$closeSessionModal.show();
            
        } catch (error) {
            console.error('Failed to get session summary:', error);
        }
    }
    
    async closeSession() {
        const actualCash = parseFloat($('#closing-cash').val()) || 0;
        const notes = $('#closing-notes').val();
        
        this.showLoading(this.__('loading_pos'));
        
        try {
            // Sync any pending data first
            this.showSyncingStatus();
            await window.POSSyncEngine.syncAll();
            
            // Close session
            const sessionId = this.state.session?.session_id || this.state.session?.name;
            const response = await frappe.call({
                method: 'smart_pos.smart_pos.api.pos_api.close_session',
                args: {
                    session_id: sessionId,
                    actual_cash: actualCash,
                    notes: notes
                }
            });
            
            if (response.message) {
                frappe.show_alert({ message: this.__('session_closed'), indicator: 'green' });
                
                // Clear local data
                this.state.session = null;
                this.state.cart = [];
                this.state.customer = null;
                
                this.$closeSessionModal.hide();
                this.showSessionModal();
            }
            
        } catch (error) {
            console.error('Failed to close session:', error);
            frappe.msgprint({
                title: this.__('error'),
                indicator: 'red',
                message: error.message
            });
        } finally {
            this.hideLoading();
            this.updateOnlineStatus(navigator.onLine);
        }
    }
    
    // =============================================================================
    // POS Display
    // =============================================================================
    
    showPOS() {
        this.$sessionModal.hide();
        this.$posMain.show();
        
        // Update header info
        $('#session-profile').text(this.state.profile.name);
        $('#session-user').text(frappe.session.user_fullname);
        
        // Show offline indicator if in offline mode
        if (this.state.isOffline || !navigator.onLine) {
            this.updateOnlineStatus(false);
            frappe.show_alert({
                message: '📴 ' + this.__('offline') + ' - Working in offline mode',
                indicator: 'orange'
            }, 5);
        }
        
        // Show sync status
        this.showOfflineDataStatus();
        
        // Focus on search
        $('#product-search').focus();
    }
    
    async showOfflineDataStatus() {
        const itemsCount = this.state.items?.length || 0;
        const customersCount = this.state.customers?.length || 0;
        const pendingInvoices = await window.POSDatabase.getUnsyncedInvoices();
        
        if (pendingInvoices.length > 0) {
            frappe.show_alert({
                message: `📤 ${pendingInvoices.length} invoice(s) pending sync`,
                indicator: 'blue'
            }, 5);
        }
        
        console.log('📊 Offline data status:', {
            items: itemsCount,
            customers: customersCount,
            pendingInvoices: pendingInvoices.length
        });
    }
    
    // =============================================================================
    // Event Bindings
    // =============================================================================
    
    bindEvents() {
        const self = this;
        
        // Session Modal
        $('#start-session-btn').on('click', () => this.startSession());
        
        // Product Search
        $('#product-search').on('input', debounce(function() {
            self.state.searchQuery = $(this).val();
            self.state.currentPage = 1;
            self.renderProducts();
        }, 300));
        
        $('#clear-search').on('click', () => {
            $('#product-search').val('');
            this.state.searchQuery = '';
            this.state.currentPage = 1;
            this.renderProducts();
        });
        
        // Category selection
        $(document).on('click', '.pos-category-btn', function() {
            $('.pos-category-btn').removeClass('active');
            $(this).addClass('active');
            self.state.selectedGroup = $(this).data('group');
            self.state.currentPage = 1;
            self.renderProducts();
        });
        
        // Product click
        $(document).on('click', '.pos-product-card', function() {
            const itemCode = String($(this).data('item-code'));
            self.addToCart(itemCode);
        });
        
        // Pagination
        $('#prev-page').on('click', () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.renderProducts();
            }
        });
        
        $('#next-page').on('click', () => {
            this.state.currentPage++;
            this.renderProducts();
        });
        
        // Cart operations
        $(document).on('click', '.qty-minus', function() {
            const index = $(this).data('index');
            const currentQty = self.state.cart[index].qty;
            self.updateCartItem(index, 'qty', currentQty - 1);
        });
        
        $(document).on('click', '.qty-plus', function() {
            const index = $(this).data('index');
            const currentQty = self.state.cart[index].qty;
            self.updateCartItem(index, 'qty', currentQty + 1);
        });
        
        $(document).on('change', '.qty-input', function() {
            const index = $(this).data('index');
            self.updateCartItem(index, 'qty', $(this).val());
        });
        
        $(document).on('click', '.cart-item-remove', function() {
            const index = $(this).data('index');
            self.removeFromCart(index);
        });
        
        $('#btn-clear-cart').on('click', () => {
            if (this.state.cart.length > 0) {
                frappe.confirm('Clear all items from cart?', () => {
                    this.clearCart();
                });
            }
        });
        
        // Customer
        $('#add-customer-btn').on('click', () => {
            this.$customerModal.show();
        });
        
        $('#remove-customer').on('click', () => {
            this.state.customer = null;
            this.updateCustomerDisplay();
        });
        
        $('#customer-search input').on('input', debounce(function() {
            const query = $(this).val();
            const results = self.searchCustomers(query);
            // Show dropdown with results
            // TODO: Implement customer dropdown
        }, 300));
        
        $('#save-customer').on('click', () => this.addNewCustomer());
        $('#cancel-customer, #close-customer-modal').on('click', () => this.$customerModal.hide());
        
        // Payment
        $('#pay-btn').on('click', () => this.showPaymentModal());
        $('#cancel-payment').on('click', () => this.$paymentModal.hide());
        
        // Clear cart
        $('#clear-cart').on('click', () => {
            if (this.state.cart.length > 0) {
                frappe.confirm(this.__('clear_cart_confirm'), () => {
                    this.clearCart();
                });
            }
        });
        
        // Customer selection
        $('#customer-select').on('click', () => {
            this.showCustomerModal();
        });
        
        $('#cancel-customer').on('click', () => this.$customerModal.hide());
        $('#new-customer').on('click', () => this.addNewCustomer());
        
        // Payment methods
        $(document).on('click', '.pos-payment-method', function() {
            $('.pos-payment-method').removeClass('active');
            $(this).addClass('active');
            self.state.currentPaymentMethod = $(this).data('method');
        });
        
        // Numpad
        $(document).on('click', '.pos-numpad-btn', function() {
            const value = $(this).data('value');
            self.handleNumpadInput(value);
        });
        
        // Add payment on Enter or when clicking payment amount
        $('#payment-amount-input').on('keypress', function(e) {
            if (e.key === 'Enter') {
                self.addPayment();
            }
        });
        
        $('#complete-payment').on('click', () => this.completePayment());
        
        // Success Modal
        // Not using separate success modal anymore

        // Close Session
        $('#btn-close-session').on('click', () => this.showCloseSessionModal());
        
        // Close Session modal buttons
        $('#btn-close-session').on('click', () => this.showCloseSessionModal());
        $('#cancel-close-session').on('click', () => this.$closeSessionModal.hide());
        $('#confirm-close-session').on('click', () => this.closeSession());
        
        $('#closing-cash').on('input', function() {
            const actual = parseFloat($(this).val()) || 0;
            const expected = self.state.expectedCash || 0;
            const diff = actual - expected;
            
            // Show difference indicator
            // TODO: Add visual difference indicator
        });
        
        // Header buttons
        $('#btn-sync-offline').on('click', () => this.syncOfflineData());
        
        $('#btn-fullscreen').on('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
        
        // Settings button - open Smart POS Settings
        $('#btn-settings').on('click', () => {
            frappe.set_route('Form', 'Smart POS Settings');
        });
        
        // Keyboard shortcuts
        $(document).on('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                $('#product-search').focus();
            } else if (e.key === 'F3') {
                e.preventDefault();
                this.showPaymentModal();
            } else if (e.key === 'Escape') {
                this.$paymentModal.hide();
                this.$customerModal.hide();
                this.$closeSessionModal.hide();
                this.$successModal.hide();
            }
        });
    }
    
    // =============================================================================
    // Sync & Hardware Listeners
    // =============================================================================
    
    setupSyncListeners() {
        window.POSSyncEngine.on('online', () => {
            this.state.isOffline = false;
            $('#sync-status').removeClass('offline').addClass('online').html(`
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                    <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                    <line x1="12" y1="20" x2="12.01" y2="20"/>
                </svg>
                <span>${this.__('online')}</span>
            `);
        });
        
        window.POSSyncEngine.on('offline', () => {
            this.state.isOffline = true;
            this.updateOnlineStatus(false);
        });
        
        window.POSSyncEngine.on('syncStart', () => {
            this.showSyncingStatus();
        });
        
        window.POSSyncEngine.on('syncComplete', () => {
            this.updateOnlineStatus(navigator.onLine);
        });
    }
    
    showCustomerModal() {
        this.renderCustomerList();
        this.$customerModal.show();
    }
    
    renderCustomerList() {
        const $list = $('#customer-list');
        
        if (this.state.customers.length === 0) {
            $list.html(`
                <div class="pos-no-customers">
                    <p>${this.__('no_customers')}</p>
                </div>
            `);
        } else {
            $list.html(this.state.customers.slice(0, 20).map(c => `
                <div class="pos-customer-item" data-customer="${c.name}">
                    <div class="pos-customer-avatar">
                        ${c.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div class="pos-customer-details">
                        <div class="pos-customer-name">${c.customer_name}</div>
                        <div class="pos-customer-mobile">${c.mobile_no || '-'}</div>
                    </div>
                </div>
            `).join(''));
            
            // Bind click events
            $list.find('.pos-customer-item').on('click', (e) => {
                const customerName = $(e.currentTarget).data('customer');
                const customer = this.state.customers.find(c => c.name === customerName);
                if (customer) {
                    this.selectCustomer(customer);
                    this.$customerModal.hide();
                }
            });
        }
    }
    
    updateCustomerDisplay() {
        if (this.state.customer) {
            $('#selected-customer-name').text(this.state.customer.customer_name);
        } else {
            $('#selected-customer-name').text(this.__('default_customer'));
        }
    }
    
    setupHardwareListeners() {
        window.POSHardware.on('barcodeScan', (barcode) => {
            console.log('Barcode scanned:', barcode);
            
            // Search for item by barcode
            const item = this.state.items.find(i => 
                i.barcodes && i.barcodes.includes(barcode)
            );
            
            if (item) {
                this.addToCart(item.item_code);
            } else {
                frappe.show_alert({ message: this.__('product_not_found') + ': ' + barcode, indicator: 'orange' });
            }
        });
    }
    
    // =============================================================================
    // Utilities
    // =============================================================================
    
    formatCurrency(amount) {
        return frappe.format(amount, { fieldtype: 'Currency' });
    }
    
    getDeviceId() {
        let deviceId = localStorage.getItem('pos_device_id');
        if (!deviceId) {
            deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('pos_device_id', deviceId);
        }
        return deviceId;
    }
    
    playSound(type) {
        // Use Web Audio API for sound effects (no external files needed)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different sounds for different actions
            switch(type) {
                case 'add':
                case 'beep':
                    oscillator.frequency.value = 800;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'success':
                    oscillator.frequency.value = 600;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    setTimeout(() => {
                        oscillator.frequency.value = 800;
                    }, 100);
                    setTimeout(() => {
                        oscillator.frequency.value = 1000;
                    }, 200);
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
                case 'error':
                    oscillator.frequency.value = 300;
                    oscillator.type = 'square';
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.3);
                    break;
                default:
                    oscillator.frequency.value = 500;
                    oscillator.type = 'sine';
                    gainNode.gain.value = 0.1;
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.1);
            }
        } catch (e) {
            // Ignore audio errors silently
        }
    }
    
    // =============================================================================
    // Offline Data Sync
    // =============================================================================
    
    async syncOfflineData() {
        if (!navigator.onLine) {
            frappe.msgprint({
                title: '📴 Offline',
                indicator: 'orange',
                message: 'You are offline. Connect to internet to sync data.'
            });
            return;
        }
        
        this.showLoading('Syncing offline data...');
        this.showSyncingStatus();
        
        try {
            // 1. Sync pending invoices
            const pendingInvoices = await window.POSDatabase.getUnsyncedInvoices();
            let syncedCount = 0;
            let errorCount = 0;
            
            for (const invoice of pendingInvoices) {
                try {
                    const response = await frappe.call({
                        method: 'smart_pos.smart_pos.api.pos_api.create_pos_invoice',
                        args: { invoice_data: JSON.stringify(invoice) }
                    });
                    
                    if (response.message && response.message.name) {
                        await window.POSDatabase.markInvoiceSynced(invoice.offline_id, response.message.name);
                        syncedCount++;
                    }
                } catch (e) {
                    console.error('Failed to sync invoice:', invoice.offline_id, e);
                    errorCount++;
                }
            }
            
            // 2. Refresh items and customers from server
            await this.loadItems(true);
            await this.loadCustomers();
            
            // 3. Update sync timestamp
            await window.POSDatabase.setLastSyncTime(new Date().toISOString());
            
            // Show result
            let message = `✅ Sync completed!\n`;
            message += `📤 ${syncedCount} invoice(s) synced\n`;
            message += `📦 ${this.state.items.length} items cached\n`;
            message += `👥 ${this.state.customers.length} customers cached`;
            
            if (errorCount > 0) {
                message += `\n⚠️ ${errorCount} invoice(s) failed`;
            }
            
            frappe.show_alert({
                message: message.replace(/\n/g, '<br>'),
                indicator: errorCount > 0 ? 'orange' : 'green'
            }, 7);
            
            this.updateOnlineStatus(true);
            
        } catch (error) {
            console.error('Sync error:', error);
            frappe.msgprint({
                title: 'Sync Error',
                indicator: 'red',
                message: error.message
            });
        } finally {
            this.hideLoading();
        }
    }
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
