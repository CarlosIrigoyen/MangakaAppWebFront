// SidebarFiltersModal.js
import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import SideBarFilters from './SideBarFilters';

const SidebarFiltersModal = ({ show, onClose, onFilterChange, initialFilters = {} }) => {
  const [localFilters, setLocalFilters] = useState(initialFilters);

  useEffect(() => {
    if (show) {
      // Inicializamos con los filtros del padre cada vez que se abre el modal
      setLocalFilters(initialFilters || {});
    }
  }, [show, initialFilters]);

  const handleApply = () => {
    // Notificamos al padre solo cuando se aprieta "Aplicar filtros"
    if (typeof onFilterChange === 'function') {
      onFilterChange(localFilters);
    }
    if (typeof onClose === 'function') onClose();
  };

  const handleClose = () => {
    // Restauramos local y cerramos sin aplicar
    setLocalFilters(initialFilters || {});
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
      <Modal.Header closeButton className="bg-dark text-white border-secondary">
        <Modal.Title>Filtros</Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-dark text-white">
        <SideBarFilters
          filters={localFilters}
          onLocalChange={(f) => setLocalFilters(f)}
        />
      </Modal.Body>

      <Modal.Footer className="bg-dark border-secondary">
        <Button type="button" variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
        <Button type="button" variant="primary" onClick={handleApply}>
          Aplicar filtros
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SidebarFiltersModal;

