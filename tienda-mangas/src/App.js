import React, { useContext, useState, useEffect, useCallback, Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';
import { Navbar, Container, Form, Button, Spinner } from 'react-bootstrap';
import { FaShoppingCart, FaUserCircle } from 'react-icons/fa';

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
      console.error('Error al cargar tomos:', error);
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
      console.error(err);
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
      console.error(err);
    }
  };

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
    setNavExpanded(false);
  }, [logout, navigate]);

  if (loadingUser) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-dark text-white min-vh-100">
      {/* NAVBAR ESCRITORIO - FIJA */}
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
            <img 
              src="/img/Mangaka.webp" 
              alt="Logo" 
              width="40" 
              height="40" 
              className="rounded-circle"
              loading="lazy"
            />
            <span className="ms-2">Mangaka Baka Shop</span>
          </Navbar.Brand>

          <Form
            className="mx-auto"
            style={{ width: '50%' }}
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
          >
            <Form.Control
              type="search"
              placeholder="Buscar"
              className="me-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="button" variant="outline-light" onClick={handleSearch}>
              Buscar
            </Button>
          </Form>

          <div className="ms-auto d-flex align-items-center">
            {user ? (
              <>
                <span className="me-2">Hola, {user.nombre}</span>

                {/* Botón de suscripciones a notificaciones */}
                <Suspense fallback={<Spinner animation="border" size="sm" />}>
                  <SubscriptionManager />
                </Suspense>

                <Button type="button" variant="outline-light" as={Link} to="/cart" aria-label={`Carrito, ${cartCount} items`}>
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

      {/* BARRA MÓVIL FIJA */}
      <div
        className="d-md-none p-3 bg-dark text-white shadow-sm"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1050,
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center">
            <FaUserCircle size={26} className="me-2" />
            <strong>{user ? `Hola, ${user.nombre}` : 'Bienvenido'}</strong>
          </div>
          {user && (
            <div className="d-flex align-items-center">
              <Suspense fallback={<Spinner animation="border" size="sm" />}>
                <SubscriptionManager />
              </Suspense>
              <Button
                type="button"
                size="sm"
                variant="light"
                className="ms-2"
                onClick={() => navigate('/cart')}
                aria-label={`Carrito, ${cartCount} items`}
              >
                <FaShoppingCart /> {cartCount}
              </Button>
            </div>
          )}
        </div>

        <div className="d-flex justify-content-center gap-2">
          {!user ? (
            <>
              <Button size="sm" variant="primary" onClick={() => setShowRegister(true)}>
                Registro
              </Button>
              <Button size="sm" variant="light" className="text-dark" onClick={() => setShowLogin(true)}>
                Login
              </Button>
            </>
          ) : (
            <Button size="sm" variant="danger" onClick={handleLogout}>
              Salir
            </Button>
          )}
          <Button size="sm" variant="warning" onClick={() => setShowFiltersModal(true)}>
            Filtros
          </Button>
        </div>
      </div>

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