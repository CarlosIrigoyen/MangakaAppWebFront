import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FiMenu, FiX } from 'react-icons/fi';
import { FaShoppingCart, FaUserCircle } from 'react-icons/fa';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';
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

const SidebarFilters = ({ onFilterChange, setShowLogin, setShowRegister }) => {
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
  const [collapsed, setCollapsed] = useState(false);

  const navigate = useNavigate();
  const { user, logout } = useContext(UserContext);
  const { cart } = useContext(CartContext);
  const cartCount = cart.length;

  const isMobile = () => window.innerWidth < 768;

  const handleActionAndCollapse = (callback) => {
    callback();
    if (isMobile()) setCollapsed(true);
  };

  // Reabrir en escritorio
  useEffect(() => {
    const onResize = () => {
      if (!isMobile()) setCollapsed(false);
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    async function fetchFilters() {
      try {
        const resp = await fetch(REACT_URL_FILTERS);
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
    if (isMobile()) setCollapsed(true);
  };

  const handleExclusiveChange = (field, value) => {
    const updated = filters[field] === value ? null : value;
    updateFilters({ ...filters, [field]: updated });
  };

  const handlePriceInputChange = (e) => {
    const { name, value } = e.target;
    if (/^\d*$/.test(value)) {
      setFilters({ ...filters, [name]: value });
    }
  };

  const applyPrice = () => updateFilters({ ...filters, applyPriceFilter: 1 });
  const clearPriceFilter = () =>
    updateFilters({ ...filters, applyPriceFilter: 0, minPrice: '', maxPrice: '' });

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
    if (isMobile()) setCollapsed(true);
  };

  const toggleSection = (sec) =>
    setOpenSections({ ...openSections, [sec]: !openSections[sec] });

  return (
    <div
      className="sidebar bg-secondary text-white p-3 vh-100 position-sticky top-0 overflow-auto"
      style={{ zIndex: 10 }}
    >
      {/* Toggle móvil */}
      <button
        className="btn btn-light d-md-none mb-3"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <FiMenu size={20} /> : <FiX size={20} />}
      </button>

      {!collapsed && (
        <>
          {/* ====== PANEL SUPERIOR (USUARIO / SESIÓN) ====== */}
          <div className="d-md-none mb-3 bg-dark p-3 rounded shadow-sm">
            <div className="d-flex align-items-center mb-2">
              <FaUserCircle size={28} className="me-2 text-warning" />
              {user ? (
                <span className="fw-bold text-white">👋 Hola, {user.nombre}</span>
              ) : (
                <span className="fw-bold text-white">Bienvenido 👋</span>
              )}
            </div>

            <div className="d-flex flex-wrap gap-2 mt-2">
              {user ? (
                <>
                  <button
                    className="btn btn-outline-light btn-sm flex-grow-1"
                    onClick={() => handleActionAndCollapse(() => navigate('/cart'))}
                  >
                    <FaShoppingCart className="me-1" /> Carrito ({cartCount})
                  </button>
                  <button
                    className="btn btn-danger btn-sm flex-grow-1"
                    onClick={() => handleActionAndCollapse(logout)}
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary btn-sm flex-grow-1"
                    onClick={() => handleActionAndCollapse(() => setShowRegister(true))}
                  >
                    Registrarse
                  </button>
                  <button
                    className="btn btn-outline-light btn-sm flex-grow-1"
                    onClick={() => handleActionAndCollapse(() => setShowLogin(true))}
                  >
                    Iniciar Sesión
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ====== FILTROS ====== */}
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
          />
        </>
      )}
    </div>
  );
};

SidebarFilters.propTypes = {
  onFilterChange: PropTypes.func.isRequired,
  setShowLogin: PropTypes.func.isRequired,
  setShowRegister: PropTypes.func.isRequired,
};

export default SidebarFilters;

