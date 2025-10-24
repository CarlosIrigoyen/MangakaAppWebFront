// SidebarFiltersModal.js
import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import SideBarFilters from './SideBarFilters';

const SidebarFiltersModal = ({ show, onClose, onFilterChange }) => {
  const handleApply = () => {
    // Aquí podés hacer algo como guardar los filtros aplicados
    // o simplemente cerrar manualmente el modal
    onClose();
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
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
        {/* 🔹 El componente de filtros sigue activo sin cerrar el modal */}
        <SideBarFilters onFilterChange={onFilterChange} />
      </Modal.Body>

      <Modal.Footer className="bg-dark border-secondary">
        <Button variant="secondary" onClick={onClose}>
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

