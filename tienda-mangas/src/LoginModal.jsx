// LoginModal.jsx
import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

function LoginModal({ show, onHide, onSubmit }) {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>Iniciar Sesión</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-white">
        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3" controlId="formEmailLogin">
            <Form.Label>Correo electrónico</Form.Label>
            <Form.Control
              type="email"
              placeholder="Ingresa tu correo"
              className="bg-secondary text-white"
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="formPasswordLogin">
            <Form.Label>Contraseña</Form.Label>
            <Form.Control
              type="password"
              placeholder="Contraseña"
              className="bg-secondary text-white"
            />
          </Form.Group>
          <Button variant="primary" type="submit">
            Iniciar Sesión
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default LoginModal;