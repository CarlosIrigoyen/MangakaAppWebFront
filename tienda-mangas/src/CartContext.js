// src/CartContext.js

import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { UserContext } from './UserContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loadingUser } = useContext(UserContext);
  const storageKey = user ? `cart_user_${user.id}` : 'cart_guest';
  
  const [cart, setCart] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;

  const endpoints = useMemo(() => ({
    GUARDAR_CARRITO: `${API_URL}/carrito/guardar`,
    OBTENER_CARRITO: `${API_URL}/carrito/obtener`,
  }), [API_URL]);

  // --------------------------------------------
  // CARGAR CARRITO DESDE BD O LOCAL STORAGE
  // --------------------------------------------
  useEffect(() => {
    if (loadingUser) return;

    const loadCart = async () => {
      if (user) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${endpoints.OBTENER_CARRITO}/${user.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const cartBD = await response.json();
            setCart(cartBD);

            try {
              localStorage.setItem(storageKey, JSON.stringify(cartBD));
            } catch (e) {}
          } else {
            const saved = localStorage.getItem(storageKey);
            if (saved) setCart(JSON.parse(saved));
          }
        } catch (e) {
          console.error("Error cargando carrito DB:", e);
          const saved = localStorage.getItem(storageKey);
          if (saved) setCart(JSON.parse(saved));
        }
      } else {
        const saved = localStorage.getItem(storageKey);
        if (saved) setCart(JSON.parse(saved));
      }
    };

    loadCart();
  }, [user, loadingUser, storageKey, endpoints.OBTENER_CARRITO]);

  // --------------------------------------------
  // SINCRONIZAR CARRITO A LA BD
  // --------------------------------------------
  const syncCartWithDB = useCallback(async (cartData) => {
    if (!user) return false;

    setSyncing(true);
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(endpoints.GUARDAR_CARRITO, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({
          cliente_id: user.id,
          carrito: cartData
        })
      });

      if (!res.ok) {
        console.error("❌ Error en syncCartWithDB", await res.text());
        return false;
      }

      return true;

    } catch (error) {
      console.error("❌ Error grave en syncCartWithDB:", error);
      return false;
    } finally {
      setSyncing(false);
    }
  }, [user, endpoints.GUARDAR_CARRITO]);

  // --------------------------------------------
  // GUARDAR AUTOMÁTICAMENTE EN BD Y LOCAL
  // --------------------------------------------
  useEffect(() => {
    if (loadingUser || syncing) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (e) {}

    if (user) {
      syncCartWithDB(cart);
    }
  }, [cart, storageKey, user, loadingUser, syncing, syncCartWithDB]);

  // --------------------------------------------
  // AGREGAR AL CARRITO
  // --------------------------------------------
  const addToCart = useCallback((item) => {
    const existing = cart.find(c => c.id === item.id);

    if (existing) {
      if (existing.quantity < item.stock) {
        updateCartItem(item.id, existing.quantity + 1);
      } else {
        alert(`Stock disponible: ${item.stock}`);
      }
    } else {
      if (item.stock > 0) {
        setCart(prev => [...prev, { ...item, quantity: 1 }]);
      } else {
        alert("Este producto no tiene stock.");
      }
    }
  }, [cart]);

  // --------------------------------------------
  // ACTUALIZAR CANTIDAD
  // --------------------------------------------
  const updateCartItem = useCallback((id, quantity) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id === id) {
          const finalQty = Math.min(quantity, item.stock);
          if (finalQty < quantity) {
            alert(`Stock disponible: ${item.stock}`);
          }
          return { ...item, quantity: finalQty };
        }
        return item;
      })
    );
  }, []);

  // --------------------------------------------
  // ELIMINAR ITEM INDIVIDUAL
  // --------------------------------------------
  const removeCartItem = useCallback((id) => {
    if (cart.length === 1) {
      clearCart();
      return;
    }
    setCart(prev => prev.filter(item => item.id !== id));
  }, [cart.length]);

  // --------------------------------------------
  // VACÍAR CARRITO (AHORA TAMBIÉN BD)
  // --------------------------------------------
  const clearCart = useCallback(async () => {
    setCart([]);

    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}

    if (user) {
      await syncCartWithDB([]); // <- ESTA LÍNEA SOLUCIONA TU PROBLEMA
    }
  }, [storageKey, user, syncCartWithDB]);

  // --------------------------------------------
  // VACÍAR DESPUÉS DE PAGO
  // --------------------------------------------
  const clearCartAfterPurchase = useCallback(async () => {
    if (user) {
      const ok = await syncCartWithDB([]);
      if (!ok) return false;
    }

    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}

    setCart([]);
    return true;
  }, [user, storageKey, syncCartWithDB]);

  // --------------------------------------------
  // SINCRONIZAR AL CERRAR SESIÓN
  // --------------------------------------------
  const syncCartOnLogout = useCallback(async () => {
    if (user && cart.length > 0) {
      const ok = await syncCartWithDB(cart);

      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}

      return ok;
    }
    return true;
  }, [user, cart, storageKey, syncCartWithDB]);

  // --------------------------------------------
  // CONTEXTO
  // --------------------------------------------
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
