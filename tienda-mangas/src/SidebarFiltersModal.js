// SidebarFiltersModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import SideBarFiltersContent from './SideBarFiltersContent';

const INITIAL_FILTERS = {
  author: null,
  language: null,
  manga: null,
  editorial: null,
  minPrice: '',
  maxPrice: '',
  searchText: '',
  applyPriceFilter: 0,
};

const REACT_URL_FILTERS = `${process.env.REACT_APP_API_URL}/filters`;

const SidebarFiltersModal = ({ show, onClose, onApplyFilters }) => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [availableFilters, setAvailableFilters] = useState({
    authors: [],
    languages: [],
    mangas: [],
    editorials: [],
  });
  const [openSections, setOpenSections] = useState({
    authors: true,
    languages: true,
    mangas: true,
    editorials: true,
    price: true,
  });

  // 🔹 Cargar filtros disponibles desde el backend
  useEffect(() => {
    async function fetchFilters() {
      try {
        const response = await fetch(REACT_URL_FILTERS);
        const json = await response.json();
        setAvailableFilters(json);
      } catch (error) {
       //pass 
      }
    }
    fetchFilters();
  }, []);

  // 🔹 Funciones de interacción
  const handleExclusiveChange = (field, value) => {
    const updatedValue = filters[field] === value ? null : value;
    setFilters({ ...filters, [field]: updatedValue });
  };

  const handlePriceInputChange = (e) => {
    const { name, value } = e.target;
    if (/^\d*$/.test(value)) setFilters({ ...filters, [name]: value });
  };

  const applyPrice = () => setFilters({ ...filters, applyPriceFilter: 1 });
  const clearPriceFilter = () =>
    setFilters({ ...filters, applyPriceFilter: 0, minPrice: '', maxPrice: '' });

  // Cuando se limpia todo desde este modal, además aplicamos filtros vacíos hacia el padre
  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    if (onApplyFilters && typeof onApplyFilters === 'function') {
      onApplyFilters({
        authors: [],
        languages: [],
        mangas: [],
        editorials: [],
        searchText: '',
        sortBy: 'titulo,numero_tomo',
        applyPriceFilter: 0
      });
    }
    // NO cerramos el modal automáticamente para que el usuario vea que quedó limpio;
    // si prefieres cerrar, descomenta onClose()
    // if (onClose) onClose();
  };

  const toggleSection = (section) =>
    setOpenSections({ ...openSections, [section]: !openSections[section] });

  // 🔹 Aplicar filtros y cerrar modal
  const handleApply = () => {
    const transformedFilters = {
      authors: filters.author ? [filters.author] : [],
      languages: filters.language ? [filters.language] : [],
      mangas: filters.manga ? [filters.manga] : [],
      editorials: filters.editorial ? [filters.editorial] : [],
      searchText: filters.searchText,
      sortBy: 'titulo,numero_tomo',
    };

    if (
      filters.applyPriceFilter === 1 &&
      filters.minPrice !== '' &&
      filters.maxPrice !== ''
    ) {
      transformedFilters.applyPriceFilter = 1;
      transformedFilters.minPrice = parseFloat(filters.minPrice).toFixed(2);
      transformedFilters.maxPrice = parseFloat(filters.maxPrice).toFixed(2);
    }

    if (onApplyFilters && typeof onApplyFilters === 'function') {
      onApplyFilters(transformedFilters);
    }

    onClose(); // cerrar el modal
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
        {/* 🔹 Solo filtros, sin botones de sesión */}
        <SideBarFiltersContent
          filters={filters}
          availableFilters={availableFilters}
          openSections={openSections}
          toggleSection={toggleSection}
          handleExclusiveChange={handleExclusiveChange}
          handlePriceInputChange={handlePriceInputChange}
          applyPrice={applyPrice}
          clearPriceFilter={clearPriceFilter}
          clearAllFilters={clearAllFilters}
          onApplyFilters={onApplyFilters}
          onClose={onClose}
        />
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
