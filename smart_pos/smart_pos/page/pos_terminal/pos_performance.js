/**
 * Smart POS - Virtual Scrolling & Performance Optimizations
 * Copyright (c) 2026, Ahmad
 * High-performance product grid with virtual scrolling
 */

class VirtualProductGrid {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            itemHeight: 180,
            itemWidth: 160,
            gap: 16,
            buffer: 2, // Extra rows to render above/below viewport
            ...options
        };
        
        this.items = [];
        this.filteredItems = [];
        this.visibleItems = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.containerWidth = 0;
        this.columns = 4;
        this.rows = 0;
        
        this.onItemClick = options.onItemClick || (() => {});
        this.renderItem = options.renderItem || this.defaultRenderItem.bind(this);
        
        this.init();
    }
    
    init() {
        // Create structure
        this.container.innerHTML = `
            <div class="virtual-scroll-viewport" style="overflow-y: auto; height: 100%;">
                <div class="virtual-scroll-spacer"></div>
                <div class="virtual-scroll-content"></div>
            </div>
        `;
        
        this.viewport = this.container.querySelector('.virtual-scroll-viewport');
        this.spacer = this.container.querySelector('.virtual-scroll-spacer');
        this.content = this.container.querySelector('.virtual-scroll-content');
        
        // Bind events
        this.viewport.addEventListener('scroll', this.onScroll.bind(this));
        window.addEventListener('resize', this.debounce(this.recalculate.bind(this), 150));
        
        this.recalculate();
    }
    
    setItems(items) {
        this.items = items;
        this.filteredItems = items;
        this.recalculate();
        this.render();
    }
    
    filter(predicate) {
        if (typeof predicate === 'function') {
            this.filteredItems = this.items.filter(predicate);
        } else {
            this.filteredItems = this.items;
        }
        this.recalculate();
        this.render();
    }
    
    search(query, fields = ['item_name', 'item_code']) {
        if (!query || query.trim() === '') {
            this.filteredItems = this.items;
        } else {
            const searchLower = query.toLowerCase();
            this.filteredItems = this.items.filter(item => {
                return fields.some(field => {
                    const value = item[field];
                    return value && value.toString().toLowerCase().includes(searchLower);
                });
            });
        }
        this.recalculate();
        this.render();
    }
    
    recalculate() {
        this.containerWidth = this.viewport.clientWidth;
        this.containerHeight = this.viewport.clientHeight;
        
        // Calculate columns based on container width
        this.columns = Math.max(1, Math.floor((this.containerWidth + this.options.gap) / (this.options.itemWidth + this.options.gap)));
        
        // Calculate total rows
        this.rows = Math.ceil(this.filteredItems.length / this.columns);
        
        // Set spacer height
        const totalHeight = this.rows * (this.options.itemHeight + this.options.gap);
        this.spacer.style.height = totalHeight + 'px';
    }
    
    onScroll() {
        this.scrollTop = this.viewport.scrollTop;
        this.render();
    }
    
    render() {
        const rowHeight = this.options.itemHeight + this.options.gap;
        
        // Calculate visible range
        const startRow = Math.max(0, Math.floor(this.scrollTop / rowHeight) - this.options.buffer);
        const visibleRows = Math.ceil(this.containerHeight / rowHeight) + (this.options.buffer * 2);
        const endRow = Math.min(this.rows, startRow + visibleRows);
        
        // Calculate item indices
        const startIndex = startRow * this.columns;
        const endIndex = Math.min(this.filteredItems.length, endRow * this.columns);
        
        // Position content
        this.content.style.transform = `translateY(${startRow * rowHeight}px)`;
        
        // Render visible items
        const visibleItems = this.filteredItems.slice(startIndex, endIndex);
        
        this.content.innerHTML = `
            <div class="virtual-grid" style="
                display: grid;
                grid-template-columns: repeat(${this.columns}, 1fr);
                gap: ${this.options.gap}px;
            ">
                ${visibleItems.map((item, i) => this.renderItem(item, startIndex + i)).join('')}
            </div>
        `;
        
        // Bind click events
        this.content.querySelectorAll('[data-item-code]').forEach(el => {
            el.addEventListener('click', () => {
                const itemCode = el.dataset.itemCode;
                this.onItemClick(itemCode, this.filteredItems.find(i => i.item_code === itemCode));
            });
        });
    }
    
    defaultRenderItem(item, index) {
        const stockClass = item.stock_qty <= 0 ? 'out-of-stock' : '';
        const stockBadge = item.stock_qty <= 5 && item.stock_qty > 0 
            ? `<span class="low-stock-badge">${item.stock_qty} left</span>` 
            : '';
        
        return `
            <div class="pos-product-card ${stockClass}" data-item-code="${item.item_code}" data-index="${index}">
                <div class="pos-product-image">
                    ${item.image 
                        ? `<img src="${item.image}" alt="${item.item_name}" loading="lazy">` 
                        : `<div class="pos-product-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21,15 16,10 5,21"/>
                            </svg>
                           </div>`
                    }
                    ${stockBadge}
                </div>
                <div class="pos-product-info">
                    <div class="pos-product-name" title="${item.item_name}">${item.item_name}</div>
                    <div class="pos-product-price">${this.formatCurrency(item.price)}</div>
                </div>
            </div>
        `;
    }
    
    formatCurrency(amount) {
        return frappe.format(amount, { fieldtype: 'Currency' });
    }
    
    scrollToTop() {
        this.viewport.scrollTop = 0;
    }
    
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    destroy() {
        window.removeEventListener('resize', this.recalculate);
        this.container.innerHTML = '';
    }
}


