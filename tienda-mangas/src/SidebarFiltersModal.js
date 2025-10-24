// SidebarFiltersModal.js
import React, { useEffect, useState, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import SideBarFilters from './SideBarFilters';

const SidebarFiltersModal = ({ show, onClose, onFilterChange, initialFilters = {} }) => {
  const [localFilters, setLocalFilters] = useState(() => ({ ...initialFilters }));
  const openedRef = useRef(false);

  // Cuando se abre el modal POR PRIMERA VEZ, tomamos un snapshot de initialFilters.
  // No incluimos initialFilters en deps para evitar reseteos mientras el modal está abierto.
  useEffect(() => {
    if (show && !openedRef.current) {
      setLocalFilters({ ...initialFilters });
      openedRef.current = true;
    }
    if (!show) {
      openedRef.current = false;
    }
  }, [show]);

  // Aplica: NOTIFICAMOS al padre SOLO desde aquí
  const handleApply = () => {
    if (typeof onFilterChange === 'function') {
      onFilterChange(localFilters);
    } else {
      // si quieres, descomenta para debug:
      // console.warn('SidebarFiltersModal: onFilterChange no es función');
    }
    if (typeof onClose === 'function') onClose();
  };

  const handleClose = () => {
    // descartamos cambios locales y cerramos (no aplicamos)
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
      <Modal.Header closeButton className="bg-dark text-white border-secondary">
        <Modal.Title>Filtros</Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-dark text-white">
        {/* IMPORTANTE: pasamos sólo onLocalChange al componente de filtros */}
        <SideBarFilters
          filters={localFilters}
          onLocalChange={(f) => {
            if (f && typeof f === 'object') setLocalFilters(f);
          }}
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

