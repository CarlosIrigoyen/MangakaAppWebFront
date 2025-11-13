// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Inicializar app
const app = initializeApp(firebaseConfig);

// Exportar messaging (solo se inicializa si el browser lo soporta)
let messaging = null;
const isMessagingSupported = () => {
  return typeof window !== 'undefined' &&
         'serviceWorker' in navigator &&
         'PushManager' in window &&
         'Notification' in window;
};

if (isMessagingSupported()) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.error('Error inicializando Firebase Messaging:', err);
  }
}

const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

export {
  app,
  messaging,
  isMessagingSupported,
  vapidKey
};
