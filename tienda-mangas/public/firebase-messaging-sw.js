// public/firebase-messaging-sw.js - VERSIÓN OPTIMIZADA
const CACHE_NAME = 'mangaka-v2';
const APP_SHELL = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/img/Mangaka.png',
  '/manifest.json'
];

// Instalación optimizada
self.addEventListener('install', (event) => {
 
  
  // No cacheamos durante la instalación para mayor velocidad
  self.skipWaiting();
});

// Activación con limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Limpiar cachés antiguos
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

// Manejo de notificaciones push optimizado
self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }
  
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
      {
        action: 'open',
        title: 'Ver'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Manejo de clics en notificaciones optimizado
self.addEventListener('notificationclick', (event) => {
 
  event.notification.close();
  
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Buscar ventana existente del mismo origen
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          return client.focus().then(() => client);
        }
      }
      
      // Abrir nueva ventana si no existe
      return self.clients.openWindow(urlToOpen);
    }).catch(err => {
 
    })
  );
});

// Manejo de cierre de notificaciones
self.addEventListener('notificationclose', (event) => {
  //pass
});

// Cache estratégico para recursos críticos
self.addEventListener('fetch', (event) => {
  // Solo cacheamos recursos estáticos y el documento principal
  const url = new URL(event.request.url);
  
  // Cache para recursos estáticos
  if (url.pathname.startsWith('/static/') || 
      url.pathname === '/' ||
      url.pathname === '/manifest.json') {
    
    event.respondWith(
      caches.match(event.request).then(response => {
        // Retornar del cache si existe
        if (response) {
          return response;
        }
        
        // Hacer fetch y cachear
        return fetch(event.request).then(response => {
          // Solo cacheamos respuestas válidas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clonar la respuesta para cachear
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
    );
  }
});