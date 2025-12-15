// LoginModal.jsx - Con mejor control de errores y Google Login
import React, { useState, useEffect, useContext } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { 
  FaExclamationCircle, 
  FaSignInAlt, 
  FaGoogle, 
  FaEnvelope, 
  FaLock,
  FaUserPlus,
  FaCheck
} from 'react-icons/fa';
import { GoogleLogin } from '@react-oauth/google';
import { UserContext } from './UserContext';

function LoginModal({ show, onHide, onSubmit, errors = {}, clearErrors, switchToRegister }) {
  const { login } = useContext(UserContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // URL para Google Auth
  const GOOGLE_AUTH_URL = `${process.env.REACT_APP_API_URL}/auth/google`;

  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) {
        const modal = document.querySelector('.modal-content');
        if (modal) {
          modal.classList.add('error-shake');
          setTimeout(() => modal.classList.remove('error-shake'), 500);
        }
      }
    }
  }, [errors]);

  // ================ MANEJADOR GOOGLE ================
  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setFieldErrors({});
    setSuccessMessage('');

    try {
      const response = await fetch(GOOGLE_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          token: credentialResponse.credential
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Éxito - usar la función login del contexto
        login(data.cliente, data.token);
        
        // Mostrar mensaje de éxito
        setSuccessMessage(`¡Bienvenido ${data.cliente.nombre}!`);
        
        // Cerrar modal después de 1.5 segundos
        setTimeout(() => {
          onHide();
          setSuccessMessage('');
        }, 1500);
        
      } else {
        setFieldErrors({
          general: data.message || 'Error en autenticación con Google'
        });
      }
      
    } catch (error) {
      console.error('Error en login Google:', error);
      setFieldErrors({
        general: 'Error de conexión con el servidor. Verifica tu conexión a internet.'
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setFieldErrors({
      general: 'El inicio de sesión con Google fue cancelado o falló.'
    });
  };

  // ================ MANEJADOR FORMULARIO TRADICIONAL ================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    
    // Validación básica frontend
    const validationErrors = {};
    if (!formData.email.trim()) validationErrors.email = 'El email es requerido';
    if (!formData.password.trim()) validationErrors.password = 'La contraseña es requerida';
    
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }
    
    // Crear un evento simulado para pasar al onSubmit original
    const formEvent = {
      preventDefault: () => {},
      target: {
        formEmailLogin: { value: formData.email },
        formPasswordLogin: { value: formData.password }
      }
    };
    
    try {
      if (onSubmit) {
        await onSubmit(formEvent);
      }
    } catch (error) {
      setFieldErrors({
        general: 'Error al procesar la solicitud'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFieldErrors({});
    setSuccessMessage('');
    setFormData({ email: '', password: '' });
    clearErrors?.();
    onHide();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error específico al escribir
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
    if (fieldErrors.general) {
      setFieldErrors(prev => ({ ...prev, general: null }));
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={handleClose} 
      centered 
      size="lg"
      className="login-modal-dark"
    >
      <Modal.Header closeButton className="bg-dark text-white border-secondary">
        <Modal.Title className="w-100 text-center">
          <h4 className="mb-0">
            <FaSignInAlt className="me-2" />
            Iniciar Sesión en Mangaka Baka Shop
          </h4>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-dark text-white p-4">
        {/* Mensajes de éxito */}
        {successMessage && (
          <Alert 
            variant="success" 
            className="d-flex align-items-center mb-4 animate__animated animate__fadeIn"
          >
            <FaCheck className="me-2" />
            {successMessage}
          </Alert>
        )}

        {/* Mensajes de error general */}
        {fieldErrors.general && (
          <Alert 
            variant="danger" 
            className="d-flex align-items-center mb-4 animate__animated animate__headShake"
            dismissible
            onClose={() => setFieldErrors(prev => ({ ...prev, general: null }))}
          >
            <FaExclamationCircle className="me-2" />
            {fieldErrors.general}
          </Alert>
        )}

        {fieldErrors.credenciales && (
          <Alert 
            variant="warning" 
            className="d-flex align-items-center mb-4"
            dismissible
            onClose={() => setFieldErrors(prev => ({ ...prev, credenciales: null }))}
          >
            <FaExclamationCircle className="me-2" />
            Usuario o Contraseña incorrecto
          </Alert>
        )}

        <Row className="g-4">
          {/* COLUMNA IZQUIERDA - GOOGLE LOGIN */}
          <Col md={6} className="border-end border-secondary pe-md-4">
            <div className="text-center mb-4">
              <h5 className="text-warning">
                <FaGoogle className="me-2" />
                Acceso Rápido con Google
              </h5>
              <p className="text-muted small">
                Inicia sesión con un clic usando tu cuenta de Google
              </p>
            </div>

            {/* Botón de Google Login */}
            <div className="d-flex justify-content-center mb-4">
              <div style={{ minWidth: '250px', maxWidth: '100%' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_blue"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="100%"
                  locale="es"
                  logo_alignment="left"
                />
              </div>
            </div>

            {/* Loading para Google */}
            {googleLoading && (
              <div className="text-center mt-3">
                <Spinner 
                  animation="border" 
                  variant="light" 
                  size="sm" 
                  className="me-2" 
                />
                <span className="text-light">Autenticando con Google...</span>
              </div>
            )}

            {/* Ventajas de Google Login */}
            <div className="mt-4 pt-3 border-top border-secondary">
              <h6 className="text-info mb-3">¿Por qué usar Google?</h6>
              <ul className="list-unstyled small text-muted">
                <li className="mb-2">
                  <FaCheck className="text-success me-2" />
                  <strong>Sin contraseñas nuevas</strong>
                </li>
                <li className="mb-2">
                  <FaCheck className="text-success me-2" />
                  <strong>Acceso más rápido</strong>
                </li>
                <li className="mb-2">
                  <FaCheck className="text-success me-2" />
                  <strong>Mayor seguridad</strong>
                </li>
                <li>
                  <FaCheck className="text-success me-2" />
                  <strong>Protección de 2 factores</strong>
                </li>
              </ul>
            </div>
          </Col>

          {/* COLUMNA DERECHA - LOGIN TRADICIONAL */}
          <Col md={6} className="ps-md-4">
            <div className="text-center mb-4">
              <h5 className="text-info">
                <FaEnvelope className="me-2" />
                Acceso con Email
              </h5>
              <p className="text-muted small">
                Usa tu email y contraseña registrados
              </p>
            </div>

            {/* Formulario Tradicional */}
            <Form 
              onSubmit={handleSubmit} 
              noValidate
              className="needs-validation"
            >
              {/* Email */}
              <Form.Group className="mb-3" controlId="formEmailLogin">
                <Form.Label>
                  <FaEnvelope className="me-2" />
                  Correo electrónico
                </Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="ejemplo@correo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`bg-secondary text-white ${fieldErrors.email ? 'is-invalid border-danger error-field' : 'border-dark'}`}
                  disabled={isSubmitting || googleLoading}
                  required
                />
                {fieldErrors.email && (
                  <Form.Text className="text-danger error-text">
                    <FaExclamationCircle className="me-1" />
                    {fieldErrors.email}
                  </Form.Text>
                )}
              </Form.Group>

              {/* Contraseña */}
              <Form.Group className="mb-4" controlId="formPasswordLogin">
                <Form.Label>
                  <FaLock className="me-2" />
                  Contraseña
                </Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="Tu contraseña"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`bg-secondary text-white ${fieldErrors.password ? 'is-invalid border-danger error-field' : 'border-dark'}`}
                  disabled={isSubmitting || googleLoading}
                  required
                />
                {fieldErrors.password && (
                  <Form.Text className="text-danger error-text">
                    <FaExclamationCircle className="me-1" />
                    {fieldErrors.password}
                  </Form.Text>
                )}
              </Form.Group>

              {/* Botón de Submit */}
              <Button
                variant="primary"
                type="submit"
                className="w-100 py-2 mb-3"
                disabled={isSubmitting || googleLoading}
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

              {/* Links adicionales */}
              <div className="text-center small mb-3">
                <Button 
                  variant="link" 
                  className="text-decoration-none p-0 text-info"
                  onClick={() => {
                    onHide();
                    // Aquí puedes abrir modal de recuperación
                    alert('Funcionalidad de recuperación de contraseña en desarrollo');
                  }}
                  disabled={googleLoading}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
            </Form>

            {/* Separador y registro */}
            <div className="mt-4 pt-3 border-top border-secondary">
              <p className="text-center text-muted mb-2">
                ¿No tienes una cuenta todavía?
              </p>
              <Button
                variant="outline-success"
                className="w-100"
                onClick={() => {
                  onHide();
                  setTimeout(() => {
                    if (switchToRegister) switchToRegister();
                  }, 300);
                }}
                disabled={googleLoading}
              >
                <FaUserPlus className="me-2" />
                Crear Cuenta Nueva
              </Button>
            </div>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer className="bg-dark text-white border-secondary justify-content-center">
        <small className="text-muted text-center">
          Al iniciar sesión, aceptas nuestros{' '}
          <Button variant="link" className="p-0 text-decoration-none text-info" disabled={googleLoading}>
            Términos y Condiciones
          </Button>
          {' '}y{' '}
          <Button variant="link" className="p-0 text-decoration-none text-info" disabled={googleLoading}>
            Política de Privacidad
          </Button>
        </small>
      </Modal.Footer>
    </Modal>
  );
}

export default LoginModal;