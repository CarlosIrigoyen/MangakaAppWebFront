/* ===============================
   CONFIGURACIÓN GENERAL
================================ */

const CACHE_NAME = 'mangaka-v3';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/img/Mangaka.png',
];

/* ===============================
   INSTALACIÓN
================================ */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

/* ===============================
   ACTIVACIÓN
================================ */

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      }),
    ])
  );
});

/* ===============================
   PUSH NOTIFICATIONS (Firebase)
================================ */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    return;
  }

  const title = payload.notification?.title || 'Mangaka Baka Shop';

  const options = {
    body: payload.notification?.body || 'Nuevo tomo disponible',
    icon: '/img/Mangaka.png',
    badge: '/img/Mangaka.png',
    data: payload.data || {},
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* ===============================
   CLICK EN NOTIFICACIÓN
================================ */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});

/* ===============================
   ESTRATEGIAS DE CACHE
================================ */

// Cache First → estáticos / imágenes
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

// Network First → APIs públicas
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

/* ===============================
   FETCH HANDLER
================================ */

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* ---------------------------------
     ❌ RUTAS QUE NUNCA SE CACHEAN
  ----------------------------------*/

  if (
    url.pathname.includes('/api/login') ||
    url.pathname.includes('/api/register') ||
    url.pathname.includes('/api/logout') ||
    url.pathname.includes('/api/me') ||

    // Carrito
    url.pathname.includes('/api/carrito') ||

    // Pagos
    url.pathname.includes('/api/mercadopago') ||
    url.pathname.includes('/api/paypal') ||

    // Ordenes / facturas
    url.pathname.includes('/api/orders') ||

    // Suscripciones
    url.pathname.includes('/api/suscripciones') ||

    // Webhooks
    url.pathname.includes('/api/webhook')
  ) {
    return; // siempre red
  }

  /* ---------------------------------
     ✅ APIs PÚBLICAS (Network First)
  ----------------------------------*/

  if (
    url.pathname.includes('/api/public/tomos') ||
    url.pathname.includes('/api/filters')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  /* ---------------------------------
     ✅ IMÁGENES (Cache First)
  ----------------------------------*/

  if (
    url.hostname.includes('cloudinary.com') ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  /* ---------------------------------
     ✅ RECURSOS ESTÁTICOS REACT
  ----------------------------------*/

  if (
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname === '/' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
});
