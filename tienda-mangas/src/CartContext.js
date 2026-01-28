// src/CartContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
  useRef
} from 'react';
import { UserContext } from './UserContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loadingUser } = useContext(UserContext);
  const storageKey = user ? `cart_user_${user.id}` : 'cart_guest';

  const [cart, setCart] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // estados para saber si cargamos carrito desde el servidor y si está vacío en BD
  const [serverCartLoaded, setServerCartLoaded] = useState(false);
  const [serverCartEmpty, setServerCartEmpty] = useState(false);

  // URLs de la API - memoizadas
  const API_URL = process.env.REACT_APP_API_URL || '';
  const endpoints = useMemo(() => ({
    GUARDAR_CARRITO: `${API_URL}/carrito/guardar`,
    OBTENER_CARRITO: `${API_URL}/carrito/obtener`,
    LIMPIAR_CARRITO: `${API_URL}/carrito/limpiar`
  }), [API_URL]);

  // --- protección anti-spam de sync cuando hay errores repetidos (422)
  const syncFailRef = useRef({ count: 0, lastFailedAt: 0 });
  const SYNC_FAIL_THRESHOLD = 3; // después de 3 fallos, pausar
  const SYNC_FAIL_COOLDOWN_MS = 60_000; // 1 minuto

  // refs para evitar loops / debounce
  const syncingRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const lastSyncHashRef = useRef(null);

  // Cargar carrito cuando el usuario cambia (únicamente)
  useEffect(() => {
    if (loadingUser) return;

    const loadCart = async () => {
      setServerCartLoaded(false);
      setServerCartEmpty(false);

      if (user) {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            // fallback localStorage si no hay token
            const saved = localStorage.getItem(storageKey);
            if (saved) {
              try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
            } else {
              setCart([]);
            }
            setServerCartLoaded(false);
            return;
          }

          const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          };

          console.log('[loadCart] GET', `${endpoints.OBTENER_CARRITO}/${user.id}`, 'tokenExists:', !!token);
          const response = await fetch(`${endpoints.OBTENER_CARRITO}/${user.id}`, { headers });

          if (response.redirected || (response.status >= 300 && response.status < 400)) {
            window.dispatchEvent(new Event('auth:logout'));
            return;
          }

          if (response.ok) {
            const cartFromDB = await response.json();
            setCart(cartFromDB);
            setServerCartLoaded(true);
            setServerCartEmpty(Array.isArray(cartFromDB) && cartFromDB.length === 0);
            try { localStorage.setItem(storageKey, JSON.stringify(cartFromDB)); } catch (e) { /* ignore */ }
          } else {
            if (response.status === 401 || response.status === 403) {
              const token = localStorage.getItem('token');
              if (response.status === 401 || response.status === 403) {
                  // Si no había token, no forzamos el logout global (es solo estado "guest")
                  if (token) {
                    console.warn('[CartContext] 401 recibido y token presente -> forzando logout');
                    window.dispatchEvent(new Event('auth:logout'));
                  }
                  else {
                    console.log('[CartContext] 401 recibido pero no hay token -> no forzamos logout');
                  }
            return;
}
            }
            // fallback localStorage
            const saved = localStorage.getItem(storageKey);
            if (saved) {
              try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
            }
            setServerCartLoaded(false);
          }
        } catch (error) {
          console.error('[loadCart] error', error);
          // fallback localStorage
          setServerCartLoaded(false);
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
          }
        }
      } else {
        // usuario no logueado -> cargar localStorage
        setServerCartLoaded(false);
        setServerCartEmpty(false);
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
        } else {
          setCart([]);
        }
      }
    };

    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingUser, storageKey, endpoints.OBTENER_CARRITO]);

  // Función que sincroniza con el servidor (no depende de `syncing` para evitar recreaciones que causen loops)
  const syncCartWithDB = useCallback(async (cartData) => {
    if (!user) return;

    // Si hemos tenido varios fallos recientemente, evitamos reintentos inmediatos
    const now = Date.now();
    const { count, lastFailedAt } = syncFailRef.current;
    if (count >= SYNC_FAIL_THRESHOLD && (now - lastFailedAt) < SYNC_FAIL_COOLDOWN_MS) {
      console.warn('[syncCartWithDB] cooldown active');
      return; // pausa de reintentos
    }

    // Normalizamos y filtramos
    const carritoNormalized = (Array.isArray(cartData) ? cartData : [])
      .map(i => ({ id: Number(i.id), quantity: Number(i.quantity || 0) }))
      .filter(i => Number.isFinite(i.id) && i.id > 0 && Number(i.quantity) >= 1);

    const payload = { cliente_id: Number(user.id), carrito: carritoNormalized };

    // Si no hay items válidos, evitamos llamar al endpoint
    if (!Array.isArray(payload.carrito) || payload.carrito.length === 0) {
      return;
    }

    // Evitar reenvío de payload idéntico
    const currentHash = JSON.stringify(payload);
    if (lastSyncHashRef.current === currentHash) {
      // ya sincronizado recientemente con el mismo payload
      console.log('[syncCartWithDB] same payload — skipping');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[syncCartWithDB] no token - aborting sync');
      return;
    }

    // Marcar sincronización en curso (state + ref)
    setSyncing(true);
    syncingRef.current = true;

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      console.log('[syncCartWithDB] POST', endpoints.GUARDAR_CARRITO, 'payload:', payload);
      const response = await fetch(endpoints.GUARDAR_CARRITO, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      console.log('[syncCartWithDB] status', response.status);

      if (response.redirected || (response.status >= 300 && response.status < 400)) {
        window.dispatchEvent(new Event('auth:logout'));
        return;
      }

      if (!response.ok) {
        if (response.status === 422) {
          syncFailRef.current.count = (syncFailRef.current.count || 0) + 1;
          syncFailRef.current.lastFailedAt = Date.now();
        } else if (response.status === 401 || response.status === 403) {
         const token = localStorage.getItem('token');
         if (response.status === 401 || response.status === 403) {
          // Si no había token, no forzamos el logout global (es solo estado "guest")
          if (token) {
            console.warn('[CartContext] 401 recibido y token presente -> forzando logout');
            window.dispatchEvent(new Event('auth:logout'));
          } 
          else {
            console.log('[CartContext] 401 recibido pero no hay token -> no forzamos logout');
          }
  return;
}
        }
        const text = await response.text().catch(() => null);
        console.warn('[syncCartWithDB] non-ok body:', text);
        return;
      }

      // OK: guardar hash para evitar reenvíos inmediatos
      lastSyncHashRef.current = currentHash;
      // resetear contador de fallos
      syncFailRef.current.count = 0;
      syncFailRef.current.lastFailedAt = 0;
    } catch (error) {
      console.error('[syncCartWithDB] error', error);
      syncFailRef.current.count = (syncFailRef.current.count || 0) + 1;
      syncFailRef.current.lastFailedAt = Date.now();
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [user, endpoints.GUARDAR_CARRITO]);

  // Efecto que sincroniza con debounce cuando cambia el carrito
  useEffect(() => {
    // No sincronizamos hasta que hayamos cargado carrito desde servidor
    if (loadingUser || !serverCartLoaded) return;

    // Guardar localmente siempre
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) { /* ignore */ }

    // Si no hay user -> no sincronizamos al servidor
    if (!user) return;

    // Si ya hay una sincronización en curso, no lanzar nueva (la sync la limpiará)
    if (syncingRef.current) {
      console.log('[CartContext] skipping debounce sync because syncing is active');
      return;
    }

    // Debounce: esperar 800ms de inactividad antes de sincronizar
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      // protección adicional: comprobar token y cooldown
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[CartContext] debounce: no token — abort sync');
        return;
      }
      syncCartWithDB(cart);
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // intentionally NOT including `syncing` to avoid loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, storageKey, loadingUser, user, serverCartLoaded, syncCartWithDB]);

  // Resto de funciones (sin cambios significativos de lógica)
  const updateCartItemStock = useCallback((itemId, stockAvailable, desiredQuantity = null) => {
    setCart(prevCart => prevCart.map(it => {
      if (String(it.id) === String(itemId)) {
        const newStock = Number(stockAvailable ?? 0);
        let newQuantity;
        if (typeof desiredQuantity === 'number') {
          newQuantity = Math.min(Math.max(desiredQuantity, 0), newStock);
        } else {
          if (newStock <= 0) {
            newQuantity = 0;
          } else {
            newQuantity = Math.max(1, Math.min(Number(it.quantity || 1), newStock));
          }
        }
        return { ...it, stock: newStock, quantity: newQuantity };
      }
      return it;
    }));
  }, []);

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.id === item.id);
      if (existing) {
        const max = Number(existing.stock || 0);
        const desired = existing.quantity + 1;
        const final = Math.min(desired, max);
        if (final === existing.quantity) {
          alert(`No hay suficiente stock. Stock disponible: ${existing.stock}`);
          return prev;
        }
        return prev.map(ci => ci.id === item.id ? { ...ci, quantity: final } : ci);
      } else {
        if (item.stock > 0) {
          return [...prev, { ...item, quantity: 1 }];
        } else {
          alert('Este producto no tiene stock disponible');
          return prev;
        }
      }
    });
  }, []);

  const updateCartItem = useCallback((itemId, quantity) => {
    setCart(prev => prev.map(it => {
      if (it.id === itemId) {
        const max = Number(it.stock ?? 0);
        const finalQuantity = Math.min(Math.max(Number(quantity || 0), 0), max);
        if (finalQuantity < Number(quantity || 0)) {
          alert(`No hay suficiente stock. Stock disponible: ${it.stock}`);
        }
        return { ...it, quantity: finalQuantity };
      }
      return it;
    }));
  }, []);

  const removeCartItem = useCallback((itemId) => {
    setCart(prev => {
      const next = prev.filter(item => item.id !== itemId);
      if (next.length === 0) {
        try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }

        (async () => {
          if (user) {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
              await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
                method: 'DELETE',
                headers: {
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });
            } catch (error) { /* ignore */ }
          }
        })();
      }
      return next;
    });
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const clearCart = useCallback(async () => {
    setCart([]);
    try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }

    if (user) {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        // ignore
      }
    }
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const clearCartAfterPurchase = useCallback(async () => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
          // ignore
        }
      }
    }
    try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
    setCart([]);
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const syncCartOnLogout = useCallback(async () => {
    if (user && cart.length > 0) {
      // Intentamos forzar una última sincronización inmediata
      await syncCartWithDB(cart);
      try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
    }
  }, [user, cart, storageKey, syncCartWithDB]);

  // Memoizar el valor del contexto
  const contextValue = useMemo(() => ({
    cart,
    addToCart,
    updateCartItem,
    updateCartItemStock,
    removeCartItem,
    clearCart,
    clearCartAfterPurchase,
    syncCartOnLogout,
    serverCartLoaded,
    serverCartEmpty,
    syncing
  }), [
    cart,
    addToCart,
    updateCartItem,
    updateCartItemStock,
    removeCartItem,
    clearCart,
    clearCartAfterPurchase,
    syncCartOnLogout,
    serverCartLoaded,
    serverCartEmpty,
    syncing
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
