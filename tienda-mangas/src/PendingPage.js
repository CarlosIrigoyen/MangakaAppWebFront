// src/PendingPage.js
import React from 'react';
import { Button, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const PendingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white">
      <Container className="text-center">
        <h2>⏳ Pago pendiente</h2>
        <p>Tu pago está en proceso. Te notificaremos cuando se confirme.</p>
        <Button variant="light" onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </Container>
    </div>
  );
};

export default PendingPage;
