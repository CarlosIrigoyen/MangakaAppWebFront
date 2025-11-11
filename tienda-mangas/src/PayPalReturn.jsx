import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Alert, Button, Container, Card } from 'react-bootstrap';

const API_PAYPAL_CAPTURE = `${process.env.REACT_APP_API_URL}/paypal/capture-order`;

const PayPalReturn = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('No se encontró información de la transacción.');
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
          // Verificar si es un estado pendiente (código 202)
          if (res.status === 202) {
            setPending(true);
            setLoading(false);
            return;
          }
          
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
        setLoading(false);
      }
    };

    doCapture();
  }, [navigate]);

  const retryPayment = () => {
    navigate('/cart');
  };

  const goHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" role="status" size="lg">
            <span className="visually-hidden">Procesando pago...</span>
          </Spinner>
          <h4 className="mt-4">Procesando tu pago...</h4>
          <p className="text-muted">Esto puede tomar unos segundos. Por favor, no cierres esta página.</p>
        </div>
      </Container>
    );
  }

  if (pending) {
    return (
      <Container className="py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <Card className="border-0 shadow">
              <Card.Body className="p-4 text-center">
                <div className="mb-4">
                  <div style={{ fontSize: '4rem', color: '#ffc107' }}>⏳</div>
                </div>
                
                <h3 className="mb-3 text-warning">Pago Pendiente</h3>
                
                <Alert variant="warning" className="text-start">
                  <Alert.Heading>Tu pago está siendo procesado</Alert.Heading>
                  <p className="mb-0">
                    Hemos recibido tu solicitud de pago pero aún está en proceso de verificación. 
                    Esto puede tomar algunos minutos. Te notificaremos cuando se complete.
                  </p>
                </Alert>

                <div className="d-grid gap-2 d-md-flex justify-content-md-center mt-4">
                  <Button 
                    variant="outline-secondary" 
                    onClick={goHome}
                    size="lg"
                  >
                    Volver al Inicio
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <Card className="border-0 shadow">
              <Card.Body className="p-4 text-center">
                <div className="mb-4">
                  <div style={{ fontSize: '4rem', color: '#dc3545' }}>❌</div>
                </div>
                
                <h3 className="mb-3 text-danger">Error en el pago</h3>
                
                <Alert variant="danger" className="text-start">
                  <Alert.Heading>No se pudo completar el pago</Alert.Heading>
                  <p className="mb-0">{error}</p>
                </Alert>

                <div className="d-grid gap-2 d-md-flex justify-content-md-center mt-4">
                  <Button 
                    variant="primary" 
                    onClick={retryPayment}
                    size="lg"
                  >
                    Intentar con otro método de pago
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    onClick={goHome}
                    size="lg"
                  >
                    Volver al inicio
                  </Button>
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
