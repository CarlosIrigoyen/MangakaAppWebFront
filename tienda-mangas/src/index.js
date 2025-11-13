// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css'; // Importación de Bootstrap
import App from './App';
import reportWebVitals from './reportWebVitals';

// Registrar el service worker para notificaciones push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Primero intenta registrar el service worker de Firebase
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Service Worker de Firebase registrado correctamente:', registration);
        
        // Verifica si el service worker está activo
        if (registration.active) {
          console.log('✅ Service Worker activo y listo');
        }
        
        // Escucha cambios en el service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 Nuevo Service Worker encontrado:', newWorker);
          
          newWorker.addEventListener('statechange', () => {
            console.log('🔄 Estado del nuevo Service Worker:', newWorker.state);
          });
        });
      })
      .catch((registrationError) => {
        console.log('❌ Registro de Service Worker falló: ', registrationError);
        
        // Intenta registrar un service worker básico como fallback
        navigator.serviceWorker.register('/sw.js')
          .then((fallbackRegistration) => {
            console.log('✅ Service Worker de fallback registrado:', fallbackRegistration);
          })
          .catch((fallbackError) => {
            console.log('❌ Registro de Service Worker de fallback también falló:', fallbackError);
          });
      });

    // Escucha cambios en el estado del service worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Controller changed - Service Worker actualizado');
    });
  });

  // Maneja mensajes del service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('📨 Mensaje recibido del Service Worker:', event.data);
    
    // Puedes manejar mensajes específicos del service worker aquí
    if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
      console.log('🔔 Notificación clickeada desde Service Worker');
    }
  });
} else {
  console.log('❌ Service Workers no son soportados en este navegador');
}

// Verificar compatibilidad con notificaciones
if (!('Notification' in window)) {
  console.log('❌ Este navegador no soporta notificaciones');
} else {
  console.log('✅ Notificaciones soportadas en este navegador');
}

// Verificar compatibilidad con Push Manager
if (!('PushManager' in window)) {
  console.log('❌ Este navegador no soporta Push Messages');
} else {
  console.log('✅ Push Messages soportados en este navegador');
}

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