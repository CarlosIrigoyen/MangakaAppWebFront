// SidebarFiltersModal.js
import React, { useEffect, useState, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import SideBarFilters from './SideBarFilters';

/**
 * Modal de filtros: solo muestra los controles de filtrado.
 * No incluye botones de login, logout ni registro.
 * El modal aplica los filtros al presionar "Aplicar filtros".
 */
const SidebarFiltersModal = ({ show, onClose, onFilterChange, initialFilters = {} }) => {
  const [localFilters, setLocalFilters] = useState(() => ({ ...initialFilters }));
  const openedRef = useRef(false);

  // Cuando se abre el modal, inicializamos una copia local de los filtros actuales.
  useEffect(() => {
    if (show && !openedRef.current) {
      setLocalFilters({ ...initialFilters });
      openedRef.current = true;
    }
    if (!show) {
      openedRef.current = false;
    }
  }, [show, initialFilters]);

  // Aplicar los filtros: notificamos al padre (App.js)
  const handleApply = () => {
    if (typeof onFilterChange === 'function') {
      onFilterChange(localFilters);
    }
    if (typeof onClose === 'function') onClose();
  };

  // Cerrar modal sin aplicar
  const handleClose = () => {
    setLocalFilters({ ...initialFilters });
    if (typeof onClose === 'function') onClose();
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      size="lg"
      backdrop="static"
      fullscreen="sm-down"
      className="filters-modal"
    >
      {/* Header */}
      <Modal.Header closeButton className="bg-dark text-white border-secondary">
        <Modal.Title>Filtros</Modal.Title>
      </Modal.Header>

      {/* Cuerpo del modal: solo los filtros */}
      <Modal.Body className="bg-dark text-white">
        <SideBarFilters
          filters={localFilters}
          onLocalChange={(f) => {
            if (f && typeof f === 'object') setLocalFilters(f);
          }}
        />
      </Modal.Body>

      {/* Footer con botones de acción */}
      <Modal.Footer className="bg-dark border-secondary">
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
        <Button variant="primary" onClick={handleApply}>
          Aplicar filtros
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SidebarFiltersModal;

