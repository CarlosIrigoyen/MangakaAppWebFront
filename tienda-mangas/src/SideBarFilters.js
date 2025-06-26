// SidebarFilters.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiMenu, FiX } from 'react-icons/fi'; // 🔄 importa los íconos

// Define un objeto de estado inicial reutilizable
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

const SidebarFilters = ({ onFilterChange }) => {
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

  // Estado para colapsar el sidebar en pantallas chicas
  const [collapsed, setCollapsed] = useState(false); // 🔄

  useEffect(() => {
    async function fetchFilters() {
      try {
        const resp = await fetch('https://mangakaappweb-production.up.railway.app/api/filters');
        const json = await resp.json();
        setAvailableFilters(json);
      } catch (err) {
        console.error(err);
      }
    }
    fetchFilters();
  }, []);

  const updateFilters = (newFilters) => {
    setFilters(newFilters);
    const transformed = {
      authors: newFilters.author ? [newFilters.author] : [],
      languages: newFilters.language ? [newFilters.language] : [],
      mangas: newFilters.manga ? [newFilters.manga] : [],
      editorials: newFilters.editorial ? [newFilters.editorial] : [],
      searchText: newFilters.searchText,
      sortBy: 'titulo,numero_tomo',
    };
    if (
      newFilters.applyPriceFilter === 1 &&
      newFilters.minPrice !== '' &&
      newFilters.maxPrice !== ''
    ) {
      transformed.applyPriceFilter = 1;
      transformed.minPrice = parseFloat(newFilters.minPrice).toFixed(2);
      transformed.maxPrice = parseFloat(newFilters.maxPrice).toFixed(2);
    }
    onFilterChange(transformed);
  };

  const handleExclusiveChange = (field, value) => {
    const updated = filters[field] === value ? null : value;
    updateFilters({ ...filters, [field]: updated });
  };

  const handleSearchTextChange = (e) =>
    updateFilters({ ...filters, searchText: e.target.value });

  const handlePriceInputChange = (e) => {
    const { name, value } = e.target;
    if (/^\d*$/.test(value)) {
      setFilters({ ...filters, [name]: value });
    }
  };

  const applyPrice = () =>
    updateFilters({ ...filters, applyPriceFilter: 1 });
  const clearPriceFilter = () =>
    updateFilters({ ...filters, applyPriceFilter: 0, minPrice: '', maxPrice: '' });

  // 🔄 Resetea absolutamente todos los filtros
  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    onFilterChange({
      authors: [],
      languages: [],
      mangas: [],
      editorials: [],
      searchText: '',
      sortBy: 'titulo,numero_tomo',
    });
  };

  const toggleSection = (sec) =>
    setOpenSections({ ...openSections, [sec]: !openSections[sec] });

  return (
    <div
      className="
        sidebar
        bg-secondary text-white p-3
        vh-100 position-sticky top-0
        overflow-auto
      "
      style={{ zIndex: 10 }}
    >
      {/* 🔄 Botón para colapsar/expandir en móvil */}
      <button
        className="btn btn-light d-md-none mb-3"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <FiMenu size={20}/> : <FiX size={20}/>}
      </button>

      {/* Solo mostramos el contenido si no está colapsado */}
      {!collapsed && (
        <>
          {/* Campo de búsqueda global */}
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Buscar..."
              value={filters.searchText}
              onChange={handleSearchTextChange}
            />
          </div>
          <hr />

          {/* -- aquí van las secciones de autores, idiomas, mangas, editoriales, precio (tal como ya las tienes) -- */}

          {/* ... (tu código existente de secciones) ... */}

          {/* Precio */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Precio</h6>
              <button
                className="btn btn-sm btn-light"
                onClick={() => toggleSection('price')}
              >
                {openSections.price ? '−' : '+'}
              </button>
            </div>
            {openSections.price && (
              <>
                <div className="mb-2">
                  <label className="form-label">Mínimo</label>
                  <input
                    type="number"
                    name="minPrice"
                    min="0"
                    step="1"
                    className="form-control"
                    placeholder="Ej: 100"
                    value={filters.minPrice}
                    onChange={handlePriceInputChange}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Máximo</label>
                  <input
                    type="number"
                    name="maxPrice"
                    min="0"
                    step="1"
                    className="form-control"
                    placeholder="Ej: 500"
                    value={filters.maxPrice}
                    onChange={handlePriceInputChange}
                  />
                </div>
                <div className="d-flex justify-content-between">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={applyPrice}
                    disabled={!filters.minPrice || !filters.maxPrice}
                  >
                    Aplicar
                  </button>
                  <button className="btn btn-light btn-sm" onClick={clearPriceFilter}>
                    Limpiar
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 🔄 Botón “Limpiar todos los filtros” */}
          <div className="mt-4">
            <button
              className="btn btn-outline-light w-100"
              onClick={clearAllFilters}
            >
              Limpiar todos los filtros
            </button>
          </div>
        </>
      )}
    </div>
  );
};

SidebarFilters.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
};

export default SidebarFilters;
