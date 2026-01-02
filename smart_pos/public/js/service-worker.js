/**
 * Smart POS Service Worker
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'smart-pos-v2';
const STATIC_CACHE = 'smart-pos-static-v2';
const DYNAMIC_CACHE = 'smart-pos-dynamic-v2';

// Files to cache immediately
const STATIC_FILES = [
    '/assets/smart_pos/js/pos_database.js',
    '/assets/smart_pos/js/pos_sync.js',
    '/assets/smart_pos/js/pos_hardware.js',
    '/assets/smart_pos/js/pos_performance.js',
    '/assets/smart_pos/js/pos_hold_recall.js',
    '/assets/smart_pos/js/pos_shortcuts.js',
    '/assets/smart_pos/js/pos_discount.js',
    '/assets/smart_pos/js/pos_printer.js',
    '/assets/smart_pos/js/smart_pos.bundle.js',
    '/assets/smart_pos/css/smart_pos.css',
    '/assets/smart_pos/images/placeholder.png',
    '/app/pos-terminal'
];

// API endpoints to cache
const API_CACHE_ROUTES = [
    '/api/method/smart_pos.smart_pos.api.pos_api.get_smart_pos_settings',
    '/api/method/smart_pos.smart_pos.api.pos_api.get_pos_profiles',
    '/api/method/smart_pos.smart_pos.api.pos_api.get_pos_profile_data',
    '/api/method/smart_pos.smart_pos.api.pos_api.get_all_items_for_offline',
    '/api/method/smart_pos.smart_pos.api.pos_api.get_all_customers_for_offline'
];

// Install event - cache static files
self.addEventListener('install', event => {
    console.log('[Smart POS SW] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[Smart POS SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .catch(error => {
                console.error('[Smart POS SW] Error caching static files:', error);
            })
    );
    
    // Take control immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[Smart POS SW] Activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('smart-pos-') && 
                                   name !== STATIC_CACHE && 
                                   name !== DYNAMIC_CACHE)
                    .map(name => {
                        console.log('[Smart POS SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    
    // Claim all clients
    return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Chrome extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Strategy: Cache First for static assets
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }
    
    // Strategy: Network First for API calls
    if (isAPICall(url)) {
        event.respondWith(networkFirst(request));
        return;
    }
    
    // Strategy: Network First with Cache Fallback for pages
    event.respondWith(networkFirstWithCacheFallback(request));
});

// Check if URL is a static asset
function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
    return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Check if URL is an API call
function isAPICall(url) {
    return url.pathname.includes('/api/method/');
}

// Cache First strategy
async function cacheFirst(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
        
    } catch (error) {
        console.error('[Smart POS SW] Cache First error:', error);
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Network First strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful API responses
            if (shouldCacheAPIResponse(request.url)) {
                const cache = await caches.open(DYNAMIC_CACHE);
                cache.put(request, networkResponse.clone());
            }
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('[Smart POS SW] Network failed, trying cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline response for API calls
        return new Response(
            JSON.stringify({ 
                message: null, 
                exc_type: 'NetworkError',
                _server_messages: JSON.stringify([
                    { message: 'You are offline. Please check your connection.' }
                ])
            }), 
            { 
                status: 503, 
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Network First with Cache Fallback
async function networkFirstWithCacheFallback(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('[Smart POS SW] Network failed for page, trying cache');
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page
        return caches.match('/app/pos-terminal');
    }
}

// Check if API response should be cached
function shouldCacheAPIResponse(url) {
    return API_CACHE_ROUTES.some(route => url.includes(route));
}

// Background Sync - register sync task
self.addEventListener('sync', event => {
    console.log('[Smart POS SW] Background sync triggered:', event.tag);
    
    if (event.tag === 'smart-pos-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Perform background sync
async function doBackgroundSync() {
    try {
        // Notify all clients to sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                action: 'START'
            });
        });
        
        console.log('[Smart POS SW] Background sync completed');
        
    } catch (error) {
        console.error('[Smart POS SW] Background sync error:', error);
        throw error; // This will trigger a retry
    }
}

// Push Notification handling
self.addEventListener('push', event => {
    console.log('[Smart POS SW] Push notification received');
    
    let data = { title: 'Smart POS', body: 'New notification' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: '/assets/smart_pos/images/icon-192.png',
        badge: '/assets/smart_pos/images/badge-72.png',
        vibrate: [100, 50, 100],
        data: data.data || {},
        actions: data.actions || []
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    console.log('[Smart POS SW] Notification clicked');
    
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            // Focus existing window or open new one
            for (const client of clientList) {
                if (client.url.includes('/pos-terminal') && 'focus' in client) {
                    return client.focus();
                }
            }
            
            if (clients.openWindow) {
                return clients.openWindow('/app/pos-terminal');
            }
        })
    );
});

// Message handling from clients
self.addEventListener('message', event => {
    console.log('[Smart POS SW] Message received:', event.data);
    
    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(clearAllCaches());
            break;
            
        case 'CACHE_URLS':
            event.waitUntil(cacheUrls(event.data.urls));
            break;
    }
});

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames
            .filter(name => name.startsWith('smart-pos-'))
            .map(name => caches.delete(name))
    );
    console.log('[Smart POS SW] All caches cleared');
}

// Cache specific URLs
async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.addAll(urls);
    console.log('[Smart POS SW] URLs cached:', urls);
}

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'smart-pos-periodic-sync') {
        console.log('[Smart POS SW] Periodic sync triggered');
        event.waitUntil(doBackgroundSync());
    }
});
