// src/index.js
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
        
        // Escucha cambios en el service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
          
          });
        });
      })
      .catch((registrationError) => {
        
        // Intenta registrar un service worker básico como fallback
        navigator.serviceWorker.register('/sw.js')
          .then((fallbackRegistration) => {
          
          })
          .catch((fallbackError) => {
            // Se ignora el error del fallback intencionalmente
          });
      });

    // Escucha cambios en el estado del service worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      
    });
  });

  // Maneja mensajes del service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    
    // Puedes manejar mensajes específicos del service worker aquí
    if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
      
    }
  });
} else {
  
}

// Verificar compatibilidad con notificaciones
if (!('Notification' in window)) {
  
} else {
  
}

// Verificar compatibilidad con Push Manager
if (!('PushManager' in window)) {
  
} else {
  
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