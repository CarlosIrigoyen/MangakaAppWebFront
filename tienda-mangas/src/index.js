import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importación de Bootstrap
//import 'bootstrap/dist/css/bootstrap-grid.min.css';
//import 'bootstrap/dist/css/bootstrap-utilities.min.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Registrar el service worker para notificaciones push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Primero intenta registrar el service worker de Firebase
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        // --- START: ADICIONES PARA MANEJO DE UPDATES Y NOTIFICACIONES ---
        // Si ya existe un worker esperando, avisamos de inmediato
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('swUpdated', { detail: registration }));
        }

        // Escucha cambios en el service worker: nuevo worker encontrado
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // Cuando termina de instalarse y ya hay un controller activo -> nueva versión disponible
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent('swUpdated', { detail: registration }));
            }
          });
        });
        // --- END: ADICIONES ---

        // Escucha cambios en el service worker (el bloque que ya tenías vacío)
        // (la lógica de actualización está arriba; aquí dejamos el listener original vacío intencionalmente si lo necesitás)
      })
      .catch((registrationError) => {
        // Intenta registrar un service worker básico como fallback
        navigator.serviceWorker.register('/sw.js')
          .then((fallbackRegistration) => {
            // Manejo de updatefound para el fallback (misma lógica de notificación)
            if (fallbackRegistration.waiting) {
              window.dispatchEvent(new CustomEvent('swUpdated', { detail: fallbackRegistration }));
            }
            fallbackRegistration.addEventListener('updatefound', () => {
              const newWorker = fallbackRegistration.installing;
              if (!newWorker) return;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  window.dispatchEvent(new CustomEvent('swUpdated', { detail: fallbackRegistration }));
                }
              });
            });
          })
          .catch((fallbackError) => {
            // Se ignora el error del fallback intencionalmente
          });
      });

    // Evitamos recargas múltiples: cuando el controlador cambia, recargar una sola vez
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!window.__sw_reloading) {
        window.__sw_reloading = true;
        console.log('🔄 Service Worker controller changed — recargando para activar nueva versión');
        window.location.reload();
      }
    });
  });

  // Mensajes desde el service worker (mejor manejo y re-emisión)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data) return;

    // Reemitir tipos conocidos como eventos de window para que tu app los capture fácilmente
    if (event.data.type === 'NOTIFICATION_CLICKED') {
      window.dispatchEvent(new CustomEvent('notificationClicked', { detail: event.data }));
    } else if (event.data.type === 'SW_UPDATED') {
      // Si el SW envía un mensaje explícito informando de actualización
      window.dispatchEvent(new CustomEvent('swUpdated', { detail: event.data }));
    } else {
      // Reemitimos genérico por si quieres manejar otros mensajes
      window.dispatchEvent(new CustomEvent('swMessage', { detail: event.data }));
    }
  });
} else {
  // no service worker support
}

// Verificar compatibilidad con notificaciones
if (!('Notification' in window)) {
  // No soporta Notifications
} else {
  // Soporta Notifications
}

// Verificar compatibilidad con Push Manager
if (!('PushManager' in window)) {
  // No soporta PushManager
} else {
  // Soporta PushManager
}

/**
 * Función global para aplicar la actualización desde la UI:
 * Llamar desde tu app cuando el usuario acepta "Actualizar ahora":
 * window.applySWUpdate();  o window.applySWUpdate(registration)
 */
window.applySWUpdate = async (registration) => {
  try {
    const reg = registration || (await navigator.serviceWorker.getRegistration());
    if (!reg) return console.warn('No existe registration para aplicar update');
    if (reg.waiting) {
      // manda el mensaje al SW esperando para que ejecute skipWaiting()
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      console.warn('No hay worker esperando (no se aplicó update)');
    }
  } catch (err) {
    console.error('applySWUpdate error:', err);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Si quieres empezar a medir el rendimiento en tu app, pasa una función
// para logar los resultados (por ejemplo: reportWebVitals(console.log))
// o envía a un endpoint de analytics. Aprende más: https://bit.ly/CRA-vitals
reportWebVitals();
