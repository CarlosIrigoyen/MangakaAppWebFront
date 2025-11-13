importScripts('https://www.gstatic.com/firebasejs/9.21.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.21.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDqNCzwzVWMwQYO3Y1ddf3iHmyUsvjG7CA",
  authDomain: "mangakabakashop-a74e5.firebaseapp.com",
  projectId: "mangakabakashop-a74e5",
  storageBucket: "mangakabakashop-a74e5.firebasestorage.app",
  messagingSenderId: "267190495869",
  appId: "1:267190495869:web:940324229eba7c8bfb1f14",
  measurementId: "G-TNCEGRFH8C"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Manejar notificaciones en background
  messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Notificación en background recibida:', payload);

    const notificationTitle = payload.notification?.title || 'Nuevo tomo disponible';
    const notificationOptions = {
      body: payload.notification?.body || 'Hay un nuevo tomo disponible.',
      icon: '/img/Mangaka.png',
      badge: '/img/Mangaka.png',
      data: payload.data || {},
      tag: payload.data?.manga_id || 'general', // Agrupar notificaciones del mismo manga
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

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // Manejar clics en notificaciones
  self.addEventListener('notificationclick', function(event) {
    console.log('[SW] Notificación clickeada:', event.notification);
    event.notification.close();
    
    const urlToOpen = new URL('/', self.location.origin).href;

    if (event.action === 'open' || event.action === '') {
      event.waitUntil(
        clients.matchAll({type: 'window'}).then(function(clientList) {
          // Buscar ventana existente
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          // Abrir nueva ventana
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
      );
    }
  });

  // Manejar cierre de notificaciones
  self.addEventListener('notificationclose', function(event) {
    console.log('[SW] Notificación cerrada:', event.notification);
  });

} catch (err) {
  console.error('Error inicializando Firebase en SW:', err);
}

// Manejar instalación del Service Worker
self.addEventListener('install', function(event) {
  console.log('[SW] Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Service Worker activado');
  event.waitUntil(self.clients.claim());
});