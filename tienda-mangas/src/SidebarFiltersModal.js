// SidebarFiltersModal.js
import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import SideBarFilters from './SideBarFilters';

const SidebarFiltersModal = ({ show, onClose, onFilterChange }) => {
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
        <SideBarFilters onFilterChange={onFilterChange} />
      </Modal.Body>

      <Modal.Footer className="bg-dark border-secondary">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SidebarFiltersModal;