/**
 * Lazy Image Loading with IntersectionObserver
 */
class LazyImageLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px 0px',
            threshold: 0.01,
            ...options
        };
        
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                this.onIntersection.bind(this),
                this.options
            );
        }
    }
    
    observe(elements) {
        if (!this.observer) {
            // Fallback for older browsers
            elements.forEach(el => this.loadImage(el));
            return;
        }
        
        elements.forEach(el => this.observer.observe(el));
    }
    
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }
    
    loadImage(element) {
        const src = element.dataset.src;
        if (src) {
            element.src = src;
            element.removeAttribute('data-src');
            element.classList.add('loaded');
        }
    }
    
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}


/**
 * Request Debouncer & Caching
 */
class RequestCache {
    constructor(maxAge = 60000) {
        this.cache = new Map();
        this.maxAge = maxAge;
        this.pendingRequests = new Map();
    }
    
    async get(key, fetchFn) {
        // Check cache
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.maxAge) {
            return cached.data;
        }
        
        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }
        
        // Make new request
        const promise = fetchFn().then(data => {
            this.cache.set(key, { data, timestamp: Date.now() });
            this.pendingRequests.delete(key);
            return data;
        }).catch(error => {
            this.pendingRequests.delete(key);
            throw error;
        });
        
        this.pendingRequests.set(key, promise);
        return promise;
    }
    
    invalidate(key) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }
    
    clear() {
        this.cache.clear();
        this.pendingRequests.clear();
    }
}


/**
 * Web Worker for heavy computations
 */
const createSearchWorker = () => {
    const workerCode = `
        let items = [];
        
        self.onmessage = function(e) {
            const { type, payload } = e.data;
            
            switch (type) {
                case 'setItems':
                    items = payload;
                    self.postMessage({ type: 'ready', count: items.length });
                    break;
                    
                case 'search':
                    const { query, fields, group } = payload;
                    let results = items;
                    
                    // Filter by group
                    if (group && group !== 'all') {
                        results = results.filter(item => item.item_group === group);
                    }
                    
                    // Search
                    if (query && query.trim()) {
                        const searchLower = query.toLowerCase();
                        results = results.filter(item => {
                            return fields.some(field => {
                                const value = item[field];
                                if (!value) return false;
                                return value.toString().toLowerCase().includes(searchLower);
                            });
                        });
                    }
                    
                    self.postMessage({ type: 'searchResults', results });
                    break;
            }
        };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
};


/**
 * Performance Monitor
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.enabled = true;
    }
    
    start(label) {
        if (!this.enabled) return;
        this.metrics[label] = {
            start: performance.now(),
            end: null,
            duration: null
        };
    }
    
    end(label) {
        if (!this.enabled || !this.metrics[label]) return;
        this.metrics[label].end = performance.now();
        this.metrics[label].duration = this.metrics[label].end - this.metrics[label].start;
        return this.metrics[label].duration;
    }
    
    log(label) {
        if (!this.enabled || !this.metrics[label]) return;
        console.log(`[POS Performance] ${label}: ${this.metrics[label].duration?.toFixed(2)}ms`);
    }
    
    getMetrics() {
        return this.metrics;
    }
    
    clear() {
        this.metrics = {};
    }
}


// Export to global
window.VirtualProductGrid = VirtualProductGrid;
window.LazyImageLoader = LazyImageLoader;
window.RequestCache = RequestCache;
window.createSearchWorker = createSearchWorker;
window.PerformanceMonitor = PerformanceMonitor;
