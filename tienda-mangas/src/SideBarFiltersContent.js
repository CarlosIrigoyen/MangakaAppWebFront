// 📁 SideBarFiltersContent.js
import React from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const SideBarFiltersContent = ({
  filters,
  availableFilters,
  openSections,
  toggleSection,
  handleExclusiveChange,
  handlePriceInputChange,
  applyPrice,
  clearPriceFilter,
  clearAllFilters,
}) => {
  return (
    <>
      {/* ====== SECCIONES DE FILTROS ====== */}
      {[
        { key: 'authors', label: 'Autores', items: availableFilters.authors },
        { key: 'languages', label: 'Idiomas', items: availableFilters.languages },
        { key: 'mangas', label: 'Mangas', items: availableFilters.mangas },
        { key: 'editorials', label: 'Editoriales', items: availableFilters.editorials },
      ].map(({ key, label, items }) => (
        <div key={key} className="mb-2 border-bottom border-light pb-2">
          <button
            className="btn btn-sm btn-dark w-100 d-flex justify-content-between align-items-center"
            onClick={() => toggleSection(key)}
          >
            <span>{label}</span>
            {openSections[key] ? <FiChevronUp /> : <FiChevronDown />}
          </button>

          <div
            className={`mt-2 ps-2 ${
              openSections[key]
                ? 'd-block animate__animated animate__fadeIn'
                : 'd-none'
            }`}
          >
            {items.length === 0 && <small className="text-light">Sin opciones</small>}
            {key === 'authors' &&
              items.map((a) => (
                <div key={a.id} className="form-check mt-1">
                  <input
                    className="form-check-input"
                    type="radio"
                    id={`author-${a.id}`}
                    name="author"
                    checked={filters.author === a.id}
                    onChange={() => handleExclusiveChange('author', a.id)}
                  />
                  <label
                    className="form-check-label ms-1"
                    htmlFor={`author-${a.id}`}
                  >
                    {a.nombre} {a.apellido}
                  </label>
                </div>
              ))}
            {key === 'languages' &&
              items.map((lang, i) => (
                <div key={i} className="form-check mt-1">
                  <input
                    className="form-check-input"
                    type="radio"
                    id={`language-${lang}`}
                    name="language"
                    checked={filters.language === lang}
                    onChange={() => handleExclusiveChange('language', lang)}
                  />
                  <label
                    className="form-check-label ms-1"
                    htmlFor={`language-${lang}`}
                  >
                    {lang}
                  </label>
                </div>
              ))}
            {key === 'mangas' &&
              items.map((m) => (
                <div key={m.id} className="form-check mt-1">
                  <input
                    className="form-check-input"
                    type="radio"
                    id={`manga-${m.id}`}
                    name="manga"
                    checked={filters.manga === m.id}
                    onChange={() => handleExclusiveChange('manga', m.id)}
                  />
                  <label
                    className="form-check-label ms-1"
                    htmlFor={`manga-${m.id}`}
                  >
                    {m.titulo}
                  </label>
                </div>
              ))}
            {key === 'editorials' &&
              items.map((e) => (
                <div key={e.id} className="form-check mt-1">
                  <input
                    className="form-check-input"
                    type="radio"
                    id={`editorial-${e.id}`}
                    name="editorial"
                    checked={filters.editorial === e.id}
                    onChange={() => handleExclusiveChange('editorial', e.id)}
                  />
                  <label
                    className="form-check-label ms-1"
                    htmlFor={`editorial-${e.id}`}
                  >
                    {e.nombre}
                  </label>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* ====== FILTRO PRECIO ====== */}
      <div className="mb-3 border-bottom border-light pb-3">
        <button
          className="btn btn-sm btn-dark w-100 d-flex justify-content-between align-items-center"
          onClick={() => toggleSection('price')}
        >
          <span>Precio</span>
          {openSections.price ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {openSections.price && (
          <div className="mt-2">
            <div className="mb-2">
              <label className="form-label">Mínimo</label>
              <input
                type="number"
                name="minPrice"
                min="0"
                step="1"
                className="form-control form-control-sm"
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
                className="form-control form-control-sm"
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
          </div>
        )}
      </div>

      {/* Quitar filtros */}
      <div class="sidebar bg-dark text-white p-3">
        <button class="btn btn-light text-dark w-100">Quitar filtros</button>
      </div>
    </>
  );
};

export default SideBarFiltersContent;
