import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserContext } from './UserContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loadingUser } = useContext(UserContext);
  const storageKey = user ? `cart_user_${user.id}` : 'cart_guest';
  
  const [cart, setCart] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // URLs de la API
  const API_URL = process.env.REACT_APP_API_URL;
  const GUARDAR_CARRITO_URL = `${API_URL}/carrito/guardar`;
  const OBTENER_CARRITO_URL = `${API_URL}/carrito/obtener`;
  const LIMPIAR_CARRITO_URL = `${API_URL}/carrito/limpiar`;

  // Cargar carrito cuando el usuario cambia
  useEffect(() => {
    if (loadingUser) return;

    const loadCart = async () => {
      if (user) {
        // Usuario logueado: cargar desde BD
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${OBTENER_CARRITO_URL}/${user.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const cartFromDB = await response.json();
            setCart(cartFromDB);
            
            // Sincronizar localStorage con datos de BD
            localStorage.setItem(storageKey, JSON.stringify(cartFromDB));
          } else {
            // Si hay error, cargar desde localStorage como fallback
            const saved = localStorage.getItem(storageKey);
            if (saved) setCart(JSON.parse(saved));
          }
        } catch (error) {
          console.error('Error al cargar carrito desde BD:', error);
          // Fallback a localStorage
          const saved = localStorage.getItem(storageKey);
          if (saved) setCart(JSON.parse(saved));
        }
      } else {
        // Usuario no logueado: cargar desde localStorage
        const saved = localStorage.getItem(storageKey);
        if (saved) setCart(JSON.parse(saved));
      }
    };

    loadCart();
  }, [user, loadingUser, storageKey]);

  // Sincronizar carrito con BD cuando el usuario está logueado
  const syncCartWithDB = async (cartData) => {
    if (!user || syncing) return;

    setSyncing(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(GUARDAR_CARRITO_URL, {
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
  };

  // Persistir cambios en localStorage y BD
  useEffect(() => {
    if (loadingUser || syncing) return;
    
    localStorage.setItem(storageKey, JSON.stringify(cart));
    
    if (user) {
      syncCartWithDB(cart);
    }
  }, [cart, storageKey, loadingUser, user]);

  const addToCart = (item) => {
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
        setCart([...cart, { ...item, quantity: 1 }]);
      } else {
        alert('Este producto no tiene stock disponible');
      }
    }
  };

  const updateCartItem = (itemId, quantity) => {
    setCart(cart.map(item => {
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
  };

  const removeCartItem = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Función para limpiar carrito después de compra
  const clearCartAfterPurchase = async () => {
    if (user) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${LIMPIAR_CARRITO_URL}/${user.id}`, {
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
    localStorage.removeItem(storageKey);
    setCart([]);
  };

  // Función para sincronizar carrito cuando el usuario cierra sesión
  const syncCartOnLogout = async () => {
    if (user && cart.length > 0) {
      await syncCartWithDB(cart);
    }
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      updateCartItem, 
      removeCartItem, 
      clearCart,
      clearCartAfterPurchase,
      syncCartOnLogout
    }}>
      {children}
    </CartContext.Provider>
  );
};