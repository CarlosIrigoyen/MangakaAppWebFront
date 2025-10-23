import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FiX } from 'react-icons/fi';
import { FaSearch } from 'react-icons/fa';

const API_FILTERS = `${process.env.REACT_APP_API_URL}/filters`;

const SidebarFiltersModal = ({
  show,
  onClose,
  onFilterChange,     // función que espera los filtros transformados (igual que tu handleFilterChange)
  setShowLogin,
  setShowRegister,
  resultsCount = 0    // opcional: cantidad que se muestra en el botón "Ver X resultados"
}) => {
  const [availableFilters, setAvailableFilters] = useState({
    authors: [], languages: [], mangas: [], editorials: []
  });

  const [filters, setFilters] = useState({
    author: null,
    language: null,
    manga: null,
    editorial: null,
    minPrice: '',
    maxPrice: '',
    applyPriceFilter: 0,
    searchText: ''
  });

  const [activeTab, setActiveTab] = useState('Destacados'); // nombre de tab activo

  useEffect(() => {
    async function fetchFilters() {
      try {
        const resp = await fetch(API_FILTERS);
        const json = await resp.json();
        setAvailableFilters(json || { authors: [], languages: [], mangas: [], editorials: [] });
      } catch (err) {
        console.error('Error fetching filters', err);
      }
    }
    fetchFilters();
  }, []);

  // cerrar con ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (show) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, onClose]);

  // transforma y emite al padre (misma forma que usas en MainApp)
  const emitFilters = (newFilters) => {
    setFilters(newFilters);
    const transformed = {
      authors: newFilters.author ? [newFilters.author] : [],
      languages: newFilters.language ? [newFilters.language] : [],
      mangas: newFilters.manga ? [newFilters.manga] : [],
      editorials: newFilters.editorial ? [newFilters.editorial] : [],
      searchText: newFilters.searchText || '',
      sortBy: 'titulo,numero_tomo'
    };
    if (newFilters.applyPriceFilter === 1 && newFilters.minPrice !== '' && newFilters.maxPrice !== '') {
      transformed.applyPriceFilter = 1;
      transformed.minPrice = parseFloat(newFilters.minPrice).toFixed(2);
      transformed.maxPrice = parseFloat(newFilters.maxPrice).toFixed(2);
    }
    onFilterChange(transformed);
  };

  const toggleExclusive = (field, value) => {
    const updated = filters[field] === value ? null : value;
    emitFilters({ ...filters, [field]: updated });
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    if (/^\d*$/.test(value)) setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyPriceNow = () => emitFilters({ ...filters, applyPriceFilter: 1 });
  const clearPrice = () => emitFilters({ ...filters, applyPriceFilter: 0, minPrice: '', maxPrice: '' });

  const clearAll = () => {
    const base = { author: null, language: null, manga: null, editorial: null, minPrice: '', maxPrice: '', applyPriceFilter: 0, searchText: '' };
    setFilters(base);
    onFilterChange({ authors: [], languages: [], mangas: [], editorials: [], searchText: '', sortBy: 'titulo,numero_tomo' });
  };

  if (!show) return null;

  return (
    <>
      <div className="sfm-backdrop" onClick={onClose} />

      <div className="sfm-modal" role="dialog" aria-modal="true">
        <div className="sfm-header">
          <div className="sfm-title">Filtros</div>
          <button className="btn sfm-close" onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="sfm-body">
          <aside className="sfm-left">
            {/* Tabs verticales */}
            <nav className="sfm-tabs">
              <button className={`sfm-tab ${activeTab === 'Destacados' ? 'active' : ''}`} onClick={() => setActiveTab('Destacados')}>Destacados</button>
              <button className={`sfm-tab ${activeTab === 'Categorias' ? 'active' : ''}`} onClick={() => setActiveTab('Categorias')}>Categorías</button>
              <button className={`sfm-tab ${activeTab === 'Condicion' ? 'active' : ''}`} onClick={() => setActiveTab('Condicion')}>Condición</button>
              <button className={`sfm-tab ${activeTab === 'Mejores' ? 'active' : ''}`} onClick={() => setActiveTab('Mejores')}>Mejores vendedores</button>
              <button className={`sfm-tab ${activeTab === 'Precio' ? 'active' : ''}`} onClick={() => setActiveTab('Precio')}>Precio</button>
              <button className={`sfm-tab ${activeTab === 'Cuotas' ? 'active' : ''}`} onClick={() => setActiveTab('Cuotas')}>Cuotas</button>
              <button className={`sfm-tab ${activeTab === 'Envios' ? 'active' : ''}`} onClick={() => setActiveTab('Envios')}>Envíos</button>
              <button className={`sfm-tab ${activeTab === 'Retiro' ? 'active' : ''}`} onClick={() => setActiveTab('Retiro')}>Retiro gratis</button>
            </nav>
          </aside>

          <section className="sfm-right">
            {/* Cada sección — muestra según activeTab */}
            {activeTab === 'Destacados' && (
              <div className="sfm-section">
                <h6>Destacados</h6>
                <div className="sfm-row">
                  <label className="sfm-switch">
                    <input type="checkbox" disabled /> {/* ejemplo: puede ser funcional */}
                    <span>Mejor precio en cuotas</span>
                  </label>
                </div>

                <div className="sfm-row">
                  <label className="sfm-switch">
                    <input type="checkbox" disabled />
                    <span>Enviado por FULL</span>
                  </label>
                </div>

                <div className="sfm-divider" />

                <h6>Categorías</h6>
                {/* usamos availableFilters.mangas como ejemplo de categorías */}
                <div className="sfm-list">
                  {availableFilters.mangas && availableFilters.mangas.map(m => (
                    <div key={m.id} className="form-check sfm-item">
                      <input className="form-check-input" type="radio" name="manga" id={`m-${m.id}`}
                        checked={filters.manga === m.id}
                        onChange={() => toggleExclusive('manga', m.id)} />
                      <label className="form-check-label" htmlFor={`m-${m.id}`}>{m.titulo}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Precio' && (
              <div className="sfm-section">
                <h6>Precio</h6>
                <div className="mb-2">
                  <label className="form-label small">Mínimo</label>
                  <input className="form-control" type="number" name="minPrice" value={filters.minPrice} onChange={handlePriceChange} placeholder="Ej: 100" />
                </div>
                <div className="mb-2">
                  <label className="form-label small">Máximo</label>
                  <input className="form-control" type="number" name="maxPrice" value={filters.maxPrice} onChange={handlePriceChange} placeholder="Ej: 500" />
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary btn-sm" onClick={applyPriceNow} disabled={!filters.minPrice || !filters.maxPrice}>Aplicar</button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={clearPrice}>Limpiar</button>
                </div>
              </div>
            )}

            {activeTab === 'Categorias' && (
              <div className="sfm-section">
                <h6>Categorías</h6>
                <div className="sfm-list">
                  {availableFilters.mangas && availableFilters.mangas.map(m => (
                    <div key={m.id} className="form-check sfm-item">
                      <input className="form-check-input" type="radio" name="manga2" id={`m2-${m.id}`}
                        checked={filters.manga === m.id}
                        onChange={() => toggleExclusive('manga', m.id)} />
                      <label className="form-check-label" htmlFor={`m2-${m.id}`}>{m.titulo}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* placeholder sections (Condicion, Mejores, etc) */}
            {['Condicion','Mejores','Cuotas','Envios','Retiro','Mejores'].includes(activeTab) && (
              <div className="sfm-section">
                <h6>{activeTab}</h6>
                <p className="small text-muted">Opciones de {activeTab} (aquí podés agregar controles similares)</p>
              </div>
            )}
          </section>
        </div>

        <div className="sfm-footer">
          <button className="btn btn-link sfm-clear" onClick={clearAll}>Limpiar filtros</button>
          <button className="btn btn-primary sfm-apply" onClick={() => { emitFilters(filters); onClose(); }}>
            <FaSearch className="me-2" /> Ver {resultsCount || 'resultados'}
          </button>
        </div>
      </div>
    </>
  );
};

SidebarFiltersModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  setShowLogin: PropTypes.func,
  setShowRegister: PropTypes.func,
  resultsCount: PropTypes.number
};

export default SidebarFiltersModal;
