// src/App.js
import React, { useContext, useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { Navbar, Container, Form, Button, Dropdown } from 'react-bootstrap';
import { FaShoppingCart } from 'react-icons/fa';

import SuccessPage from './SuccessPage';
import SideBarFilters from './SideBarFilters';
import SidebarFiltersModal from './SidebarFiltersModal'; // modal estilo MercadoLibre
import RegisterModal    from './RegisterModal';
import LoginModal       from './LoginModal';
import InfoModal        from './InfoModal';
import TomoList         from './TomoList';
import CartPage         from './CartPage';
import FacturasPage     from './FacturasPage';
import DetalleFacturaPage from './DetalleFacturaPage';
import FailurePage from './FailurePage';
import PendingPage from './PendingPage';
import PayPalReturn from './PayPalReturn';

import { CartProvider, CartContext } from './CartContext';
import { UserProvider, UserContext } from './UserContext';

const REGISTER_URL = `${process.env.REACT_APP_API_URL}/register`;
const LOGIN_URL    = `${process.env.REACT_APP_API_URL}/login`;
const TOMOS_URL    = `${process.env.REACT_APP_API_URL}/public/tomos`;

const MainApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout, loadingUser } = useContext(UserContext);
  const { cart } = useContext(CartContext);
  const cartCount = cart.length;

  // Estados para filtros y listado de tomos
  const [tomos, setTomos]               = useState([]);
  const [pagination, setPagination]     = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [currentFilters, setCurrentFilters] = useState({
    authors: [], languages: [], mangas: [], editorials: [],
    searchText: '', sortBy: 'titulo,numero_tomo',
    applyPriceFilter: 0, minPrice: '', maxPrice: ''
  });

  // Estados para modales y mobile filters
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin]       = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedTomo, setSelectedTomo] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false); // controla modal de filtros en móvil

  useEffect(() => {
    handleFilterChange(currentFilters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registro
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const nombre    = e.target.elements.formNombre.value;
    const direccion = e.target.elements.formDireccion.value;
    const email     = e.target.elements.formEmailRegister.value;
    const password  = e.target.elements.formPasswordRegister.value;

    const res = await fetch(REGISTER_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ nombre, email, password, direccion })
    });
    const data = await res.json();
    if (res.ok) {
      login(data.cliente, data.token);
      setShowRegister(false);
    } else console.error(data);
  };

  // Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const email    = e.target.elements.formEmailLogin.value;
    const password = e.target.elements.formPasswordLogin.value;

    const res = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      login(data.cliente, data.token);
      setShowLogin(false);
    } else console.error(data);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Filtrar tomos
  const handleFilterChange = async (filters, page = 1) => {
    setCurrentFilters(filters);
    const params = new URLSearchParams();
    if (filters.authors.length)   params.append('authors', filters.authors.join(','));
    if (filters.languages.length) params.append('languages', filters.languages.join(','));
    if (filters.mangas.length)    params.append('mangas', filters.mangas.join(','));
    if (filters.editorials.length)params.append('editorials', filters.editorials.join(','));
    if (filters.searchText)       params.append('search', filters.searchText);
    if (filters.applyPriceFilter && filters.minPrice && filters.maxPrice) {
      params.append('applyPriceFilter', 1);
      params.append('minPrice', filters.minPrice);
      params.append('maxPrice', filters.maxPrice);
    }
    params.append('page', page);

    try {
      const res = await fetch(`${TOMOS_URL}?${params.toString()}`);
      const result = await res.json();
      setTomos(result.data || []);
      setPagination({
        currentPage: result.current_page || 1,
        lastPage:    result.last_page || 1,
        total:       result.total || 0
      });
    } catch (err) {
      console.error('Error al obtener tomos:', err);
      setTomos([]);
      setPagination(null);
    }
  };

  const handlePageChange = (p) => handleFilterChange(currentFilters, p);
  const handleShowInfo   = (tomo) => {
    setSelectedTomo(tomo);
    setShowInfoModal(true);
  };
  const handleSearch     = () => handleFilterChange({ ...currentFilters, searchText: searchQuery }, 1);

  if (loadingUser) {
    return <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-white">Cargando usuario...</div>;
  }

  return (
    <div className="bg-dark text-white min-vh-100">
      <Navbar bg="dark" variant="dark" expand="lg" className="border-bottom border-light shadow">
        <Container fluid>
          <div className="d-flex align-items-center">
            <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
              <img src="/img/Mangaka.png" alt="Logo" width="40" height="40" className="rounded-circle" />
              <span className="ms-2">Mangaka Baka Shop</span>
            </Navbar.Brand>

            {/* Botón móvil para abrir filtros (visible solo en móvil) */}
            <button
              className="btn btn-warning d-md-none ms-2"
              aria-label="Abrir filtros"
              onClick={() => setFiltersOpen(true)}
            >
              Filtros
            </button>
          </div>

          {/* Buscador escritorio */}
          <Form
            className="d-none d-lg-flex mx-auto"
            style={{ width: '50%' }}
            onSubmit={e => { e.preventDefault(); handleSearch(); }}
          >
            <Form.Control
              type="search"
              placeholder="Buscar"
              className="me-2"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Button variant="outline-light" onClick={handleSearch}>Buscar</Button>
          </Form>

          {/* Controles de usuario y carrito en escritorio */}
          <div className="d-none d-lg-flex ms-auto align-items-center">
            {user ? (
              <>
                <span className="me-2">Hola, {user.nombre}</span>
                <Dropdown align="end" className="me-2">
                  <Dropdown.Toggle variant="outline-light">
                    <FaShoppingCart /> {cartCount}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {cartCount === 0
                      ? <Dropdown.ItemText>No hay elementos</Dropdown.ItemText>
                      : <Dropdown.Item as={Link} to="/cart">Ver Carrito</Dropdown.Item>}
                  </Dropdown.Menu>
                </Dropdown>
                <Button variant="danger" onClick={handleLogout}>Cerrar Sesión</Button>
              </>
            ) : (
              <>
                <Button variant="primary" className="me-2" onClick={() => setShowRegister(true)}>
                  Registrarse
                </Button>
                <Button variant="secondary" onClick={() => setShowLogin(true)}>
                  Iniciar Sesión
                </Button>
              </>
            )}
          </div>
        </Container>
      </Navbar>

      <div className="d-flex" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {/* Sidebar desktop: oculto en pantallas móviles */}
        <div className="d-none d-md-block">
          <SideBarFilters
            onFilterChange={f => handleFilterChange(f, 1)}
            setShowLogin={setShowLogin}
            setShowRegister={setShowRegister}
          />
        </div>

        {/* Lista de tomos (ocupa todo el ancho en móvil, y el espacio restante en desktop) */}
        <div className="flex-grow-1">
          <TomoList
            tomos={tomos}
            pagination={pagination}
            onPageChange={handlePageChange}
            onShowInfo={handleShowInfo}
            isLoggedIn={!!user}
            openCartFromMobile={() => navigate('/cart')}
          />
        </div>
      </div>

      {/* Modal de filtros estilo MercadoLibre (móvil y opcional en escritorio) */}
      <SidebarFiltersModal
        show={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onFilterChange={(f) => { handleFilterChange(f, 1); setFiltersOpen(false); }}
        setShowLogin={(v) => { setShowRegister(false); setShowLogin(v); }} // sólo para compatibilidad
        setShowRegister={(v) => { setShowLogin(false); setShowRegister(v); }}
        resultsCount={pagination?.total || 0}
      />

      {/* Modales existentes */}
      <RegisterModal
        show={showRegister}
        onHide={() => setShowRegister(false)}
        onSubmit={handleRegisterSubmit}
      />
      <LoginModal
        show={showLogin}
        onHide={() => setShowLogin(false)}
        onSubmit={handleLoginSubmit}
      />
      <InfoModal
        show={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        tomo={selectedTomo}
      />
    </div>
  );
};

const App = () => (
  <UserProvider>
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/*" element={<MainApp />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/facturas" element={<FacturasPage />} />
          <Route path="/facturas/:id" element={<DetalleFacturaPage />} />
          <Route path="/checkout/success" element={<SuccessPage />} />
          <Route path="/checkout/failure" element={<FailurePage />} />
          <Route path="/checkout/pending" element={<PendingPage />} />
          <Route path="/paypal-return" element={<PayPalReturn />} />
        </Routes>
      </Router>
    </CartProvider>
  </UserProvider>
);

export default App;
