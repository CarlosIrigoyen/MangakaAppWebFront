// LoginModal.jsx - Con mejor control de errores
import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaExclamationCircle, FaSignInAlt } from 'react-icons/fa';

function LoginModal({ show, onHide, onSubmit, errors, clearErrors }) {
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
        <Modal.Title>Iniciar Sesión</Modal.Title>
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

        {fieldErrors.credenciales && (
          <Alert variant="warning" className="mb-3">
            <div className="d-flex align-items-center">
              <FaExclamationCircle className="me-2" />
              <span>Usuario o Contraseña incorrecto</span>
            </div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formEmailLogin">
            <Form.Label>Correo electrónico</Form.Label>
            <Form.Control
              type="email"
              name="formEmailLogin"
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

          <Form.Group className="mb-3" controlId="formPasswordLogin">
            <Form.Label>Contraseña</Form.Label>
            <Form.Control
              type="password"
              name="formPasswordLogin"
              placeholder="Tu contraseña"
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
                Iniciando sesión...
              </>
            ) : (
              <>
                <FaSignInAlt className="me-2" />
                Iniciar Sesión
              </>
            )}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default LoginModal;