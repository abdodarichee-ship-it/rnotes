// إدارة Progressive Web App
class PWAHandler {
    constructor() {
        this.deferredPrompt = null;
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    // تهيئة PWA
    init() {
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.setupNetworkDetection();
        this.setupAppLifecycle();
    }

    // تسجيل Service Worker
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('Service Worker registered: ', registration);
                        
                        // التحقق من التحديثات
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            console.log('New Service Worker found');
                            
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    this.showUpdateNotification();
                                }
                            });
                        });
                    })
                    .catch(registrationError => {
                        console.log('Service Worker registration failed: ', registrationError);
                    });
            });

            // التحكم في التحديثات
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }

    // إعداد موجه التثبيت
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // منع المتصفح من إظهار موجه التثبيت التلقائي
            e.preventDefault();
            // حفظ الحدث لاستخدامه لاحقاً
            this.deferredPrompt = e;
            
            // إظهار زر التثبيت
            this.showInstallButton();
        });

        // التعامل مع زر التثبيت
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.addEventListener('click', () => {
                this.installApp();
            });
        }
    }

    // إظهار زر التثبيت
    showInstallButton() {
        const installBtn = document.getElementById('installBtn');
        const installStatus = document.getElementById('installStatus');
        
        if (installBtn && installStatus) {
            installBtn.style.display = 'block';
            installStatus.style.display = 'none';
        }
    }

    // تثبيت التطبيق
    async installApp() {
        if (!this.deferredPrompt) return;

        // إظهار موجه التثبيت
        this.deferredPrompt.prompt();
        
        // انتظار اختيار المستخدم
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
            this.hideInstallButton();
        } else {
            console.log('User dismissed the install prompt');
        }
        
        // مسح المرجع
        this.deferredPrompt = null;
    }

    // إخفاء زر التثبيت
    hideInstallButton() {
        const installBtn = document.getElementById('installBtn');
        const installStatus = document.getElementById('installStatus');
        
        if (installBtn && installStatus) {
            installBtn.style.display = 'none';
            installStatus.style.display = 'inline';
        }
    }

    // اكتشاف حالة الاتصال
    setupNetworkDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showConnectionStatus('الاتصال بالإنترنت متاح', 'online');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showConnectionStatus('لا يوجد اتصال بالإنترنت - التطبيق يعمل أوفلاين', 'offline');
        });

        // العرض الأولي
        this.showConnectionStatus(
            this.isOnline ? 'الاتصال بالإنترنت متاح' : 'لا يوجد اتصال بالإنترنت - التطبيق يعمل أوفلاين',
            this.isOnline ? 'online' : 'offline'
        );
    }

    // إظهار حالة الاتصال
    showConnectionStatus(message, status) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;

        const icon = statusElement.querySelector('i');
        const text = statusElement.querySelector('span');
        
        if (icon && text) {
            text.textContent = message;
            
            if (status === 'online') {
                statusElement.className = 'connection-status online';
                icon.className = 'fas fa-wifi';
            } else {
                statusElement.className = 'connection-status offline';
                icon.className = 'fas fa-wifi-slash';
            }
            
            // إظهار الرسالة لمدة 3 ثواني
            statusElement.classList.add('show');
            setTimeout(() => {
                statusElement.classList.remove('show');
            }, 3000);
        }
    }

    // إعداد دورة حياة التطبيق
    setupAppLifecycle() {
        // عند إعادة فتح التطبيق
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('App resumed');
                this.checkForUpdates();
            }
        });

        // قبل إغلاق التطبيق
        window.addEventListener('beforeunload', (e) => {
            // تأكد من حفظ جميع البيانات
            if (window.rNotesApp) {
                window.rNotesApp.forceSave();
            }
        });
    }

    // التحقق من التحديثات
    checkForUpdates() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_FOR_UPDATES'
            });
        }
    }

    // إشعار التحديث
    showUpdateNotification() {
        if (confirm('يوجد تحديث جديد للتطبيق. هل تريد تحديثه الآن؟')) {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'SKIP_WAITING'
                });
            }
        }
    }
}

// التحقق مما إذا كان التطبيق يعمل في وضع PWA
function isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
}

// تهيئة PWA عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.pwaHandler = new PWAHandler();
    
    // إذا كان التطبيق يعمل كـ PWA، قم بتطبيق بعض التحسينات
    if (isRunningAsPWA()) {
        document.body.classList.add('pwa-mode');
        console.log('Running as PWA');
    }
});