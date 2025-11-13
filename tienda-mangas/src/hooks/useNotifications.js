// src/hooks/useNotifications.js
import { useState, useEffect, useContext } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, isMessagingSupported, vapidKey } from '../firebase';
import { UserContext } from '../UserContext';

export const useNotifications = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(UserContext);

  useEffect(() => {
    const initialize = async () => {
      const supported = isMessagingSupported();
      setIsSupported(supported);
      setPermission(typeof Notification !== 'undefined' ? Notification.permission : null);

      if (!supported) return;

      try {
        // Registrar SW si no está ya (esto devuelve la registration)
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service Worker registrado en useNotifications:', registration);

        // Si ya está granted, intentar obtener token (pasando la registration)
        if (Notification.permission === 'granted') {
          setLoading(true);
          try {
            const token = await getToken(messaging, {
              vapidKey: vapidKey,
              serviceWorkerRegistration: registration
            });
            console.log('✅ FCM Token obtenido al inicializar:', token);
            setFcmToken(token);
          } catch (err) {
            console.error('❌ Error obteniendo token al inicializar:', err);
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('❌ Error registrando SW en init:', err);
      }
    };

    initialize();
  }, []);

  const requestPermission = async () => {
    if (!isMessagingSupported() || !messaging) {
      console.log('Firebase Messaging no soportado en este navegador');
      return null;
    }

    setLoading(true);
    try {
      // Registrar SW y pedir permiso
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: vapidKey,
          serviceWorkerRegistration: registration
        });
        console.log('✅ FCM Token obtenido después de permisos:', token);
        setFcmToken(token);
        return token;
      } else {
        console.log('❌ Permiso denegado');
        return null;
      }
    } catch (err) {
      console.error('❌ Error en requestPermission:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isMessagingSupported() || !messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📨 Mensaje en primer plano:', payload);
      // Mostrar notificación en primer plano (opcional)
      if (Notification.permission === 'granted') {
        const title = payload.notification?.title || payload.data?.title || 'Notificación';
        const options = {
          body: payload.notification?.body || payload.data?.body || '',
          icon: payload.notification?.icon || '/img/Mangaka.png',
          data: payload.data || {}
        };
        new Notification(title, options);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  return {
    fcmToken,
    isSupported,
    permission,
    requestPermission,
    loading,
    hasPermission: permission === 'granted',
    canAskPermission: permission === 'default'
  };
};
