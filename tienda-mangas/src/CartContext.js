// src/CartContext.js
import React, { createContext, useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { UserContext } from './UserContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loadingUser } = useContext(UserContext);
  // storageKey debe regenerarse cuando cambia user (ok)
  const storageKey = user ? `cart_user_${user.id}` : 'cart_guest';

  // Inicialmente null => aún no cargó (distinto de [])
  const [cart, setCart] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const [serverCartLoaded, setServerCartLoaded] = useState(false);
  const [serverCartEmpty, setServerCartEmpty] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;
  const endpoints = useMemo(() => ({
    GUARDAR_CARRITO: `${API_URL}/carrito/guardar`,
    OBTENER_CARRITO: `${API_URL}/carrito/obtener`,
    LIMPIAR_CARRITO: `${API_URL}/carrito/limpiar`
  }), [API_URL]);

  const syncFailRef = useRef({ count: 0, lastFailedAt: 0 });
  const SYNC_FAIL_THRESHOLD = 3;
  const SYNC_FAIL_COOLDOWN_MS = 60_000;

  // Helper: obtiene token actual
  const getToken = () => localStorage.getItem('token');

  // Cargar carrito cuando el usuario cambia o al init
  useEffect(() => {
    if (loadingUser) return;

    const loadCart = async () => {
      setServerCartLoaded(false);
      setServerCartEmpty(false);

      // Si hay user pero NO token -> no llamamos al backend (evita 401)
      const token = getToken();
      if (user && !token) {
        // Cargamos fallback desde localStorage y consideramos "cargado" (no hay sync)
        try {
          const saved = localStorage.getItem(storageKey);
          const parsed = saved ? JSON.parse(saved) : [];
          setCart(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setCart([]);
        } finally {
          setServerCartLoaded(true);
          setServerCartEmpty(Array.isArray(cart) && cart.length === 0);
        }
        return;
      }

      if (user && token) {
        try {
          const response = await fetch(`${endpoints.OBTENER_CARRITO}/${user.id}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          });

          if (response.redirected || (response.status >= 300 && response.status < 400)) {
            window.dispatchEvent(new Event('auth:logout'));
            return;
          }

          if (response.ok) {
            const cartFromDB = await response.json().catch(() => []);
            const safe = Array.isArray(cartFromDB) ? cartFromDB : [];
            setCart(safe);
            setServerCartLoaded(true);
            setServerCartEmpty(safe.length === 0);
            try { localStorage.setItem(storageKey, JSON.stringify(safe)); } catch(e) { /* ignore */ }
          } else {
            // Si 401/403 => token inválido -> forzar logout SPA (consistente)
            if (response.status === 401 || response.status === 403) {
              // limpiamos token local y avisamos
              localStorage.removeItem('token');
              window.dispatchEvent(new Event('auth:logout'));
              return;
            }
            // Otros errores -> fallback a localStorage
            const saved = localStorage.getItem(storageKey);
            try { setCart(saved ? JSON.parse(saved) : []); } catch (e) { setCart([]); }
            setServerCartLoaded(true);
            setServerCartEmpty((saved ? JSON.parse(saved) : []).length === 0);
          }
        } catch (error) {
          // error de red -> fallback local
          const saved = localStorage.getItem(storageKey);
          try { setCart(saved ? JSON.parse(saved) : []); } catch (e) { setCart([]); }
          setServerCartLoaded(true);
          setServerCartEmpty((saved ? JSON.parse(saved) : []).length === 0);
        }
      } else {
        // No user -> usar localStorage como fuente
        try {
          const saved = localStorage.getItem(storageKey);
          const parsed = saved ? JSON.parse(saved) : [];
          setCart(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setCart([]);
        } finally {
          setServerCartLoaded(true);
          setServerCartEmpty(Array.isArray(cart) && cart.length === 0);
        }
      }
    };

    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingUser, storageKey, endpoints.OBTENER_CARRITO]);

  // Sincronizar carrito con BD cuando el usuario está logueado y token presente
  const syncCartWithDB = useCallback(async (cartData) => {
    const token = getToken();
    if (!user || !token || syncing) return;

    const now = Date.now();
    const { count, lastFailedAt } = syncFailRef.current;
    if (count >= SYNC_FAIL_THRESHOLD && (now - lastFailedAt) < SYNC_FAIL_COOLDOWN_MS) {
      return;
    }

    setSyncing(true);
    try {
      const carritoNormalized = (Array.isArray(cartData) ? cartData : [])
        .map(i => ({
          id: Number(i.id),
          quantity: Number(i.quantity || 0)
        }))
        .filter(i => Number.isFinite(i.id) && i.id > 0 && Number(i.quantity) >= 1);

      const payload = {
        cliente_id: Number(user.id),
        carrito: carritoNormalized
      };

      if (!Array.isArray(payload.carrito) || payload.carrito.length === 0) {
        setSyncing(false);
        return;
      }

      const response = await fetch(endpoints.GUARDAR_CARRITO, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-bypass-sw': '1'
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });

      if (response.redirected || (response.status >= 300 && response.status < 400)) {
        window.dispatchEvent(new Event('auth:logout'));
        return;
      }

      if (!response.ok) {
        if (response.status === 422) {
          syncFailRef.current.count = (syncFailRef.current.count || 0) + 1;
          syncFailRef.current.lastFailedAt = Date.now();
        } else if (response.status === 401 || response.status === 403) {
          // token inválido/expirado -> limpiar token y avisar
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth:logout'));
        }
        return;
      }

      // éxito -> reset contador
      syncFailRef.current.count = 0;
      syncFailRef.current.lastFailedAt = 0;

    } catch (error) {
      syncFailRef.current.count = (syncFailRef.current.count || 0) + 1;
      syncFailRef.current.lastFailedAt = Date.now();
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, endpoints.GUARDAR_CARRITO]);

  // Guardar local y sincronizar con protecciones
  useEffect(() => {
    // Esperamos que se haya intentado cargar carrito del servidor
    if (loadingUser || syncing || !serverCartLoaded || cart === null) return;

    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch (e) {}

    // sincronizamos solo si hay usuario y token
    const token = getToken();
    if (user && token) {
      syncCartWithDB(cart);
    }
  }, [cart, storageKey, loadingUser, user, syncing, serverCartLoaded, syncCartWithDB]);

  // Reintentar carga/sync cuando el usuario hace login (evento emitido por UserContext.login)
  useEffect(() => {
    const onLogin = () => {
      // recargar carrito desde servidor ahora que hay token
      (async () => {
        setServerCartLoaded(false);
        try {
          const token = getToken();
          if (!user || !token) {
            setServerCartLoaded(true);
            return;
          }
          const resp = await fetch(`${endpoints.OBTENER_CARRITO}/${user.id}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store'
          });
          if (resp.ok) {
            const data = await resp.json().catch(() => []);
            setCart(Array.isArray(data) ? data : []);
            setServerCartLoaded(true);
            try { localStorage.setItem(storageKey, JSON.stringify(Array.isArray(data) ? data : [])); } catch(e) {}
          } else {
            setServerCartLoaded(true);
          }
        } catch (e) {
          setServerCartLoaded(true);
        }
      })();
    };

    window.addEventListener('auth:login', onLogin);
    return () => window.removeEventListener('auth:login', onLogin);
  }, [endpoints.OBTENER_CARRITO, user, storageKey]);

  // Funciones de manipulación del carrito (manejando cart === null)
  const updateCartItemStock = useCallback((itemId, stockAvailable, desiredQuantity = null) => {
    setCart(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(it => {
        if (String(it.id) === String(itemId)) {
          const newStock = Number(stockAvailable ?? 0);
          let newQuantity;

          if (typeof desiredQuantity === 'number') {
            newQuantity = Math.min(Math.max(desiredQuantity, 0), newStock);
          } else {
            if (newStock <= 0) newQuantity = 0;
            else newQuantity = Math.max(1, Math.min(Number(it.quantity || 1), newStock));
          }
          return { ...it, stock: newStock, quantity: newQuantity };
        }
        return it;
      });
    });
  }, []);

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const existing = safePrev.find(ci => ci.id === item.id);
      if (existing) {
        const max = Number(existing.stock || 0);
        const desired = existing.quantity + 1;
        const final = Math.min(desired, max);
        if (final === existing.quantity) {
          alert(`No hay suficiente stock. Stock disponible: ${existing.stock}`);
          return safePrev;
        }
        return safePrev.map(ci => ci.id === item.id ? { ...ci, quantity: final } : ci);
      } else {
        if (item.stock > 0) {
          return [...safePrev, { ...item, quantity: 1 }];
        } else {
          alert('Este producto no tiene stock disponible');
          return safePrev;
        }
      }
    });
  }, []);

  const updateCartItem = useCallback((itemId, quantity) => {
    setCart(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.map(it => {
        if (it.id === itemId) {
          const max = Number(it.stock ?? 0);
          const finalQuantity = Math.min(Math.max(Number(quantity || 0), 0), max);
          if (finalQuantity < Number(quantity || 0)) {
            alert(`No hay suficiente stock. Stock disponible: ${it.stock}`);
          }
          return { ...it, quantity: finalQuantity };
        }
        return it;
      });
    });
  }, []);

  const removeCartItem = useCallback((itemId) => {
    setCart(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const next = safePrev.filter(item => item.id !== itemId);
      if (next.length === 0) {
        try { localStorage.removeItem(storageKey); } catch(e) { /* ignore */ }
        (async () => {
          const token = getToken();
          if (user && token) {
            try {
              await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
                cache: 'no-store'
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

    const token = getToken();
    if (user && token) {
      try {
        await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
      } catch (error) { /* ignore */ }
    }
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const clearCartAfterPurchase = useCallback(async () => {
    const token = getToken();
    if (user && token) {
      try {
        await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
      } catch (error) { /* ignore */ }
    }
    try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
    setCart([]);
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const syncCartOnLogout = useCallback(async () => {
    // si hay usuario y carrito, intentamos sync (pero syncCartWithDB ya protege por token)
    if (user && Array.isArray(cart) && cart.length > 0) {
      await syncCartWithDB(cart);
      try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
    }
  }, [user, cart, storageKey, syncCartWithDB]);

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
