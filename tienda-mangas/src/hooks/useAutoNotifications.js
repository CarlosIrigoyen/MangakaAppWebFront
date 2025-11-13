// src/hooks/useAutoNotifications.js
import { useState, useEffect, useContext, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/messaging';
import { isMessagingSupported, vapidKey } from '../firebase';
import { UserContext } from '../UserContext';

// URLs de la API (usa tus variables de entorno)
const API_ACTUALIZAR_SUSCRIPCIONES = `${process.env.REACT_APP_API_URL}/suscripciones/actualizar-suscripciones`;
const API_OBTENER_TOKEN = `${process.env.REACT_APP_API_URL}/suscripciones/obtener-token`;
const API_MANGAS_DISPONIBLES = `${process.env.REACT_APP_API_URL}/suscripciones/mangas-disponibles`;
const API_MIS_SUSCRIPCIONES = `${process.env.REACT_APP_API_URL}/suscripciones/mis-suscripciones`;
const API_ACTUALIZAR_TOKEN = `${process.env.REACT_APP_API_URL}/suscripciones/actualizar-token`;

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
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token_existente) {
          console.log('✅ Token existente recuperado del backend');
          return data.token_existente;
        }
      }
    } catch (error) {
      console.error('❌ Error obteniendo token existente:', error);
    }
    return null;
  }, [user]);

  // Sincronizar token con backend
  const sincronizarTokenConBackend = async (token) => {
    if (!user || !token) {
      console.log('❌ No se puede sincronizar token: falta usuario o token');
      return false;
    }

    try {
      const userToken = localStorage.getItem('token');
      console.log('🔄 Sincronizando token con backend...');

      const response = await fetch(API_ACTUALIZAR_TOKEN, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ fcm_token: token })
      });

      const data = await response.json();
      console.log('📥 Respuesta sincronización token:', data);

      if (data.success) {
        console.log('✅ Token sincronizado correctamente con el backend');
        return true;
      } else {
        console.error('❌ Error sincronizando token:', data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error de red sincronizando token:', error);
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
      console.log('🔄 Registrando Service Worker...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('✅ Service Worker registrado:', registration);

      const messagingCompat = firebase.messaging();

      // getToken en compat acepta objeto con vapidKey y serviceWorkerRegistration
      const currentToken = await messagingCompat.getToken({
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      });

      if (!currentToken) {
        console.log('❌ No se pudo generar el token FCM');
        setLoading(false);
        return null;
      }

      console.log('✅ Token FCM actual:', currentToken.substring(0, 20) + '...');

      // 3. SI HAY TOKEN EXISTENTE: Comparar y migrar si es necesario
      if (tokenExistente && tokenExistente !== currentToken) {
        console.log('🔄 Token cambiado, migrando suscripciones...');
        console.log('📋 Token anterior:', tokenExistente.substring(0, 20) + '...');
        console.log('📋 Token actual:', currentToken.substring(0, 20) + '...');
        
        // Forzar migración actualizando el token en el backend
        await sincronizarTokenConBackend(currentToken);
      } 
      // 4. SI NO HAY TOKEN EXISTENTE: Registrar el nuevo token
      else if (!tokenExistente) {
        console.log('🆕 Registrando nuevo token en backend...');
        await sincronizarTokenConBackend(currentToken);
      }
      // 5. SI SON IGUALES: Todo está sincronizado
      else {
        console.log('✅ Tokens sincronizados correctamente');
      }

      // 6. Establecer el token actual y cargar suscripciones
      setFcmToken(currentToken);
      await cargarSuscripciones(currentToken);

      return currentToken;
    } catch (error) {
      console.error('❌ Error inicializando notificaciones:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, [isSupported, user, obtenerTokenExistente]);

  // Cargar suscripciones del usuario
  const cargarSuscripciones = async (token = fcmToken) => {
    if (!user || !token) {
      console.log('❌ No se pueden cargar suscripciones: falta usuario o token');
      return;
    }

    try {
      const userToken = localStorage.getItem('token');
      console.log('📡 Cargando suscripciones...');
      
      const response = await fetch(API_MIS_SUSCRIPCIONES, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Respuesta suscripciones:', data);
        
        if (data.success) {
          setSuscripciones(data.mangas_suscritos || []);
          console.log(`✅ ${data.mangas_suscritos?.length || 0} suscripciones cargadas`);
        }
      } else {
        console.error('❌ Error en respuesta del servidor:', response.status);
      }
    } catch (error) {
      console.error('❌ Error cargando suscripciones:', error);
    }
  };

  // Actualizar suscripciones automáticamente
  const actualizarSuscripciones = async (mangasSeleccionados, token = fcmToken) => {
    if (!user || !token) {
      console.error('❌ Faltan usuario o token FCM:', { 
        user: user?.id, 
        token: token?.substring(0, 20) + '...' 
      });
      return false;
    }

    try {
      const userToken = localStorage.getItem('token');
      const payload = {
        mangas_seleccionados: mangasSeleccionados,
        fcm_token: token
      };

      console.log('📤 Enviando suscripciones:', {
        mangasCount: mangasSeleccionados.length,
        token: token.substring(0, 20) + '...',
        payload
      });

      const response = await fetch(API_ACTUALIZAR_SUSCRIPCIONES, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Log detallado de la respuesta
      console.log('📥 Status respuesta:', response.status);
      console.log('📥 Headers respuesta:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('📥 Respuesta cruda:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Error parseando JSON:', parseError);
        return false;
      }

      console.log('📥 Respuesta parseada:', data);

      if (data.success) {
        setSuscripciones(mangasSeleccionados);
        console.log(`✅ Suscrito a ${mangasSeleccionados.length} manga(s) correctamente`);
        return true;
      } else {
        console.error('❌ Error del servidor:', data.message || 'Error desconocido');
        return false;
      }

    } catch (error) {
      console.error('❌ Error de red actualizando suscripciones:', error);
      return false;
    }
  };

  // Cargar mangas disponibles
  const cargarMangasDisponibles = async () => {
    if (!user) {
      console.log('❌ No se pueden cargar mangas: usuario no autenticado');
      return;
    }

    try {
      const userToken = localStorage.getItem('token');
      console.log('📡 Cargando mangas disponibles...');
      
      const response = await fetch(API_MANGAS_DISPONIBLES, {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Respuesta mangas disponibles:', data);
        
        if (data.success) {
          setMangasDisponibles(data.mangas || []);
          console.log(`✅ ${data.mangas?.length || 0} mangas disponibles cargados`);
        }
      } else {
        console.error('❌ Error cargando mangas disponibles:', response.status);
      }
    } catch (error) {
      console.error('❌ Error de red cargando mangas disponibles:', error);
    }
  };

  // Efecto para inicializar automáticamente cuando el usuario cambia
  useEffect(() => {
    if (user) {
      console.log('🔄 Usuario detectado, inicializando notificaciones automáticamente...', {
        userId: user.id,
        userName: user.nombre
      });
      inicializarNotificaciones();
      cargarMangasDisponibles();
    } else {
      console.log('👤 No hay usuario, limpiando estado...');
      setFcmToken(null);
      setSuscripciones([]);
      setMangasDisponibles([]);
    }
  }, [user, inicializarNotificaciones]);

  // Escuchar mensajes en primer plano (compat)
  useEffect(() => {
    if (!isSupported) {
      console.log('🔕 Firebase Messaging no soportado en este entorno');
      return;
    }

    console.log('🎯 Configurando listener de mensajes en primer plano...');
    
    try {
      const messagingCompat = firebase.messaging();

      const handler = (payload) => {
        console.log('📨 Mensaje en primer plano recibido:', payload);
        
        // Mostrar notificación incluso en primer plano
        if (Notification.permission === 'granted') {
          const title = payload.notification?.title || payload.data?.title || 'Nuevo tomo disponible';
          const body = payload.notification?.body || payload.data?.body || '';

          console.log('📢 Mostrando notificación:', { title, body });

          const options = {
            body: body,
            icon: payload.notification?.icon || '/img/Mangaka.png',
            data: payload.data || {},
            badge: '/img/Mangaka.png',
            tag: payload.data?.manga_id || 'general'
          };

          // Mostrar notificación nativa en primer plano
          new Notification(title, options);
        }
      };

      // compat usa onMessage así:
      messagingCompat.onMessage(handler);

      // Nota: compat.onMessage no devuelve un unsubscribe estándar.
      // Si necesitas evitar múltiples listeners, podrías manejar una bandera fuera del hook.
      return () => {
        // No hay forma estándar de remover handler en compat. Para evitar duplicados en
        // re-montados, considera reiniciar la página o migrar a la API modular.
      };
    } catch (err) {
      console.error('❌ Error configurando listener foreground (compat):', err);
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
    cargarSuscripciones
  };
};
