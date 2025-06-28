import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Alert, Spinner, Card, Container } from 'react-bootstrap';
import { CartContext } from './CartContext';
import { UserContext } from './UserContext';

const SuccessPage = () => {
  const { clearCart } = useContext(CartContext);
  const { user, loadingUser } = useContext(UserContext);
  const [invoice, setInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const status = params.get('status');

  useEffect(() => {
    // Esperar a que termine la carga de usuario
    if (loadingUser) return;

    // Si no hay usuario o el estado no es aprobado, redirigir
    if (!user || status !== 'approved') {
      navigate('/');
      return;
    }

    // Una vez validado, vaciar carrito y obtener la factura
    clearCart();

    const fetchInvoice = async () => {
      try {
        const token = localStorage.getItem('token');
        const resp = await fetch('http://localhost:8000/api/orders/invoices', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (data.length === 0) throw new Error('No se encontró ninguna factura pagada');
        setInvoice(data[0]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingInvoice(false);
      }
    };

    fetchInvoice();
  }, [loadingUser, user, status, clearCart, navigate]);

  if (loadingUser || loadingInvoice) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">Error: {error}</Alert>
        <Button onClick={() => navigate('/')}>Volver al inicio</Button>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <Alert variant="success">¡Tu pago se procesó con éxito!</Alert>
      <Card className="mb-4">
        <Card.Header>Factura #{invoice.id}</Card.Header>
        <Card.Body>
          <p><strong>Número:</strong> {invoice.numero}</p>
          <p><strong>Fecha:</strong> {new Date(invoice.created_at).toLocaleString()}</p>
          <p><strong>Total:</strong> ${invoice.total.toFixed(2)}</p>
        </Card.Body>
      </Card>
      <div className="d-flex gap-2">
        <Button variant="primary" onClick={() => navigate('/')}>Volver a Home</Button>
        <Button variant="outline-primary" onClick={() => navigate(`/facturas/${invoice.id}`)}>
          Ver Factura
        </Button>
      </div>
    </Container>
  );
};

export default SuccessPage;
