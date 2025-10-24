// SidebarFiltersModal.jsx
import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { FiX } from 'react-icons/fi';
import { FaSearch, FaShoppingCart, FaUserCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';

const API_FILTERS = `${process.env.REACT_APP_API_URL}/filters`;

const SidebarFiltersModal = ({
  show,
  onClose,
  onFilterChange,
  setShowLogin,
  setShowRegister,
  resultsCount = 0
}) => {
  const navigate = useNavigate();
  const { user, logout } = useContext(UserContext);
  const { cart } = useContext(CartContext);

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

  const [activeTab, setActiveTab] = useState('Destacados'); // controla la vista derecha

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

      <div className="sfm-modal" role="dialog" aria-modal="true" aria-label="Filtros">
        <div className="sfm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FaSearch />
            <div className="sfm-title">Filtros</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn sfm-close" onClick={onClose}><FiX size={18} /></button>
          </div>
        </div>

        <div className="sfm-body">
          {/* Left tabs */}
          <aside className="sfm-left">
            <nav className="sfm-tabs">
              <button className={`sfm-tab ${activeTab === 'Destacados' ? 'active' : ''}`} onClick={() => setActiveTab('Destacados')}>Destacados</button>
              <button className={`sfm-tab ${activeTab === 'Categorias' ? 'active' : ''}`} onClick={() => setActiveTab('Categorias')}>Categorías</button>
              <button className={`sfm-tab ${activeTab === 'Condicion' ? 'active' : ''}`} onClick={() => setActiveTab('Condicion')}>Condición</button>
              <button className={`sfm-tab ${activeTab === 'Precio' ? 'active' : ''}`} onClick={() => setActiveTab('Precio')}>Precio</button>
              <button className={`sfm-tab ${activeTab === 'Autores' ? 'active' : ''}`} onClick={() => setActiveTab('Autores')}>Autores</button>
              <button className={`sfm-tab ${activeTab === 'Idiomas' ? 'active' : ''}`} onClick={() => setActiveTab('Idiomas')}>Idiomas</button>
              <button className={`sfm-tab ${activeTab === 'Editoriales' ? 'active' : ''}`} onClick={() => setActiveTab('Editoriales')}>Editoriales</button>
            </nav>
          </aside>

          {/* Right content */}
          <section className="sfm-right">
            {/* --- PANEL SUPERIOR: Bienvenida + Carrito + Auth (visible en modal también) --- */}
            <div className="mb-3 p-2 bg-light rounded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FaUserCircle size={28} />
                <div>
                  {user ? <div className="fw-bold">Hola, {user.nombre}</div> : <div className="fw-bold">Bienvenido</div>}
                  <small className="text-muted">{cart.length} artículos en el carrito</small>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {user ? (
                  <>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => { onClose(); navigate('/cart'); }}
                    >
                      <FaShoppingCart /> Carrito ({cart.length})
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => { logout(); onClose(); }}>
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => { setShowRegister(true); }}>
                      Registrarse
                    </button>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => { setShowLogin(true); }}>
                      Iniciar sesión
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* CONTENIDO SEGÚN TAB */}
            {activeTab === 'Destacados' && (
              <div className="sfm-section">
                <h6>Destacados</h6>
                <p className="small text-muted">Opciones destacadas. (puedes añadir switches reales aquí)</p>

                <div className="sfm-divider" />

                <h6>Categorías (Mangas)</h6>
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

            {activeTab === 'Autores' && (
              <div className="sfm-section">
                <h6>Autores</h6>
                <div className="sfm-list">
                  {availableFilters.authors && availableFilters.authors.map(a => (
                    <div key={a.id} className="form-check sfm-item">
                      <input className="form-check-input" type="radio" name="author" id={`a-${a.id}`}
                        checked={filters.author === a.id}
                        onChange={() => toggleExclusive('author', a.id)} />
                      <label className="form-check-label" htmlFor={`a-${a.id}`}>{a.nombre} {a.apellido}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Idiomas' && (
              <div className="sfm-section">
                <h6>Idiomas</h6>
                <div className="sfm-list">
                  {availableFilters.languages && availableFilters.languages.map((lang, idx) => (
                    <div key={idx} className="form-check sfm-item">
                      <input className="form-check-input" type="radio" name="language" id={`lang-${idx}`}
                        checked={filters.language === lang}
                        onChange={() => toggleExclusive('language', lang)} />
                      <label className="form-check-label" htmlFor={`lang-${idx}`}>{lang}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'Editoriales' && (
              <div className="sfm-section">
                <h6>Editoriales</h6>
                <div className="sfm-list">
                  {availableFilters.editorials && availableFilters.editorials.map(e => (
                    <div key={e.id} className="form-check sfm-item">
                      <input className="form-check-input" type="radio" name="editorial" id={`ed-${e.id}`}
                        checked={filters.editorial === e.id}
                        onChange={() => toggleExclusive('editorial', e.id)} />
                      <label className="form-check-label" htmlFor={`ed-${e.id}`}>{e.nombre}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* placeholder para secciones pequeñas */}
            {['Condicion','Mejores','Cuotas','Envios','Retiro'].includes(activeTab) && (
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

