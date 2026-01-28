// src/UserContext.js
import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

const REACT_URL_LOGOUT = `${process.env.REACT_APP_API_URL}/logout`;
const REACT_URL_ME = `${process.env.REACT_APP_API_URL}/me`;

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setLoadingUser(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setUser(null);
        setLoadingUser(false);
        return;
      }

      try {
        const response = await fetch(REACT_URL_ME, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });

        if (response.ok) {
          const result = await response.json();
          setUser(result);
        } else {
          // token inválido
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        // en error de red, mantenemos null para no romper la UX
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoadingUser(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
    // emitir evento para que otros contextos (carrito) puedan reintentar sincronizar
    window.dispatchEvent(new Event('auth:login'));
  };

  const logout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(REACT_URL_LOGOUT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
      } catch (error) {
        // ignore
      } finally {
        localStorage.removeItem('token');
        setUser(null);
        window.dispatchEvent(new Event('auth:logout'));
      }
    } else {
      // si no hay token local, igual limpiamos
      localStorage.removeItem('token');
      setUser(null);
      window.dispatchEvent(new Event('auth:logout'));
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, loadingUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
