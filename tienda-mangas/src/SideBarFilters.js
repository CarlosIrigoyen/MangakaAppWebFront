// SidebarFilters.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const SidebarFilters = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    author: null,
    language: null,
    manga: null,
    editorial: null,
    minPrice: '',
    maxPrice: '',
    searchText: '',
    applyPriceFilter: 0,
  });

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

  // Carga de filtros
  useEffect(() => {
    async function fetchFilters() {
      try {
        const resp = await fetch('http://localhost:8000/api/filters');
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


      {/* Autores */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Autores</h6>
          <button
            className="btn btn-sm btn-light"
            onClick={() => toggleSection('authors')}
          >
            {openSections.authors ? '−' : '+'}
          </button>
        </div>
        {openSections.authors &&
          availableFilters.authors.map((a) => (
            <div key={a.id} className="form-check mt-1">
              <input
                className="form-check-input"
                type="radio"
                id={`author-${a.id}`}
                name="author"
                checked={filters.author === a.id}
                onChange={() => handleExclusiveChange('author', a.id)}
              />
              <label className="form-check-label ms-1" htmlFor={`author-${a.id}`}>
                {a.nombre} {a.apellido}
              </label>
            </div>
          ))}
      </div>
      <hr />

      {/* Idiomas */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Idiomas</h6>
          <button
            className="btn btn-sm btn-light"
            onClick={() => toggleSection('languages')}
          >
            {openSections.languages ? '−' : '+'}
          </button>
        </div>
        {openSections.languages &&
          availableFilters.languages.map((lang, i) => (
            <div key={i} className="form-check mt-1">
              <input
                className="form-check-input"
                type="radio"
                id={`language-${lang}`}
                name="language"
                checked={filters.language === lang}
                onChange={() => handleExclusiveChange('language', lang)}
              />
              <label className="form-check-label ms-1" htmlFor={`language-${lang}`}>
                {lang}
              </label>
            </div>
          ))}
      </div>
      <hr />

      {/* Mangas */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Mangas</h6>
          <button
            className="btn btn-sm btn-light"
            onClick={() => toggleSection('mangas')}
          >
            {openSections.mangas ? '−' : '+'}
          </button>
        </div>
        {openSections.mangas &&
          availableFilters.mangas.map((m) => (
            <div key={m.id} className="form-check mt-1">
              <input
                className="form-check-input"
                type="radio"
                id={`manga-${m.id}`}
                name="manga"
                checked={filters.manga === m.id}
                onChange={() => handleExclusiveChange('manga', m.id)}
              />
              <label className="form-check-label ms-1" htmlFor={`manga-${m.id}`}>
                {m.titulo}
              </label>
            </div>
          ))}
      </div>
      <hr />

      {/* Editoriales */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Editoriales</h6>
          <button
            className="btn btn-sm btn-light"
            onClick={() => toggleSection('editorials')}
          >
            {openSections.editorials ? '−' : '+'}
          </button>
        </div>
        {openSections.editorials &&
          availableFilters.editorials.map((e) => (
            <div key={e.id} className="form-check mt-1">
              <input
                className="form-check-input"
                type="radio"
                id={`editorial-${e.id}`}
                name="editorial"
                checked={filters.editorial === e.id}
                onChange={() => handleExclusiveChange('editorial', e.id)}
              />
              <label className="form-check-label ms-1" htmlFor={`editorial-${e.id}`}>
                {e.nombre}
              </label>
            </div>
          ))}
      </div>
      <hr />

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
    </div>
  );
};

SidebarFilters.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
};

export default SidebarFilters;