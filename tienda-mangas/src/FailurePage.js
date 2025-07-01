// src/FailurePage.js
import React from 'react';
import { Button, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const FailurePage = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white">
      <Container className="text-center">
        <h2>❌ Pago fallido</h2>
        <p>Tu pago no pudo ser procesado. Puede deberse a fondos insuficientes o a un error de conexión.</p>
        <Button variant="light" onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </Container>
    </div>
  );
};

export default FailurePage;
