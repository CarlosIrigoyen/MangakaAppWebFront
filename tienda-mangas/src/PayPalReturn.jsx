import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Alert, Button, Container, Card } from 'react-bootstrap';

const API_PAYPAL_CAPTURE = `${process.env.REACT_APP_API_URL}/paypal/capture-order`;

const PayPalReturn = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    setOrderId(token);

    if (!token) {
      setError('No se encontró información de la transacción. Por favor, verifica tu historial de compras.');
      setLoading(false);
      return;
    }

    const doCapture = async () => {
      try {
        const userToken = localStorage.getItem('token');
        if (!userToken) {
          throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
        }

        const res = await fetch(`${API_PAYPAL_CAPTURE}/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${userToken}`
          }
        });

        const data = await res.json().catch(() => null);
        
        if (!res.ok) {
          // Usar el mensaje amigable del backend o mostrar uno genérico
          const friendlyMessage = data?.message || 'Error al procesar el pago. Por favor, intenta con otro método.';
          throw new Error(friendlyMessage);
        }

        // Éxito: limpiar y redirigir
        sessionStorage.removeItem('pendingPurchase');
        localStorage.removeItem('cart');
        navigate('/facturas', { 
          state: { 
            message: '¡Pago completado con éxito!',
            facturaId: data.factura_id 
          }
        });
        
      } catch (err) {
        console.error('Error capturando pago PayPal:', err);
        setError(err.message || 'Error al procesar el pago. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    doCapture();
  }, [navigate]);

  const retryPayment = () => {
    // Redirigir al carrito para intentar nuevamente
    navigate('/cart');
  };

  const goHome = () => {
    navigate('/');
  };

  const contactSupport = () => {
    // Aquí puedes redirigir a una página de contacto o abrir un email
    window.location.href = 'mailto:soporte@mangakabaka.com?subject=Problema con el pago';
  };

  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100 payment-processing">
        <div className="text-center text-white">
          <Spinner animation="border" variant="primary" role="status" size="lg">
            <span className="visually-hidden">Procesando pago...</span>
          </Spinner>
          <h4 className="mt-4">Procesando tu pago...</h4>
          <p className="text-light">Esto puede tomar unos segundos. Por favor, no cierres esta página.</p>
          <div className="mt-3">
            <small className="text-muted">
              ID de orden: {orderId || 'Cargando...'}
            </small>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <Card className="border-0 shadow-lg">
              <Card.Body className="p-5 text-center">
                <div className="mb-4">
                  <div className="payment-error-icon" style={{ fontSize: '5rem', color: '#dc3545' }}>
                    ❌
                  </div>
                </div>
                
                <h2 className="mb-3 text-danger fw-bold">Pago no procesado</h2>
                <p className="text-muted mb-4">
                  No pudimos completar tu compra en este momento.
                </p>
                
                <Alert variant="danger" className="text-start">
                  <Alert.Heading className="h5">📋 Detalles del error:</Alert.Heading>
                  <p className="mb-0">{error}</p>
                </Alert>

                <div className="mt-4 p-3 bg-light rounded">
                  <p className="text-muted mb-2 small">
                    <strong>ID de la orden:</strong> {orderId || 'No disponible'}
                  </p>
                  <p className="text-muted mb-0 small">
                    <strong>Modo:</strong> Pruebas (Sandbox) - No se realizó cargo real
                  </p>
                </div>

                <div className="d-grid gap-3 d-md-flex justify-content-md-center mt-5">
                  <Button 
                    variant="primary" 
                    onClick={retryPayment}
                    size="lg"
                    className="px-4"
                  >
                    🔄 Intentar con otro método
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={goHome}
                    size="lg"
                    className="px-4"
                  >
                    🏠 Volver al inicio
                  </Button>
                </div>

                <div className="mt-4 pt-3 border-top">
                  <p className="text-muted small mb-2">
                    ¿Sigues teniendo problemas?
                  </p>
                  <Button 
                    variant="outline-danger" 
                    onClick={contactSupport}
                    size="sm"
                  >
                    📞 Contactar soporte
                  </Button>
                </div>

                <div className="mt-4">
                  <small className="text-muted">
                    💡 <strong>Consejo:</strong> En modo pruebas, usa las tarjetas de prueba de PayPal Sandbox
                  </small>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </Container>
    );
  }

  return null;
};

export default PayPalReturn;
