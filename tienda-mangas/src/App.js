// App.js
import React, { useContext, useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation
} from 'react-router-dom';
import { Navbar, Container, Form, Button, Dropdown } from 'react-bootstrap';
import { FaShoppingCart, FaUserCircle } from 'react-icons/fa';

import TomoList from './TomoList';
import SideBarFilters from './SideBarFilters';
import SidebarFiltersModal from './SidebarFiltersModal';
import RegisterModal from './RegisterModal';
import LoginModal from './LoginModal';
import InfoModal from './InfoModal';
import CartPage from './CartPage';
import FacturasPage from './FacturasPage';
import DetalleFacturaPage from './DetalleFacturaPage';
import SuccessPage from './SuccessPage';
import FailurePage from './FailurePage';
import PendingPage from './PendingPage';
import PayPalReturn from './PayPalReturn';

import { CartProvider, CartContext } from './CartContext';
import { UserProvider, UserContext } from './UserContext';

const REGISTER_URL = `${process.env.REACT_APP_API_URL}/register`;
const LOGIN_URL = `${process.env.REACT_APP_API_URL}/login`;
const TOMOS_URL = `${process.env.REACT_APP_API_URL}/public/tomos`;

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

  // === CARGA INICIAL DE TOMOS ===
  useEffect(() => {
    fetchTomos(filters, 1);
  }, []);

  const fetchTomos = async (filters, page = 1) => {
    const params = new URLSearchParams();
    if (filters.authors.length) params.append('authors', filters.authors.join(','));
    if (filters.languages.length) params.append('languages', filters.languages.join(','));
    if (filters.mangas.length) params.append('mangas', filters.mangas.join(','));
    if (filters.editorials.length) params.append('editorials', filters.editorials.join(','));
    if (filters.searchText) params.append('search', filters.searchText);
    if (filters.applyPriceFilter && filters.minPrice && filters.maxPrice) {
      params.append('applyPriceFilter', 1);
      params.append('minPrice', filters.minPrice);
      params.append('maxPrice', filters.maxPrice);
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
  };

  const handlePageChange = (page) => fetchTomos(filters, page);
  const handleSearch = () => fetchTomos({ ...filters, searchText: searchQuery }, 1);
  const handleShowInfo = (tomo) => {
    setSelectedTomo(tomo);
    setShowInfoModal(true);
  };

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loadingUser) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-dark text-white">
        Cargando usuario...
      </div>
    );
  }

  return (
    <div className="bg-dark text-white min-vh-100">
      <Navbar bg="dark" variant="dark" expand="lg" className="border-bottom border-light">
        <Container fluid>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
            <img src="/img/Mangaka.png" alt="Logo" width="40" height="40" className="rounded-circle" />
            <span className="ms-2">Mangaka Baka Shop</span>
          </Navbar.Brand>


          {/* Buscador escritorio */}
          <Form
            className="d-none d-lg-flex mx-auto"
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
            <Button variant="outline-light" onClick={handleSearch}>
              Buscar
            </Button>
          </Form>

          {/* Controles escritorio */}
          <div className="d-none d-lg-flex align-items-center">
            {user ? (
              <>
                <span className="me-2">Hola, {user.nombre}</span>
                <Button variant="outline-light" as={Link} to="/cart">
                  <FaShoppingCart /> {cartCount}
                </Button>
                <Button variant="danger" className="ms-2" onClick={handleLogout}>
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

      <div className="d-flex flex-column flex-md-row" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {/* SIDEBAR ESCRITORIO */}
        <div className="d-none d-md-block">
          <SideBarFilters
            onFilterChange={(f) => {
              setFilters(f);
              fetchTomos(f, 1);
            }}
          />
        </div>

        {/* SECCIÓN MÓVIL */}
        <div className="d-md-none p-3 bg-secondary text-white shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center">
              <FaUserCircle size={26} className="me-2" />
              <strong>{user ? `Hola, ${user.nombre}` : 'Bienvenido'}</strong>
            </div>
            <Button size="sm" variant="light" onClick={() => navigate('/cart')}>
              <FaShoppingCart /> {cartCount}
            </Button>
          </div>

          <div className="d-flex justify-content-center gap-2">
            {!user ? (
              <>
                <Button size="sm" variant="primary" onClick={() => setShowRegister(true)}>
                  Registro
                </Button>
                <Button size="sm" variant="outline-light" onClick={() => setShowLogin(true)}>
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

        {/* LISTA DE TOMOS */}
        <div className="flex-grow-1 p-2">
          <TomoList
            tomos={tomos}
            pagination={pagination}
            onPageChange={handlePageChange}
            onShowInfo={handleShowInfo}
            isLoggedIn={!!user}
          />
        </div>
      </div>

      {/* MODAL DE FILTROS */}
      <SidebarFiltersModal
        show={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onFilterChange={(f) => {
          setFilters(f);
          fetchTomos(f, 1);
          
        }}
      />

      {/* MODALES LOGIN / REGISTER / INFO */}
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
      <InfoModal show={showInfoModal} onClose={() => setShowInfoModal(false)} tomo={selectedTomo} />
    </div>
  );
};

const App = () => (
  <UserProvider>
    <CartProvider>
      <Router>
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
      </Router>
    </CartProvider>
  </UserProvider>
);

export default App;
