// src/SubscriptionManagerModal.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Modal, Button, Card, Badge, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FaBell, FaSave } from 'react-icons/fa';
import { UserContext } from './UserContext';
import { useAutoNotifications } from './hooks/useAutoNotifications';

/**
 * - Las suscripciones se guardan por cliente (cliente_id + manga_id).
 * - Las notificaciones se envían a TODOS los dispositivos registrados para ese cliente
 *   (tabla cliente_dispositivos donde se guardan los fcm_tokens).
 */
const SubscriptionManagerModal = ({ show, onHide }) => {
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
    inicializarNotificaciones
  } = useAutoNotifications();

  // Sincronizar la selección con las suscripciones actuales desde el backend
  useEffect(() => {
    setSelectedMangas(Array.isArray(suscripciones) ? suscripciones : []);
  }, [suscripciones]);

  // Cuando se abre el modal, cargar mangas y, si hace falta, inicializar notificaciones
  useEffect(() => {
    if (show && user) {
      cargarMangasDisponibles();

      // Inicializamos el sistema de notificaciones en este dispositivo si aún no hay FCM token.
      // Nota: inicializarNotificaciones registra el Service Worker y obtiene/registrará
      // el FCM token de este dispositivo en backend (cliente_dispositivos).
      if (!fcmToken) {
        inicializarNotificaciones();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, user]);

  const handleMangaToggle = (mangaId, isChecked) => {
    setSelectedMangas(prev => {
      if (isChecked) return Array.from(new Set([...prev, mangaId]));
      return prev.filter(id => id !== mangaId);
    });
  };

  const handleToggleAll = () => {
    if (!Array.isArray(mangasDisponibles) || mangasDisponibles.length === 0) return;
    if (selectedMangas.length === mangasDisponibles.length) {
      setSelectedMangas([]);
    } else {
      setSelectedMangas(mangasDisponibles.map(m => m.id));
    }
  };

  const guardarSuscripciones = async () => {
    setError('');
    setSuccess('');
    if (selectedMangas.length === 0) {
      setError('Selecciona al menos un manga');
      return;
    }

    setSaving(true);
    try {
      // actualizarSuscripciones guarda las suscripciones por cliente (NO envía fcm_token).
      const ok = await actualizarSuscripciones(selectedMangas);
      if (ok) {
        setSuccess(`✅ Suscrito a ${selectedMangas.length} manga(s) correctamente`);
        // refrescar suscripciones internas si el hook lo requiere (el hook debería actualizar)
        setTimeout(() => {
          setSuccess('');
          onHide?.();
        }, 1500);
      } else {
        setError('Error al guardar suscripciones. Por favor, intenta nuevamente.');
      }
    } catch (err) {
      console.error(err);
      setError('Error inesperado. Por favor, intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  // si no hay usuario no mostramos nada (App.js ya condiciona el botón)
  if (!user) return null;

  return (
    <Modal show={!!show} onHide={() => { setError(''); setSuccess(''); onHide?.(); }} size="lg" centered>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>
          <FaBell className="me-2" />
          Gestión de Suscripciones
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-light" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Card className="mb-3">
          <Card.Header><strong>Estado del Sistema</strong></Card.Header>
          <Card.Body>
            {loading ? (
              <div className="text-center">
                <Spinner animation="border" size="sm" className="me-2" />
                Inicializando sistema de notificaciones...
              </div>
            ) : (hasPermission && fcmToken) ? (
              <Alert variant="success" className="mb-0 py-2">
                <strong>✅ Sistema listo</strong>
                <div className="small mt-1">
                  {suscripciones?.length > 0
                    ? `Suscrito a ${suscripciones.length} manga(s).`
                    : 'Selecciona los mangas que quieres seguir.'}
                </div>
              </Alert>
            ) : (
              <Alert variant="info" className="mb-0 py-2">
                <div className="small mt-1">
                  Por Favor asegurate de permitir notificaciones en este dispositivo.
                </div>
              </Alert>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <strong>Mangas Disponibles</strong>
            <div>
              <Badge bg="primary" className="me-2">
                {selectedMangas.length} / {mangasDisponibles?.length || 0} seleccionados
              </Badge>
              {mangasDisponibles?.length > 0 && (
                <Button variant="outline-primary" size="sm" onClick={handleToggleAll}>
                  {selectedMangas.length === mangasDisponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              )}
            </div>
          </Card.Header>

          <Card.Body>
            {mangasDisponibles?.length > 0 ? (
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
                        checked={selectedMangas.includes(manga.id)}
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
        <Button variant="secondary" onClick={() => { setError(''); setSuccess(''); onHide?.(); }}>
          Cerrar
        </Button>
        <Button variant="primary" onClick={guardarSuscripciones} disabled={saving || selectedMangas.length === 0}>
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
  );
};

export default SubscriptionManagerModal;
