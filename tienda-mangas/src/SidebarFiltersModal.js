// SidebarFiltersModal.js
import React, { useEffect, useState, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import SideBarFilters from './SideBarFilters';

const SidebarFiltersModal = ({ show, onClose, onFilterChange, initialFilters = {} }) => {
  const [localFilters, setLocalFilters] = useState(initialFilters);
  const openedRef = useRef(false);

  // Cuando show pasa de false -> true, inicializamos localFilters con snapshot
  useEffect(() => {
    if (show && !openedRef.current) {
      setLocalFilters(initialFilters || {});
      openedRef.current = true;
    }
    if (!show) {
      // limpiamos la marca para la próxima apertura
      openedRef.current = false;
    }
  }, [show]); // NOTA: intentionally NOT including initialFilters here

  const handleApply = () => {
    if (typeof onFilterChange === 'function') {
      onFilterChange(localFilters);
    }
    if (typeof onClose === 'function') onClose();
  };

  const handleClose = () => {
    // no re-sincronizamos con parent aquí: descartamos cambios locales
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
        {/* Pasamos el estado local y el setter local; no pasamos initialFilters directo */}
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

