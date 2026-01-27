import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { UserContext } from './UserContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loadingUser } = useContext(UserContext);
  const storageKey = user ? `cart_user_${user.id}` : 'cart_guest';
  
  const [cart, setCart] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // NUEVOS estados para saber si cargamos carrito desde el servidor y si está vacío en BD
  const [serverCartLoaded, setServerCartLoaded] = useState(false);
  const [serverCartEmpty, setServerCartEmpty] = useState(false);

  // URLs de la API - memoizadas
  const API_URL = process.env.REACT_APP_API_URL;
  const endpoints = useMemo(() => ({
    GUARDAR_CARRITO: `${API_URL}/carrito/guardar`,
    OBTENER_CARRITO: `${API_URL}/carrito/obtener`,
    LIMPIAR_CARRITO: `${API_URL}/carrito/limpiar`
  }), [API_URL]);

  // Cargar carrito cuando el usuario cambia
  useEffect(() => {
    if (loadingUser) return;

    const loadCart = async () => {
      setServerCartLoaded(false);
      setServerCartEmpty(false);

      if (user) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${endpoints.OBTENER_CARRITO}/${user.id}`, {
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          // si hay redirect (backend devolvió redirect HTML) o follow produjo cross-origin, forzamos logout
          if (response.redirected || (response.status >= 300 && response.status < 400)) {
            console.warn('loadCart: detected redirected response, forcing SPA logout');
            window.dispatchEvent(new Event('auth:logout'));
            return;
          }

          if (response.ok) {
            const cartFromDB = await response.json();
            setCart(cartFromDB);
            setServerCartLoaded(true);
            setServerCartEmpty(Array.isArray(cartFromDB) && cartFromDB.length === 0);
            try { localStorage.setItem(storageKey, JSON.stringify(cartFromDB)); } catch(e) { /* ignore */ }
          } else {
            if (response.status === 401 || response.status === 403) {
              window.dispatchEvent(new Event('auth:logout'));
              return;
            }
            setServerCartLoaded(false);
            const saved = localStorage.getItem(storageKey);
            if (saved) {
              try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
            }
          }
        } catch (error) {
          // Si hay error de red (posible redirect bloqueado por CORS), usamos localStorage como fallback.
          console.warn('loadCart fetch error:', error);
          setServerCartLoaded(false);
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
          }
        }
      } else {
        setServerCartLoaded(false);
        setServerCartEmpty(false);
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try { setCart(JSON.parse(saved)); } catch (e) { setCart([]); }
        }
      }
    };

    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingUser, storageKey, endpoints.OBTENER_CARRITO]);

  // Sincronizar carrito con BD cuando el usuario está logueado
  const syncCartWithDB = useCallback(async (cartData) => {
    if (!user || syncing) return;

    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(endpoints.GUARDAR_CARRITO, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cliente_id: user.id,
          carrito: cartData
        })
        // Note: no credentials: 'include' because we use Bearer tokens
      });

      // Si la respuesta fue redirect o 3xx -> probablemente el backend no aceptó la autenticación
      if (response.redirected || (response.status >= 300 && response.status < 400)) {
        console.warn('syncCartWithDB: detected redirect response, forcing SPA logout');
        window.dispatchEvent(new Event('auth:logout'));
        return;
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.dispatchEvent(new Event('auth:logout'));
        } else {
          // opcional: manejar otros errores (logging)
          console.warn('syncCartWithDB: response not ok', response.status);
        }
      }
    } catch (error) {
      // Si fetch falla por CORS/redirect/network, forzamos logout para evitar que el navegador siga redirects cross-origin
      // y quede el SPA en estado inconsistente.
      console.warn('syncCartWithDB fetch error:', error);
      // Si quieres ser más agresivo: descomenta la siguiente línea.
      // window.dispatchEvent(new Event('auth:logout'));
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, endpoints.GUARDAR_CARRITO]);

  useEffect(() => {
    // ⛔ NO sincronizar hasta que el carrito del servidor esté cargado
    if (loadingUser || syncing || !serverCartLoaded) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) {}

    if (user) {
      syncCartWithDB(cart);
    }
  }, [
    cart,
    storageKey,
    loadingUser,
    user,
    syncing,
    serverCartLoaded,
    syncCartWithDB
  ]);


  /**
   * updateCartItemStock
   */
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
        try { localStorage.removeItem(storageKey); } catch(e) { /* ignore */ }
        (async () => {
          if (user) {
            try {
              const token = localStorage.getItem('token');
              await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
                method: 'DELETE',
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
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
      try {
        const token = localStorage.getItem('token');
        await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });
      } catch (error) {
        // ignore
      }
    }
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const clearCartAfterPurchase = useCallback(async () => {
    if (user) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });
      } catch (error) {
        //ignore
      }
    }
    try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
    setCart([]);
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const syncCartOnLogout = useCallback(async () => {
    if (user && cart.length > 0) {
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
