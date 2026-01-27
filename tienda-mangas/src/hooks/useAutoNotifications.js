// src/hooks/useAutoNotifications.js
import { useState, useEffect, useContext, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import { isMessagingSupported, vapidKey } from '../firebase';
import { UserContext } from '../UserContext';

// URLs de la API (usa tus variables de entorno)
const API_ACTUALIZAR_SUSCRIPCIONES = `${process.env.REACT_APP_API_URL}/suscripciones/actualizar-suscripciones`;
const API_MANGAS_DISPONIBLES = `${process.env.REACT_APP_API_URL}/suscripciones/mangas-disponibles`;
const API_MIS_SUSCRIPCIONES = `${process.env.REACT_APP_API_URL}/suscripciones/mis-suscripciones`;
const API_ACTUALIZAR_TOKEN = `${process.env.REACT_APP_API_URL}/suscripciones/actualizar-token`;

// bandera para evitar múltiples registros del listener en re-mounts
let foregroundListenerRegistered = false;

export const useAutoNotifications = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suscripciones, setSuscripciones] = useState([]);
  const [mangasDisponibles, setMangasDisponibles] = useState([]);
  const { user } = useContext(UserContext);

  // Verificar compatibilidad
  useEffect(() => {
    const supported = isMessagingSupported();
    setIsSupported(supported);
    setPermission(typeof Notification !== 'undefined' ? Notification.permission : null);
  }, []);

  // Obtener token existente del backend
  const obtenerTokenExistente = useCallback(async () => {
    if (!user) return null;
    try {
      const userToken = localStorage.getItem('token');
      const response = await fetch(API_OBTENER_TOKEN, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token_existente) {
         
          return data.token_existente;
        }
      }
    } catch (error) {
     //pass
    }
    return null;
  }, [user]);

  // Sincronizar token con backend
  const sincronizarTokenConBackend = async (token) => {
    if (!user || !token) {
    
      return false;
    }

    try {
      const userToken = localStorage.getItem('token');
    
      const response = await fetch(API_ACTUALIZAR_TOKEN, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ fcm_token: token }),
      });

      const data = await response.json();
    
      if (data.success) {
       
        return true;
      } else {
       
        return false;
      }
    } catch (error) {
      
      return false;
    }
  };

  // Registrar Service Worker y obtener token FCM (compat)
  const inicializarNotificaciones = useCallback(async () => {
    if (!isSupported || !user) return null;

    setLoading(true);
    try {
      // 1. Intentar recuperar token existente del backend
      const tokenExistente = await obtenerTokenExistente();

      // 2. Registrar Service Worker y obtener token actual
     
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
     
      const messagingCompat = firebase.messaging();

      // getToken en compat acepta objeto con vapidKey y serviceWorkerRegistration
      const currentToken = await messagingCompat.getToken({
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (!currentToken) {
       
        setLoading(false);
        return null;
      }

      // 3. SI HAY TOKEN EXISTENTE: Comparar y migrar si es necesario
      if (tokenExistente && tokenExistente !== currentToken) {

        // Forzar migración actualizando el token en el backend
        await sincronizarTokenConBackend(currentToken);
      }
      // 4. SI NO HAY TOKEN EXISTENTE: Registrar el nuevo token
      else if (!tokenExistente) {

        await sincronizarTokenConBackend(currentToken);
      }
      // 5. SI SON IGUALES: Todo está sincronizado
      else {
          //pass
      }

      // 6. Establecer el token actual y cargar suscripciones
      setFcmToken(currentToken);
      await cargarSuscripciones(currentToken);

      return currentToken;
    } catch (error) {
      //passs
    } finally {
      setLoading(false);
    }
    return null;
  }, [isSupported, user, obtenerTokenExistente]);

  // Cargar suscripciones del usuario
  const cargarSuscripciones = async (token = fcmToken) => {
    if (!user || !token) {
     
      return;
    }

    try {
      const userToken = localStorage.getItem('token');
     
      const response = await fetch(API_MIS_SUSCRIPCIONES, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
     
        if (data.success) {
          setSuscripciones(data.mangas_suscritos || []);
         }
      } else {
        //pass
      }
    } catch (error) {
      //pass
    }
  };

  // Actualizar suscripciones automáticamente
  const actualizarSuscripciones = async (mangasSeleccionados, token = fcmToken) => {
    if (!user || !token) {
            return false;
    }

    try {
      const userToken = localStorage.getItem('token');
      const payload = {
        mangas_seleccionados: mangasSeleccionados,
        fcm_token: token,
      };



      const response = await fetch(API_ACTUALIZAR_SUSCRIPCIONES, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });


      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
          return false;
      }

      
      if (data.success) {
        setSuscripciones(mangasSeleccionados);
              return true;
      } else {
      
        return false;
      }
    } catch (error) {
      
      return false;
    }
  };

  // Cargar mangas disponibles
  const cargarMangasDisponibles = async () => {
    if (!user) {
      
      return;
    }

    try {
      const userToken = localStorage.getItem('token');
      

      const response = await fetch(API_MANGAS_DISPONIBLES, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
      
        if (data.success) {
          setMangasDisponibles(data.mangas || []);
         }
      } else {
        //pass
      }
    } catch (error) {
      //pass
    }
  };

  // Efecto para inicializar automáticamente cuando el usuario cambia
  useEffect(() => {
    if (user) {
      
      inicializarNotificaciones();
      cargarMangasDisponibles();
    } else {
      setFcmToken(null);
      setSuscripciones([]);
      setMangasDisponibles([]);
    }
  }, [user, inicializarNotificaciones]);

  // Escuchar mensajes en primer plano (compat) — ADAPTADO PARA MÓVIL
  useEffect(() => {
    if (!isSupported) {
     
      return;
    }

    // Evitar registrar múltiples veces
    if (foregroundListenerRegistered) {
      return;
    }
    foregroundListenerRegistered = true;


    try {
      const messagingCompat = firebase.messaging();

      const handler = async (payload) => {

        // Si no hay permiso, no intentamos mostrar notificación
        if (Notification.permission !== 'granted') {
          return;
        }

        try {
          // Intentar obtener registration; si no existe, registrar SW (fallback)
          let registration = await navigator.serviceWorker.getRegistration();

          if (!registration) {
            
            try {
              registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
            
            } catch (regErr) {
            
              return;
            }
          }

          const title = payload.notification?.title || payload.data?.title || 'Nuevo tomo disponible';
          const options = {
            body: payload.notification?.body || payload.data?.body || '',
            icon: payload.notification?.icon || '/img/Mangaka.png',
            data: payload.data || {},
            badge: '/img/Mangaka.png',
            tag: payload.data?.manga_id || 'general',
          };

          
          // Mostrar notificación mediante Service Worker (permite mobile)
          registration.showNotification(title, options);
        } catch (err) {
          //pass
        }
      };

      // compat usa onMessage así:
      messagingCompat.onMessage(handler);

      // No existe unsubscribe estándar en compat; no retornamos cleanup que quite handler,
      // pero evitamos multiples registros con foregroundListenerRegistered.
    } catch (err) {
      //pass
    }
  }, [isSupported]);

  return {
    fcmToken,
    isSupported,
    permission,
    loading,
    suscripciones,
    mangasDisponibles,
    hasPermission: permission === 'granted',
    canAskPermission: permission === 'default',
    inicializarNotificaciones,
    actualizarSuscripciones,
    cargarMangasDisponibles,
    cargarSuscripciones,
  };
};
