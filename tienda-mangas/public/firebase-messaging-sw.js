// public/firebase-messaging-sw.js

/* ================================
   CACHE OFFLINE
================================ */

const CACHE_NAME = 'mangaka-v3';

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/img/Mangaka.png',
];

// Instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando cache...');
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Activación
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado cache');

  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

/* ================================
   FETCH – CACHE DINÁMICO
================================ */

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) {
            return response;
          }

          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });

          return response;
        })
        .catch(() => {
          // Fallback SPA offline
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          return new Response('', { status: 503 });
        });
    })
  );
});

/* ================================
   FIREBASE PUSH (TU CÓDIGO)
================================ */

// 👉 A partir de acá dejás EXACTAMENTE tu código actual:

// Manejo de notificaciones push optimizado
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    return;
  }

  const notificationTitle = payload.notification?.title || 'Mangaka Baka Shop';
  const notificationOptions = {
    body: payload.notification?.body || 'Nuevo tomo disponible',
    icon: '/img/Mangaka.png',
    badge: '/img/Mangaka.png',
    tag: payload.data?.manga_id || 'general',
    data: payload.data || {},
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Click notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// Cierre notificación
self.addEventListener('notificationclose', () => {});
