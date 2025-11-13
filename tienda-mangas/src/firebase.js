// src/firebase.js
// Usamos la capa compat para asegurar coherencia con firebase-messaging-sw.js
import firebase from "firebase/compat/app";
import "firebase/compat/messaging";

// Config desde variables de entorno (igual que tenías)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID // opcional
};

// Inicializar la app (si no está ya inicializada)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exporta firebase para usar firebase.messaging() (compat)
export default firebase;

// Exporta VAPID key tomada de env (si no existe, queda vacío)
export const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY || '';

// Comprobador simple de soporte de Service Workers / Push / Notifications
export function isMessagingSupported() {
  try {
    return !!(
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  } catch (e) {
    return false;
  }
}
