// src/pages/PayPalReturn.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Alert } from 'react-bootstrap';

const API_PAYPAL_CAPTURE = `${process.env.REACT_APP_API_URL}/paypal/capture-order`;

const PayPalReturn = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('token'); // PayPal usa token=ORDER_ID
    if (!orderId) {
      setError('No se encontró el token de PayPal en la URL.');
      setLoading(false);
      return;
    }

    const doCapture = async () => {
      try {
        const userToken = localStorage.getItem('token');
        if (!userToken) throw new Error('Sesión expirada. Inicia sesión de nuevo.');

        const res = await fetch(`${API_PAYPAL_CAPTURE}/${orderId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${userToken}`
          }
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error('Error capturando pago PayPal:', data);
          throw new Error(data?.message || data?.error || JSON.stringify(data) || `HTTP ${res.status}`);
        }

        // Éxito: limpiar pendingPurchase y redirigir
        sessionStorage.removeItem('pendingPurchase');
        // Opcional: actualizar contexto carrito aquí si lo manejás globalmente
        navigate('/facturas');
      } catch (err) {
        console.error('Error capturando pago PayPal:', err);
        setError('Error confirmando el pago: ' + (err.message || 'Error desconocido'));
      } finally {
        setLoading(false);
      }
    };

    doCapture();
  }, [navigate]);

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Procesando captura...</span>
        </Spinner>
        <p className="mt-3">Confirmando pago con PayPal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <Alert variant="danger">
          <Alert.Heading>Error al confirmar el pago</Alert.Heading>
          <p>{error}</p>
          <hr />
          <p className="mb-0">Si el problema persiste, contactá soporte o revisá tus facturas.</p>
        </Alert>
      </div>
    );
  }

  return null;
};

export default PayPalReturn;
