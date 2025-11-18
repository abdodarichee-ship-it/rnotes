// إصدار التطبيق - تغيير هذا الرقم عند تحديث التطبيق
const CACHE_NAME = 'r-notes-v1.0.0';

// الملفات التي سيتم تخزينها في الكاش
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/db.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-900.woff2'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Service Worker: Install Completed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation Failed', error);
      })
  );
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting Old Cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activate Completed');
      return self.clients.claim();
    })
  );
});

// اعتراض الطلبات
self.addEventListener('fetch', event => {
  // تجاهل طلبات غير HTTP/HTTPS
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إذا وجد الملف في الكاش، أرجعها
        if (response) {
          return response;
        }

        // إذا لم توجد، أحملها من الشبكة
        return fetch(event.request)
          .then(response => {
            // تأكد أن الرد صالح للتخزين
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // استنسخ الرد
            const responseToCache = response.clone();

            // افتح الكاش وأضف الرد الجديد
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.log('Service Worker: Fetch Failed', error);
            
            // إذا فشل التحميل وكان الطلب لصفحة HTML، أرجع الصفحة الرئيسية
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // للطلبات الأخرى، أرجع رد افتراضي
            return new Response('لا يوجد اتصال بالإنترنت', {
              status: 408,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});

// معالجة رسائل التحديث
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});