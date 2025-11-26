import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { UserContext } from './UserContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loadingUser } = useContext(UserContext);
  const storageKey = user ? `cart_user_${user.id}` : 'cart_guest';
  
  const [cart, setCart] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // URLs de la API - memoizadas
  const API_URL = process.env.REACT_APP_API_URL;
  const endpoints = useMemo(() => ({
    GUARDAR_CARRITO: `${API_URL}/carrito/guardar`,
    OBTENER_CARRITO: `${API_URL}/carrito/obtener`,
    LIMPIAR_CARRITO: `${API_URL}/carrito/limpiar`
  }), [API_URL]);

  // Cargar carrito cuando el usuario cambia - optimizado
  useEffect(() => {
    if (loadingUser) return;

    const loadCart = async () => {
      if (user) {
        // Usuario logueado: cargar desde BD
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${endpoints.OBTENER_CARRITO}/${user.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const cartFromDB = await response.json();
            setCart(cartFromDB);
            
            // Sincronizar localStorage con datos de BD
            try {
              localStorage.setItem(storageKey, JSON.stringify(cartFromDB));
            } catch (e) {
              console.warn('Error guardando en localStorage:', e);
            }
          } else {
            // Fallback a localStorage
            const saved = localStorage.getItem(storageKey);
            if (saved) {
              try {
                setCart(JSON.parse(saved));
              } catch (e) {
                console.error('Error parseando localStorage:', e);
                setCart([]);
              }
            }
          }
        } catch (error) {
          console.error('Error al cargar carrito desde BD:', error);
          // Fallback a localStorage
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            try {
              setCart(JSON.parse(saved));
            } catch (e) {
              console.error('Error parseando localStorage fallback:', e);
              setCart([]);
            }
          }
        }
      } else {
        // Usuario no logueado: cargar desde localStorage
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            setCart(JSON.parse(saved));
          } catch (e) {
            console.error('Error parseando localStorage guest:', e);
            setCart([]);
          }
        }
      }
    };

    loadCart();
  }, [user, loadingUser, storageKey, endpoints.OBTENER_CARRITO]);

  // Sincronizar carrito con BD cuando el usuario está logueado
  const syncCartWithDB = useCallback(async (cartData) => {
    if (!user || syncing) return;

    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(endpoints.GUARDAR_CARRITO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cliente_id: user.id,
          carrito: cartData
        })
      });
    } catch (error) {
      console.error('Error al sincronizar carrito con BD:', error);
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, endpoints.GUARDAR_CARRITO]);

  // Persistir cambios en localStorage y BD - optimizado
  useEffect(() => {
    if (loadingUser || syncing) return;
    
    // Guardar en localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) {
      console.error('Error guardando carrito en localStorage:', e);
    }
    
    // Sincronizar con BD si hay usuario
    if (user) {
      syncCartWithDB(cart);
    }
  }, [cart, storageKey, loadingUser, user, syncing, syncCartWithDB]);

  const addToCart = useCallback((item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      // Si ya existe, aumentar cantidad si hay stock
      if (existingItem.quantity < item.stock) {
        updateCartItem(item.id, existingItem.quantity + 1);
      } else {
        alert(`No hay suficiente stock. Stock disponible: ${item.stock}`);
      }
    } else {
      // Si no existe, agregar con cantidad 1
      if (item.stock > 0) {
        setCart(prevCart => [...prevCart, { ...item, quantity: 1 }]);
      } else {
        alert('Este producto no tiene stock disponible');
      }
    }
  }, [cart]);

  const updateCartItem = useCallback((itemId, quantity) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.id === itemId) {
        // No permitir más de lo que hay en stock
        const finalQuantity = Math.min(quantity, item.stock);
        if (finalQuantity < quantity) {
          alert(`No hay suficiente stock. Stock disponible: ${item.stock}`);
        }
        return { ...item, quantity: finalQuantity };
      }
      return item;
    }));
  }, []);

  const removeCartItem = useCallback((itemId) => {
    if (cart.length === 1) {
      clearCart();
      return;
    }

    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  }, [cart.length]);

  const clearCart = useCallback(async () => {
    // Borramos local inmediatamente
    setCart([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error('Error removiendo carrito del localStorage:', e);
    }

    // Si hay usuario, intentamos limpiar en BD
    if (user) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Error al limpiar carrito en BD:', error);
      }
    }
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const clearCartAfterPurchase = useCallback(async () => {
    if (user) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${endpoints.LIMPIAR_CARRITO}/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Error al limpiar carrito en BD:', error);
      }
    }
    // Limpiar siempre el localStorage
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.error('Error removing storageKey after purchase:', e);
    }
    setCart([]);
  }, [storageKey, user, endpoints.LIMPIAR_CARRITO]);

  const syncCartOnLogout = useCallback(async () => {
    if (user && cart.length > 0) {
      await syncCartWithDB(cart);
      try {
        localStorage.removeItem(storageKey);
      } catch (e) { 
        console.error('Error removing storageKey on logout:', e); 
      }
    }
  }, [user, cart, storageKey, syncCartWithDB]);

  // Memoizar el valor del contexto para evitar rerenders innecesarios
  const contextValue = useMemo(() => ({ 
    cart, 
    addToCart, 
    updateCartItem, 
    removeCartItem, 
    clearCart,
    clearCartAfterPurchase,
    syncCartOnLogout
  }), [
    cart, 
    addToCart, 
    updateCartItem, 
    removeCartItem, 
    clearCart,
    clearCartAfterPurchase,
    syncCartOnLogout
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};