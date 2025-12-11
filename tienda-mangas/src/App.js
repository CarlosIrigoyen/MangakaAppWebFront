// App.js
import React, { useContext, useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';
import {
  Navbar,
  Container,
  Form,
  Button,
  Spinner,
  Alert,
  InputGroup
} from 'react-bootstrap';
import { FaShoppingCart, FaSearch, FaBars, FaBell, FaFilter, FaHome } from 'react-icons/fa';

const TomoList = lazy(() => import('./TomoList'));
const SidebarFilters = lazy(() => import('./SideBarFilters'));
const SidebarFiltersModal = lazy(() => import('./SidebarFiltersModal'));
const RegisterModal = lazy(() => import('./RegisterModal'));
const LoginModal = lazy(() => import('./LoginModal'));
const InfoModal = lazy(() => import('./InfoModal'));
const CartPage = lazy(() => import('./CartPage'));
const FacturasPage = lazy(() => import('./FacturasPage'));
const DetalleFacturaPage = lazy(() => import('./DetalleFacturaPage'));
const SuccessPage = lazy(() => import('./SuccessPage'));
const FailurePage = lazy(() => import('./FailurePage'));
const PendingPage = lazy(() => import('./PendingPage'));
const PayPalReturn = lazy(() => import('./PayPalReturn'));

// SOLO modal controlado: SubscriptionManagerModal (no botón interno)
const SubscriptionManagerModal = lazy(() => import('./SubscriptionManager'));

import { CartProvider, CartContext } from './CartContext';
import { UserProvider, UserContext } from './UserContext';

const REGISTER_URL = `${process.env.REACT_APP_API_URL}/register`;
const LOGIN_URL = `${process.env.REACT_APP_API_URL}/login`;
const TOMOS_URL = `${process.env.REACT_APP_API_URL}/public/tomos`;

// Loading componente optimizado sin bloquear LCP
const TomoListFallback = () => (
  <div className="text-center p-3" aria-hidden="true">
    <div className="lcp-image-container loading" style={{ height: 220, borderRadius: 8 }} />
  </div>
);

const SmallSpinner = () => (
  <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
);

const MainApp = () => {
  const navigate = useNavigate();
  const { user, login, logout, loadingUser } = useContext(UserContext);
  const { cart } = useContext(CartContext);
  const cartCount = cart.length;

  const [tomos, setTomos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    authors: [],
    languages: [],
    mangas: [],
    editorials: [],
    searchText: '',
    sortBy: 'titulo,numero_tomo',
    applyPriceFilter: 0,
    minPrice: '',
    maxPrice: ''
  });

  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedTomo, setSelectedTomo] = useState(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const dropdownRef = useRef(null);

  // Carga inicial de tomos sin mostrar loading global
  const fetchTomos = useCallback(async (filtersParam = {}, page = 1) => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (filtersParam.authors?.length) params.append('authors', filtersParam.authors.join(','));
    if (filtersParam.languages?.length) params.append('languages', filtersParam.languages.join(','));
    if (filtersParam.mangas?.length) params.append('mangas', filtersParam.mangas.join(','));
    if (filtersParam.editorials?.length) params.append('editorials', filtersParam.editorials.join(','));
    if (filtersParam.searchText) params.append('search', filtersParam.searchText);
    if (filtersParam.applyPriceFilter && filtersParam.minPrice && filtersParam.maxPrice) {
      params.append('applyPriceFilter', 1);
      params.append('minPrice', filtersParam.minPrice);
      params.append('maxPrice', filtersParam.maxPrice);
    }
    params.append('page', page);

    try {
      const res = await fetch(`${TOMOS_URL}?${params.toString()}`);
      const data = await res.json();
      setTomos(data.data || []);
      setPagination({
        currentPage: data.current_page || 1,
        lastPage: data.last_page || 1,
        total: data.total || 0
      });
    } catch (error) {
      console.error('Error fetch tomos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTomos(filters, 1);
  }, [fetchTomos, filters]);

  const handlePageChange = useCallback((page) => {
    fetchTomos(filters, page);
  }, [fetchTomos, filters]);

  const handleSearch = useCallback(() => {
    const f = { ...filters, searchText: searchQuery };
    setFilters(f);
    fetchTomos(f, 1);
    setNavExpanded(false);
    setShowMobileSearch(false);
  }, [filters, searchQuery, fetchTomos]);

  const handleShowInfo = useCallback((tomo) => {
    setSelectedTomo(tomo);
    setShowInfoModal(true);
  }, []);

  const handleFilterChange = useCallback((f) => {
    setFilters(f);
    fetchTomos(f, 1);
  }, [fetchTomos]);

  const resetFilters = useCallback(() => {
    const defaultFilters = {
      authors: [],
      languages: [],
      mangas: [],
      editorials: [],
      searchText: '',
      sortBy: 'titulo,numero_tomo',
      applyPriceFilter: 0,
      minPrice: '',
      maxPrice: ''
    };
    setFilters(defaultFilters);
    setSearchQuery('');
    fetchTomos(defaultFilters, 1);
    setSuccessMessage('Filtros eliminados correctamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  }, [fetchTomos]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const nombre = e.target.formNombre?.value;
    const direccion = e.target.formDireccion?.value;
    const email = e.target.formEmailRegister?.value;
    const password = e.target.formPasswordRegister?.value;

    try {
      const res = await fetch(REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, direccion })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.cliente, data.token);
        setShowRegister(false);
        setSuccessMessage('¡Registro exitoso!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Error en el registro');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const email = e.target.formEmailLogin?.value;
    const password = e.target.formPasswordLogin?.value;
    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.cliente, data.token);
        setShowLogin(false);
        setSuccessMessage('¡Bienvenido!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
    }
  };

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
    setShowMobileDropdown(false);
    setSuccessMessage('¡Sesión cerrada correctamente!');
    setTimeout(() => setSuccessMessage(''), 3000);
  }, [logout, navigate]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMobileDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-dark text-white min-vh-100">
      {/* Mensajes de éxito */}
      {successMessage && (
        <Alert
          variant="success"
          className="position-fixed top-0 start-50 translate-middle-x mt-3 z-1050 floating-alert"
          style={{ minWidth: '300px' }}
          dismissible
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {/* NAVBAR ESCRITORIO - FIJA - SIN menú desplegable */}
      <Navbar
        bg="dark"
        variant="dark"
        expand="lg"
        fixed="top"
        expanded={navExpanded}
        onToggle={() => setNavExpanded(prev => !prev)}
        className="border-bottom border-light d-none d-lg-flex"
        style={{ zIndex: 1040 }}
      >
        <Container fluid>
          <Navbar.Brand as={Link} to="/" onClick={() => setNavExpanded(false)}>
            <span className="ms-2 fw-bold">Mangaka Baka Shop</span>
          </Navbar.Brand>

          {/* Barra de búsqueda compacta */}
          <div className="mx-auto" style={{ width: '300px' }}>
            <InputGroup>
              <Form.Control
                type="search"
                placeholder="Buscar mangas..."
                className="border-end-0 bg-dark text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                aria-label="Buscar mangas"
              />
              <Button
                variant="dark"
                className="btn-black border border-secondary"
                onClick={handleSearch}
                style={{ borderLeft: 'none' }}
                aria-label="Buscar"
              >
                <FaSearch />
              </Button>
            </InputGroup>
          </div>

          <div className="ms-auto d-flex align-items-center">
            {loadingUser ? (
              <div className="d-flex align-items-center gap-2">
                <span className="me-2 text-muted">Cargando...</span>
                <SmallSpinner />
              </div>
            ) : user ? (
              <>
                <span className="me-2">Hola, {user.nombre}</span>

                {/* TRIGGER: abre el modal de suscripciones */}
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => setShowSubscriptionModal(true)}
                  className="ms-2"
                >
                  <FaBell className="me-1" />
                  Suscripciones
                </Button>

                <Button 
                  type="button" 
                  variant="outline-light" 
                  as={Link} 
                  to="/cart" 
                  className="btn-black ms-2"
                  aria-label={`Carrito, ${cartCount} items`}
                >
                  <FaShoppingCart /> {cartCount}
                </Button>
                <Button type="button" variant="danger" className="ms-2" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" className="me-2" onClick={() => setShowRegister(true)}>
                  Registro
                </Button>
                <Button variant="secondary" onClick={() => setShowLogin(true)}>
                  Login
                </Button>
              </>
            )}
          </div>
        </Container>
      </Navbar>

      {/* BARRA MÓVIL FIJA - Con menú desplegable */}
      <div
        className="d-lg-none p-2 bg-dark text-white shadow-sm mobile-top-bar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1050,
          height: '56px'
        }}
      >
        <div className="d-flex justify-content-between align-items-center h-100">
          {/* MENÚ DESPLEGABLE IZQUIERDA */}
          <div className="d-flex align-items-center" ref={dropdownRef}>
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={() => setShowMobileDropdown(!showMobileDropdown)}
              className="btn-black"
              aria-label="Abrir menú"
            >
              <FaBars />
            </Button>
            
            {/* MENÚ DESPLEGABLE PERSONALIZADO */}
            {showMobileDropdown && (
              <div 
                className="position-absolute bg-dark text-white border border-secondary rounded shadow-lg mt-2 mobile-dropdown-menu"
                style={{
                  width: '280px',
                  zIndex: 1060,
                  top: '100%',
                  left: '0'
                }}
              >
                {/* Encabezado del menú */}
                <div className="dropdown-header p-2 border-bottom border-secondary">
                  <h6 className="mb-0">Menú Principal</h6>
                </div>
                
                <div className="p-2">
                  {/* Mensaje de bienvenida si está logueado */}
                  {user && (
                    <div className="text-center mb-3 p-2 bg-secondary rounded">
                      <h6 className="mb-0">👋 Hola, {user.nombre}</h6>
                    </div>
                  )}
                  
                  {/* Opciones del menú */}
                  <Button 
                    variant="outline-light" 
                    onClick={() => { navigate('/'); setShowMobileDropdown(false); }}
                    className="text-start d-flex align-items-center w-100 mb-2"
                  >
                    <FaHome className="me-2" /> Inicio
                  </Button>
                  
                  {/* Opciones de filtros para TODOS los usuarios */}
                  <div className="border-top border-secondary pt-2 mt-2">
                    <Button 
                      variant="outline-light" 
                      onClick={() => { setShowFiltersModal(true); setShowMobileDropdown(false); }}
                      className="text-start d-flex align-items-center w-100 mb-2"
                    >
                      <FaFilter className="me-2" /> Filtros
                    </Button>
                    
                    <Button 
                      variant="outline-light" 
                      onClick={() => { resetFilters(); setShowMobileDropdown(false); }}
                      className="text-start w-100 mb-2 btn-black"
                    >
                      Quitar Filtros
                    </Button>
                  </div>
                  
                  {/* Opciones específicas según si está logueado o no */}
                  {user ? (
                    <>
                      <div className="border-top border-secondary pt-2 mt-2">
                        {/* TRIGGER móvil: abre el mismo modal de suscripciones */}
                        <Button 
                          variant="outline-light" 
                          size="sm" 
                          onClick={() => { 
                            setShowSubscriptionModal(true); 
                            setShowMobileDropdown(false); 
                          }}
                          className="text-start d-flex align-items-center w-100 mb-2"
                        >
                          <FaBell className="me-2" /> Suscripciones
                        </Button>
                        
                        <Button 
                          variant="danger" 
                          onClick={() => { handleLogout(); setShowMobileDropdown(false); }}
                          className="mt-2 w-100"
                        >
                          Cerrar Sesión
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="border-top border-secondary pt-2 mt-2">
                        <Button 
                          variant="primary" 
                          onClick={() => { setShowRegister(true); setShowMobileDropdown(false); }}
                          className="w-100 mb-2"
                        >
                          Registrarse
                        </Button>
                        
                        <Button 
                          variant="outline-light" 
                          onClick={() => { setShowLogin(true); setShowMobileDropdown(false); }}
                          className="w-100"
                        >
                          Iniciar Sesión
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* NOMBRE CENTRADO */}
          <div className="text-center position-absolute start-50 translate-middle-x">
            <strong className="fs-6">Mangaka Baka Shop</strong>
          </div>

          {/* CARRITO + LUPA DERECHA */}
          <div className="d-flex align-items-center">
            <Button
              type="button"
              size="sm"
              className="me-2 btn-black"
              onClick={() => setShowMobileSearch(true)}
              aria-label="Buscar"
            >
              <FaSearch />
            </Button>
            {user && (
              <Button
                type="button"
                size="sm"
                className="btn-black"
                onClick={() => navigate('/cart')}
                aria-label={`Carrito, ${cartCount} items`}
              >
                <FaShoppingCart /> {cartCount > 0 && <span className="badge bg-danger">{cartCount}</span>}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay de búsqueda móvil con espacio */}
      {showMobileSearch && (
        <div className="d-lg-none search-overlay-mobile">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Buscar</h5>
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={() => setShowMobileSearch(false)}
              className="btn-black"
            >
              ✕
            </Button>
          </div>
          <InputGroup className="mb-3">
            <Form.Control
              type="search"
              placeholder="Buscar mangas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
              className="bg-dark text-white"
            />
            <Button 
              variant="dark" 
              className="btn-black" 
              onClick={() => { handleSearch(); setShowMobileSearch(false); }}
            >
              <FaSearch />
            </Button>
          </InputGroup>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL - Sin loading global */}
      <div
        className="d-flex flex-column flex-md-row main-content-container"
        style={{
          minHeight: 'calc(100vh - 56px)',
          paddingTop: '80px'
        }}
      >
        {/* SIDEBAR ESCRITORIO */}
        <div className="d-none d-md-block sidebar-fixed">
          <Suspense fallback={<div className="p-3 text-white">Cargando filtros...</div>}>
            <SidebarFilters
              onFilterChange={handleFilterChange}
              onResetFilters={resetFilters}
              setShowLogin={setShowLogin}
              setShowRegister={setShowRegister}
            />
          </Suspense>
        </div>

        {/* LISTA DE TOMOS - Solo muestra loading interno si está cargando */}
        <div className="main-content flex-grow-1 p-2">
          {error && (
            <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          {/* Indicador de carga mínima */}
          {isLoading && (
            <div className="text-center mb-3">
              <Spinner animation="border" size="sm" className="me-2" />
              <span>Cargando tomos...</span>
            </div>
          )}
          
          <Suspense fallback={<TomoListFallback />}>
            <TomoList
              tomos={tomos}
              pagination={pagination}
              onPageChange={handlePageChange}
              onShowInfo={handleShowInfo}
              isLoggedIn={!!user}
              isLoading={isLoading}
            />
          </Suspense>
        </div>
      </div>

      {/* MODALES CON SUSPENSE */}
      <Suspense fallback={null}>
        <SidebarFiltersModal
          show={showFiltersModal}
          onClose={() => setShowFiltersModal(false)}
          onApplyFilters={handleFilterChange}
          onResetFilters={resetFilters}
        />

        <RegisterModal
          show={showRegister}
          onHide={() => {
            setShowRegister(false);
            setError('');
          }}
          onSubmit={handleRegisterSubmit}
          error={error}
          setError={setError}
        />
        <LoginModal
          show={showLogin}
          onHide={() => {
            setShowLogin(false);
            setError('');
          }}
          onSubmit={handleLoginSubmit}
          error={error}
          setError={setError}
        />
        <InfoModal show={showInfoModal} onClose={() => setShowInfoModal(false)} tomo={selectedTomo} />
        
        {/* Modal de suscripciones CONTROLADO desde App.js */}
        <SubscriptionManagerModal 
          show={showSubscriptionModal}
          onHide={() => setShowSubscriptionModal(false)}
        />
      </Suspense>
    </div>
  );
};

const App = () => (
  <UserProvider>
    <CartProvider>
      <Router>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<MainApp />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/facturas" element={<FacturasPage />} />
            <Route path="/facturas/:id" element={<DetalleFacturaPage />} />
            <Route path="/checkout/success" element={<SuccessPage />} />
            <Route path="/checkout/failure" element={<FailurePage />} />
            <Route path="/checkout/pending" element={<PendingPage />} />
            <Route path="/paypal-return" element={<PayPalReturn />} />
          </Routes>
        </Suspense>
      </Router>
    </CartProvider>
  </UserProvider>
);

export default App;
