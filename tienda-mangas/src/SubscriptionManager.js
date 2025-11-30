import React, { useState, useEffect, useContext } from 'react';
import { Modal, Button, Card, Badge, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FaBell, FaSave } from 'react-icons/fa';
import { UserContext } from './UserContext';
import { useAutoNotifications } from './hooks/useAutoNotifications';

const SubscriptionManager = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedMangas, setSelectedMangas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user } = useContext(UserContext);
  const {
    mangasDisponibles,
    suscripciones,
    loading,
    hasPermission,
    fcmToken,
    actualizarSuscripciones,
    cargarMangasDisponibles,
    inicializarNotificaciones,
    generarNuevoToken
  } = useAutoNotifications();

  // Sincronizar selecciones cuando cambian las suscripciones
  useEffect(() => {
  
    setSelectedMangas(suscripciones);
  }, [suscripciones]);

  // Al abrir el modal, cargar datos
  useEffect(() => {
    if (showModal && user) {
   
      // Cargar datos necesarios
      cargarMangasDisponibles();
      
      // Si no hay token, intentar inicializar notificaciones
      if (!fcmToken) {
        inicializarNotificaciones();
      }
    }
  }, [showModal, user]);

  // Manejar toggle de mangas individuales
  const handleMangaToggle = (mangaId, isChecked) => {
    setSelectedMangas(prev => {
      const newSelection = isChecked 
        ? [...prev, mangaId]
        : prev.filter(id => id !== mangaId);
      return newSelection;
    });
  };

  // Seleccionar/deseleccionar todos
  const handleToggleAll = () => {
    if (selectedMangas.length === mangasDisponibles.length) {
      setSelectedMangas([]);
      
    } else {
      const todosLosIds = mangasDisponibles.map(manga => manga.id);
      setSelectedMangas(todosLosIds);
      
    }
  };

  // Guardar suscripciones
  const guardarSuscripciones = async () => {
    if (selectedMangas.length === 0) {
      setError('Selecciona al menos un manga');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      

      const success = await actualizarSuscripciones(selectedMangas);
      
      if (success) {
        setSuccess(`✅ Suscrito a ${selectedMangas.length} manga(s) correctamente`);
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          setShowModal(false);
        }, 2000);
      } else {
        setError('Error al guardar suscripciones. Por favor, intenta nuevamente.');
        
      }
    } catch (error) {
      
      setError('Error inesperado. Por favor, intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  // Verificar si un manga está seleccionado
  const estaSeleccionado = (mangaId) => {
    return selectedMangas.includes(mangaId);
  };

  if (!user) return null;

  return (
    <>
      <Button 
        variant="outline-warning" 
        size="sm"
        onClick={() => setShowModal(true)}
        className="ms-2"
      >
        <FaBell className="me-1" />
        Notificaciones {suscripciones.length > 0 && `(${suscripciones.length})`}
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>
            <FaBell className="me-2" />
            Gestión de Suscripciones
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="bg-light" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {/* Estado de notificaciones */}
          <Card className="mb-3">
            <Card.Header>
              <strong>Estado del Sistema</strong>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Inicializando sistema de notificaciones...
                </div>
              ) : hasPermission && fcmToken ? (
                <Alert variant="success" className="mb-0 py-2">
                  <strong>✅ Sistema listo</strong>
                  <div className="small mt-1">
                    {suscripciones.length > 0 
                      ? `Suscrito a ${suscripciones.length} manga(s)`
                      : 'Selecciona los mangas que quieres seguir'
                    }
                  </div>
                </Alert>
              ) : (
                <Alert variant="info" className="mb-0 py-2">
                  <strong>🔔 Activando notificaciones...</strong>
                  <div className="small mt-1">
                    El sistema configurará automáticamente las notificaciones cuando guardes.
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>

          {/* Lista de mangas */}
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>Mangas Disponibles</strong>
              <div>
                <Badge bg="primary" className="me-2">
                  {selectedMangas.length} / {mangasDisponibles.length} seleccionados
                </Badge>
                {mangasDisponibles.length > 0 && (
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={handleToggleAll}
                  >
                    {selectedMangas.length === mangasDisponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </Button>
                )}
              </div>
            </Card.Header>
            
            <Card.Body>
              {mangasDisponibles.length > 0 ? (
                <Row>
                  {mangasDisponibles.map(manga => (
                    <Col key={manga.id} xs={12} md={6} lg={4}>
                      <div className="border rounded p-2 mb-2 bg-white">
                        <Form.Check
                          type="checkbox"
                          id={`manga-${manga.id}`}
                          label={
                            <div className="ms-2">
                              <strong className="d-block">{manga.titulo}</strong>
                              {manga.autor && (
                                <small className="text-muted d-block">
                                  {manga.autor.nombre} {manga.autor.apellido}
                                </small>
                              )}
                            </div>
                          }
                          checked={estaSeleccionado(manga.id)}
                          onChange={(e) => handleMangaToggle(manga.id, e.target.checked)}
                        />
                      </div>
                    </Col>
                  ))}
                </Row>
              ) : (
                <div className="text-center py-4 text-muted">
                  {loading ? 'Cargando mangas disponibles...' : 'No hay mangas disponibles en este momento'}
                </div>
              )}
            </Card.Body>
          </Card>
        </Modal.Body>
        
        <Modal.Footer className="bg-dark">
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
          <Button 
            variant="primary" 
            onClick={guardarSuscripciones}
            disabled={saving || selectedMangas.length === 0}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Guardando...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Guardar Suscripciones ({selectedMangas.length})
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default SubscriptionManager;