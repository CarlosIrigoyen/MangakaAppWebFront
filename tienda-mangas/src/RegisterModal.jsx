// src/RegisterModal.jsx - Con mejor control de errores
import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaExclamationCircle, FaCheckCircle } from 'react-icons/fa';

function RegisterModal({ show, onHide, onSubmit, errors, clearErrors }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (errors) {
      setFieldErrors(errors);
      // Si hay errores, hacer shake en el modal
      if (Object.keys(errors).length > 0) {
        const modal = document.querySelector('.modal-content');
        if (modal) {
          modal.classList.add('error-shake');
          setTimeout(() => modal.classList.remove('error-shake'), 500);
        }
      }
    }
  }, [errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(e);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setFieldErrors({});
    clearErrors?.();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>Registrarse</Modal.Title>
      </Modal.Header>
      <Modal.Body className="bg-dark text-white">
        {/* Mensaje de error general */}
        {fieldErrors.general && (
          <Alert variant="danger" className="mb-3">
            <div className="d-flex align-items-center">
              <FaExclamationCircle className="me-2" />
              <span>{fieldErrors.general}</span>
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formNombre">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              name="formNombre"
              type="text"
              placeholder="Ingresa tu nombre completo"
              className={`bg-secondary text-white ${fieldErrors.nombre ? 'error-field' : ''}`}
              isInvalid={!!fieldErrors.nombre}
              onChange={() => {
                if (fieldErrors.nombre) {
                  setFieldErrors(prev => ({ ...prev, nombre: null }));
                }
              }}
            />
            {fieldErrors.nombre && (
              <Form.Text className="text-danger error-text">
                <FaExclamationCircle className="me-1" />
                {fieldErrors.nombre}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3" controlId="formDireccion">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              name="formDireccion"
              type="text"
              placeholder="Ingresa una dirección de envío"
              className={`bg-secondary text-white ${fieldErrors.direccion ? 'error-field' : ''}`}
              isInvalid={!!fieldErrors.direccion}
              onChange={() => {
                if (fieldErrors.direccion) {
                  setFieldErrors(prev => ({ ...prev, direccion: null }));
                }
              }}
            />
            {fieldErrors.direccion && (
              <Form.Text className="text-danger error-text">
                <FaExclamationCircle className="me-1" />
                {fieldErrors.direccion}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3" controlId="formEmailRegister">
            <Form.Label>Correo electrónico</Form.Label>
            <Form.Control
              name="formEmailRegister"
              type="email"
              placeholder="ejemplo@correo.com"
              className={`bg-secondary text-white ${fieldErrors.email ? 'error-field' : ''}`}
              isInvalid={!!fieldErrors.email}
              onChange={() => {
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: null }));
                }
              }}
            />
            {fieldErrors.email && (
              <Form.Text className="text-danger error-text">
                <FaExclamationCircle className="me-1" />
                {fieldErrors.email}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPasswordRegister">
            <Form.Label>Contraseña</Form.Label>
            <Form.Control
              name="formPasswordRegister"
              type="password"
              placeholder="Mínimo 6 caracteres"
              className={`bg-secondary text-white ${fieldErrors.password ? 'error-field' : ''}`}
              isInvalid={!!fieldErrors.password}
              onChange={() => {
                if (fieldErrors.password) {
                  setFieldErrors(prev => ({ ...prev, password: null }));
                }
              }}
            />
            {fieldErrors.password && (
              <Form.Text className="text-danger error-text">
                <FaExclamationCircle className="me-1" />
                {fieldErrors.password}
              </Form.Text>
            )}
            <Form.Text className="text-muted">
              La contraseña debe tener al menos 6 caracteres
            </Form.Text>
          </Form.Group>

          <Button 
            variant="primary" 
            type="submit" 
            className="w-100"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Registrando...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                Registrar
              </>
            )}
          </Button>
        </Form>

        <div className="mt-3 text-center">
          <small className="text-muted">
            Al registrarte, aceptas nuestros términos y condiciones
          </small>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default RegisterModal;