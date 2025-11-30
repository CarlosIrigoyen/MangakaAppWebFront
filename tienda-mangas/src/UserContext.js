// src/UserContext.js
import React, { createContext, useState, useEffect } from 'react';

// Crea el contexto para el usuario
export const UserContext = createContext();

const REACT_LOGOUT='http://localhost:8000/api/logout'
const REACT_ME= 'http://localhost:8000/api/me'
const REACT_URL_LOGOUT= `${process.env.REACT_APP_API_URL}/logout`;
const REACT_URL_ME=`${process.env.REACT_APP_API_URL}/me`;
// Define el proveedor del contexto de usuario
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true); // Para saber si ya se cargó la información del usuario

  // Efecto para verificar la autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      setLoadingUser(true); // Indicamos que estamos cargando
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
          }
        });
        const result = await response.json();
        if (response.ok) {
          setUser(result); // Si la respuesta es exitosa, establece el usuario
        } else {
          // Si el token no es válido o hay un error, lo eliminamos
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (error) {
        localStorage.removeItem('token'); // En caso de error de red, también limpiamos el token
        setUser(null);
      } finally {
        setLoadingUser(false); // La carga ha terminado
      }
    };
    checkAuth();
  }, []); // Se ejecuta solo una vez al montar el componente

  // Función para manejar el inicio de sesión
  const login = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  // Función para manejar el cierre de sesión
  const logout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(REACT_URL_LOGOUT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
       //pass
      } finally {
        localStorage.removeItem('token');
        setUser(null);
      }
    }
  };

  // Provee el estado del usuario y las funciones de login/logout a los componentes hijos
  return (
    <UserContext.Provider value={{ user, setUser, loadingUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};