// src/RegisterModal.jsx
import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

function RegisterModal({ show, onHide, onSubmit }) {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>Registrarse</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-white">
        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3" controlId="formNombre">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              name="formNombre"
              type="text"
              placeholder="Ingresa tu nombre"
              className="bg-secondary text-white"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formDireccion">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              name="formDireccion"
              type="text"
              placeholder="Ingresa una dirección de envío"
              className="bg-secondary text-white"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formEmailRegister">
            <Form.Label>Correo electrónico</Form.Label>
            <Form.Control
              name="formEmailRegister"
              type="email"
              placeholder="Ingresa tu correo"
              className="bg-secondary text-white"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPasswordRegister">
            <Form.Label>Contraseña</Form.Label>
            <Form.Control
              name="formPasswordRegister"
              type="password"
              placeholder="Contraseña"
              className="bg-secondary text-white"
            />
          </Form.Group>

          <Button variant="primary" type="submit">
            Registrar
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default RegisterModal;
