/**
 * Smart POS - Main Bundle
 * Initializes PWA and Service Worker
 */

(function() {
    'use strict';
    
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/assets/smart_pos/js/service-worker.js')
                .then(registration => {
                    console.log('Smart POS SW registered:', registration.scope);
                    
                    // Check for updates periodically
                    setInterval(() => {
                        registration.update();
                    }, 60000); // Every minute
                    
                    // Handle updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                showUpdateNotification();
                            }
                        });
                    });
                })
                .catch(error => {
                    console.error('Smart POS SW registration failed:', error);
                });
        });
    }
    
    // Show update notification
    function showUpdateNotification() {
        if (window.frappe && frappe.show_alert) {
            frappe.show_alert({
                message: 'A new version of Smart POS is available. <a href="#" onclick="window.location.reload()">Refresh</a>',
                indicator: 'blue'
            }, 10);
        }
    }
    
    // PWA Install Prompt
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button if on POS page
        setTimeout(() => {
            if (window.location.pathname.includes('pos-terminal')) {
                showInstallPrompt();
            }
        }, 5000);
    });
    
    function showInstallPrompt() {
        if (!deferredPrompt) return;
        
        if (window.frappe && frappe.show_alert) {
            frappe.show_alert({
                message: 'Install Smart POS for offline access. <a href="#" id="pwa-install-btn">Install</a>',
                indicator: 'blue'
            }, 15);
            
            $('#pwa-install-btn').on('click', async (e) => {
                e.preventDefault();
                await installPWA();
            });
        }
    }
    
    async function installPWA() {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('Smart POS PWA installed');
        }
        
        deferredPrompt = null;
    }
    
    // Expose install function globally
    window.installSmartPOS = installPWA;
    
    // Detect online/offline status
    window.addEventListener('online', () => {
        document.body.classList.remove('offline');
        if (window.frappe && frappe.show_alert) {
            frappe.show_alert({ message: 'Back online', indicator: 'green' }, 3);
        }
    });
    
    window.addEventListener('offline', () => {
        document.body.classList.add('offline');
        if (window.frappe && frappe.show_alert) {
            frappe.show_alert({ message: 'You are offline', indicator: 'orange' }, 3);
        }
    });
    
})();
