import React, { createContext, useState, useEffect, useContext } from 'react';
import { UserContext } from './UserContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loadingUser } = useContext(UserContext);
  const storageKey = user ? `cart_user_${user.id}` : 'cart_guest';

  // Cart state starts empty until user loading completes
  const [cart, setCart] = useState([]);

  // Load cart from localStorage once user loading ends or when storageKey changes
  useEffect(() => {
    if (loadingUser) return;
    const saved = localStorage.getItem(storageKey);
    setCart(saved ? JSON.parse(saved) : []);
  }, [loadingUser, storageKey]);

  // Persist cart to localStorage when it changes and after user loading completes
  useEffect(() => {
    if (loadingUser) return;
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, storageKey, loadingUser]);

  const addToCart = (item) => {
    if (!cart.find(cartItem => cartItem.id === item.id)) {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateCartItem = (itemId, quantity) => {
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeCartItem = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, updateCartItem, removeCartItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
