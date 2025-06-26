import React, { useContext, useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { Navbar, Container, Form, Button, Dropdown,Nav } from 'react-bootstrap';
import { FaShoppingCart } from 'react-icons/fa';

import SideBarFilters from './SideBarFilters';
import RegisterModal    from './RegisterModal';
import LoginModal       from './LoginModal';
import InfoModal        from './InfoModal';
import TomoList         from './TomoList';
import CartPage         from './CartPage';
import FacturasPage     from './FacturasPage';
import DetalleFacturaPage from './DetalleFacturaPage';

import { CartProvider, CartContext } from './CartContext';
import { UserProvider, UserContext } from './UserContext';

const API_BASE       = 'https://mangakaappweb-production.up.railway.app/api';
const REGISTER_URL   = 'https://mangakaappweb-production.up.railway.app/api/register';
const LOGIN_URL      = 'https://mangakaappweb-production.up.railway.app/api/login';
const TOMOS_URL      = 'https://mangakaappweb-production.up.railway.app/api/public/tomos';

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

  // Estados para modales
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin]       = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedTomo, setSelectedTomo] = useState(null);

  useEffect(() => {
    handleFilterChange(currentFilters, 1);
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

    const res = await fetch(`${TOMOS_URL}?${params.toString()}`);
    const result = await res.json();
    setTomos(result.data);
    setPagination({
      currentPage: result.current_page,
      lastPage:    result.last_page,
      total:       result.total
    });
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
          <Navbar.Brand as={Link} to="/">
            <img src="/img/Mangaka.png" alt="Logo" width="40" height="40" className="rounded-circle" />
            <span className="ms-2">Mangaka Baka Shop</span>
          </Navbar.Brand>

          {/* Móvil: menú desplegable para usuario y buscador debajo */}
          <Nav className="d-lg-none align-items-center">
            <Dropdown>
              <Dropdown.Toggle variant="outline-light">
                {user ? user.nombre : 'Cuenta'}
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100 p-2">
                {!user ? (
                  <>
                    <Dropdown.Item onClick={() => setShowLogin(true)}>Iniciar Sesión</Dropdown.Item>
                    <Dropdown.Item onClick={() => setShowRegister(true)}>Registrarse</Dropdown.Item>
                  </>
                ) : (
                  <>
                    <Dropdown.Item as={Link} to="/facturas">Mis Facturas</Dropdown.Item>
                    <Dropdown.Item onClick={handleLogout}>Cerrar Sesión</Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>
            <Form className="d-flex w-100 mt-2" onSubmit={e => { e.preventDefault(); handleSearch(); }}>
              <Form.Control type="search" placeholder="Buscar" className="me-2" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <Button variant="outline-light" type="submit">Buscar</Button>
            </Form>
          </Nav>

          {/* Escritorio: buscador y controles a la derecha */}
          <Form className="d-none d-lg-flex mx-auto" style={{ width: '50%' }} onSubmit={e => { e.preventDefault(); handleSearch(); }}>
            <Form.Control type="search" placeholder="Buscar" className="me-2" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <Button variant="outline-light" onClick={handleSearch}>Buscar</Button>
          </Form>
          <div className="d-none d-lg-flex ms-auto align-items-center">
            {user ? (
              <>
                <span className="me-2">Hola, {user.nombre}</span>
                <Button variant="outline-light" className="me-2" as={Link} to="/facturas">Mis Facturas</Button>
                <Dropdown align="end" className="me-2">
                  <Dropdown.Toggle variant="outline-light"><FaShoppingCart /> {cartCount}</Dropdown.Toggle>
                  <Dropdown.Menu>
                    {cartCount === 0 ? <Dropdown.ItemText>No hay elementos</Dropdown.ItemText> : <Dropdown.Item as={Link} to="/cart">Ver Carrito</Dropdown.Item>}
                  </Dropdown.Menu>
                </Dropdown>
                <Button variant="danger" onClick={handleLogout}>Cerrar Sesión</Button>
              </>
            ) : (
              <>
                <Button variant="primary" className="me-2" onClick={() => setShowRegister(true)}>Registrarse</Button>
                <Button variant="secondary" onClick={() => setShowLogin(true)}>Iniciar Sesión</Button>
              </>
            )}
          </div>
        </Container>
      </Navbar>

      <div className="d-flex" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <SideBarFilters onFilterChange={f => handleFilterChange(f, 1)} />
        <TomoList tomos={tomos} pagination={pagination} onPageChange={handlePageChange} onShowInfo={handleShowInfo} isLoggedIn={!!user} />
      </div>

      <RegisterModal show={showRegister} onHide={() => setShowRegister(false)} onSubmit={handleRegisterSubmit} />
      <LoginModal show={showLogin} onHide={() => setShowLogin(false)} onSubmit={handleLoginSubmit} />
      <InfoModal show={showInfoModal} onClose={() => setShowInfoModal(false)} tomo={selectedTomo} />
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
        </Routes>
      </Router>
    </CartProvider>
  </UserProvider>
);

export default App;
