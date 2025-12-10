// App.js
import React, { useContext, useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import { Navbar, Container, Form, Button, Spinner, Offcanvas, InputGroup } from 'react-bootstrap';

// Lazy loading de componentes pesados
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
const SubscriptionManager = lazy(() => import('./SubscriptionManager'));

import { CartProvider, CartContext } from './CartContext';
import { UserProvider, UserContext } from './UserContext';

const REGISTER_URL = `${process.env.REACT_APP_API_URL}/register`;
const LOGIN_URL = `${process.env.REACT_APP_API_URL}/login`;
const TOMOS_URL = `${process.env.REACT_APP_API_URL}/public/tomos`;

// Loading component para Suspense
const LoadingSpinner = () => (
  <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark">
    <div className="text-center">
      <Spinner animation="border" variant="primary" role="status">
        <span className="visually-hidden">Cargando...</span>
      </Spinner>
      <p className="text-white mt-2">Cargando aplicación...</p>
    </div>
  </div>
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

  // Mobile offcanvas menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Carga de tomos con useCallback para evitar recreaciones
  const fetchTomos = useCallback(async (filtersParam = {}, page = 1) => {
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
      //pass
    }
  }, []);

  useEffect(() => {
    fetchTomos(filters, 1);
  }, [fetchTomos, filters]);

  const handlePageChange = useCallback((page) => {
    fetchTomos(filters, page);
  }, [fetchTomos, filters]);

  const handleSearch = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    const f = { ...filters, searchText: searchQuery };
    setFilters(f);
    fetchTomos(f, 1);
    setNavExpanded(false);
    // Close mobile search UI after search on mobile
    setMobileSearchOpen(false);
  }, [filters, searchQuery, fetchTomos]);

  const handleShowInfo = useCallback((tomo) => {
    setSelectedTomo(tomo);
    setShowInfoModal(true);
  }, []);

  const handleFilterChange = useCallback((f) => {
    setFilters(f);
    fetchTomos(f, 1);
  }, [fetchTomos]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const nombre = e.target.formNombre.value;
    const direccion = e.target.formDireccion.value;
    const email = e.target.formEmailRegister.value;
    const password = e.target.formPasswordRegister.value;
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
      }
    } catch (err) {
      //pass
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.formEmailLogin.value;
    const password = e.target.formPasswordLogin.value;
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
      }
    } catch (err) {
      // pass
    }
  };

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
    setNavExpanded(false);
    setMobileMenuOpen(false);
  }, [logout, navigate]);

  if (loadingUser) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-dark text-white min-vh-100">
      {/* DESKTOP NAVBAR (single row) */}
      <Navbar
        bg="dark"
        variant="dark"
        expand="lg"
        fixed="top"
        expanded={navExpanded}
        onToggle={() => setNavExpanded(prev => !prev)}
        className="border-bottom border-light d-none d-lg-flex align-items-center desktop-navbar"
        style={{ zIndex: 1040 }}
      >
        <Container fluid className="d-flex align-items-center">
          {/* Brand */}
          <Navbar.Brand as={Link} to="/" onClick={() => setNavExpanded(false)} className="d-flex align-items-center me-3">
            <span className="brand-name">Mangaka Baka Shop</span>
          </Navbar.Brand>

          {/* Search (center) */}
          <Form className="mx-auto desktop-search-form d-flex align-items-center" onSubmit={handleSearch}>
            <InputGroup className="w-100">
              <Form.Control
                type="search"
                placeholder="Buscar tomos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar tomos"
              />
              {/* desktop: icon-only search */}
              <Button type="submit" variant="outline-light" aria-label="Buscar" className="icon-btn ms-2">
                <i className="bi bi-search" />
              </Button>
            </InputGroup>
          </Form>

          {/* Right actions */}
          <div className="ms-auto d-flex align-items-center gap-2">
            {user ? (
              <>
                <span className="me-2 d-none d-lg-inline greeting">Hola, {user.nombre}</span>

                {/* Suscripciones (desktop) */}
                <Suspense fallback={<Spinner animation="border" size="sm" />}>
                  <div className="d-none d-lg-inline">
                    <SubscriptionManager />
                  </div>
                </Suspense>

                {/* Cart - white background + badge */}
                <Button
                  as={Link}
                  to="/cart"
                  variant="light"
                  className="cart-btn d-flex align-items-center justify-content-center"
                  aria-label={`Carrito, ${cartCount} items`}
                >
                  <i className="bi bi-cart-fill" style={{ fontSize: '1rem' }} />
                  <span className="badge bg-danger ms-2 cart-badge">{cartCount}</span>
                </Button>

                {/* Logout (desktop) */}
                <Button variant="danger" className="action-btn ms-2 d-none d-lg-inline" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" className="action-btn me-2 d-none d-lg-inline" onClick={() => setShowRegister(true)}>
                  Registro
                </Button>
                <Button variant="secondary" className="action-btn d-none d-lg-inline" onClick={() => setShowLogin(true)}>
                  Login
                </Button>
              </>
            )}
          </div>
        </Container>
      </Navbar>

      {/* MOBILE TOPBAR */}
      <div
        className="d-md-none p-2 bg-dark text-white shadow-sm mobile-topbar d-flex align-items-center"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1050,
          height: 56
        }}
      >
        {/* Hamburger */}
        <div className="d-flex align-items-center" style={{ width: 56 }}>
          <Button variant="outline-light" size="sm" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú" className="hamburger-btn icon-btn">
            <i className="bi bi-list" />
          </Button>
        </div>

        {/* Brand center */}
        <div className="flex-fill text-center store-name">
          <strong>Mangaka Baka Shop</strong>
        </div>

        {/* Right: search icon + cart */}
        <div className="d-flex align-items-center" style={{ width: 56 }}>
          <Button
            variant="outline-light"
            size="sm"
            onClick={() => setMobileSearchOpen(prev => !prev)}
            aria-label="Buscar"
            className="search-btn icon-btn"
          >
            <i className="bi bi-search" />
          </Button>
        </div>

        {/* cart (positioned absolute to the right so it doesn't overlap brand) */}
        <div style={{ position: 'absolute', right: 8, top: 8 }}>
          <Button
            type="button"
            size="sm"
            variant="light"
            className="cart-btn icon-compact d-flex align-items-center justify-content-center"
            onClick={() => navigate('/cart')}
            aria-label={`Carrito, ${cartCount} items`}
          >
            <i className="bi bi-cart-fill" />
            <span className="badge bg-danger ms-1 cart-badge">{cartCount}</span>
          </Button>
        </div>
      </div>

      {/* Mobile search input (below topbar when toggled) */}
      {mobileSearchOpen && (
        <div className="d-md-none p-2 mobile-search-input" style={{ paddingTop: 64 }}>
          <Container fluid>
            <InputGroup>
              <Form.Control
                type="search"
                placeholder="Buscar tomos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              {/* mobile: text "Ir" */}
              <Button variant="outline-light" onClick={handleSearch} className="action-btn ms-2">
                Ir
              </Button>
            </InputGroup>
          </Container>
        </div>
      )}

      {/* Mobile Offcanvas Menu (starts below the topbar) */}
      <Offcanvas
        show={mobileMenuOpen}
        onHide={() => setMobileMenuOpen(false)}
        placement="start"
        className="bg-dark text-white mobile-offcanvas"
      >
        <Offcanvas.Header closeButton className="bg-dark text-white border-0">
          <Offcanvas.Title className="text-white">Menú</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="bg-dark text-white">
          {/* Bienvenida */}
          <div className="mb-3 p-2 border-bottom border-secondary menu-welcome">
            <div style={{ fontWeight: 700, fontSize: '1rem' }} className="welcome-block">
              {user ? `Bienvenido, ${user.nombre}` : 'Bienvenido'}
            </div>
            <div className="small text-secondary">Explora y encuentra tu próximo tomo</div>
          </div>

          {/* Botones: usar la misma clase 'action-btn' para igual tamaño */}
          <div className="d-grid gap-2">
            <Suspense fallback={<Button variant="outline-light">Notificaciones</Button>}>
              <SubscriptionManager />
            </Suspense>

            <Button variant="outline-light" className="action-btn" onClick={() => { setMobileSearchOpen(true); setMobileMenuOpen(false); }}>
              Buscar
            </Button>

            <Button variant="outline-light" className="action-btn filters-btn" onClick={() => { setShowFiltersModal(true); setMobileMenuOpen(false); }}>
              Filtros
            </Button>

            {!user ? (
              <>
                <Button variant="outline-primary" className="action-btn" onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }}>
                  Iniciar sesión
                </Button>
                <Button variant="outline-secondary" className="action-btn" onClick={() => { setShowRegister(true); setMobileMenuOpen(false); }}>
                  Registrarse
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline-danger" className="action-btn" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                  Cerrar sesión
                </Button>
              </>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* CONTENIDO PRINCIPAL */}
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
              setShowLogin={setShowLogin}
              setShowRegister={setShowRegister}
            />
          </Suspense>
        </div>

        {/* LISTA DE TOMOS */}
        <div className="main-content flex-grow-1 p-2">
          <Suspense fallback={<div className="text-center p-4"><Spinner animation="border" /></div>}>
            <TomoList
              tomos={tomos}
              pagination={pagination}
              onPageChange={handlePageChange}
              onShowInfo={handleShowInfo}
              isLoggedIn={!!user}
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
        />

        <RegisterModal show={showRegister} onHide={() => setShowRegister(false)} onSubmit={handleRegisterSubmit} />
        <LoginModal show={showLogin} onHide={() => setShowLogin(false)} onSubmit={handleLoginSubmit} />
        <InfoModal show={showInfoModal} onClose={() => setShowInfoModal(false)} tomo={selectedTomo} />
      </Suspense>
    </div>
  );
};

const App = () => (
  <UserProvider>
    <CartProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
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
