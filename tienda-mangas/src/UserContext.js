import React, { createContext, useState, useEffect, useCallback } from 'react';

export const UserContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || '';
const REACT_URL_ME = `${API_URL}/me`;
const REACT_URL_LOGOUT = `${API_URL}/logout`;

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Logout (usa useCallback para poder referenciarlo en listeners)
  const logout = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(REACT_URL_LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (e) {
        // ignore network errors on logout
      }
    }
    localStorage.removeItem('token');
    setUser(null);
    setLoadingUser(false);
  }, []);

  // Comprueba autenticación al montar y registra listener para auth:logout
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      setLoadingUser(true);
      const token = localStorage.getItem('token');
      if (!token) {
        if (mounted) {
          setUser(null);
          setLoadingUser(false);
        }
        return;
      }

      try {
        const response = await fetch(REACT_URL_ME, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!mounted) return;

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          // token inválido o expirado
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        console.error('[UserContext] checkAuth error', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        if (mounted) setLoadingUser(false);
      }
    };

    checkAuth();

    // Si otros módulos despachan window.dispatchEvent(new Event('auth:logout'))
    const onAuthLogout = () => logout();
    window.addEventListener('auth:logout', onAuthLogout);

    return () => {
      mounted = false;
      window.removeEventListener('auth:logout', onAuthLogout);
    };
  }, [logout]);

  // login: guarda token plain y usuario
  const login = (userData, token) => {
    if (token) localStorage.setItem('token', token);
    setUser(userData);
    setLoadingUser(false);
  };

  return (
    <UserContext.Provider value={{ user, setUser, loadingUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};
