// src/App.js
import React, { useState, useEffect, useContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom';
import {
  Navbar,
  Container,
  Form,
  Button,
  Dropdown
} from 'react-bootstrap';
import { FaShoppingCart } from 'react-icons/fa';

import SideBarFilters from './SideBarFilters';
import RegisterModal from './RegisterModal';
import LoginModal from './LoginModal';
import InfoModal from './InfoModal';
import TomoList from './TomoList';
import CartPage from './CartPage';
import FacturasPage from './FacturasPage';
import InvoicePage from './pages/InvoicePage'; // Detalle de factura

import { CartProvider, CartContext } from './CartContext';
import { UserProvider, UserContext } from './UserContext';

const MainApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout, loadingUser } = useContext(UserContext);
  const { cart } = useContext(CartContext);
  const cartCount = cart.length;

  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin]       = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedTomo, setSelectedTomo] = useState(null);

  const [tomos, setTomos]           = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState({
    authors: [], languages: [], mangas: [], editorials: [],
    searchText: '', sortBy: 'titulo,numero_tomo',
    applyPriceFilter: 0, minPrice: '', maxPrice: ''
  });

  useEffect(() => {
    handleFilterChange(currentFilters, 1);
  }, []);

  const handleRegisterSubmit = async (e) => { /* ... */ };
  const handleLoginSubmit    = async (e) => { /* ... */ };
  const handleLogout         = () => logout();

  const handleFilterChange = async (filters, page = 1) => { /* ... */ };
  const handlePageChange   = page => handleFilterChange(currentFilters, page);
  const handleShowInfo     = tomo => {
    setSelectedTomo(tomo);
    setShowInfoModal(true);
  };
  const handleSearch       = () => {
    handleFilterChange({ ...currentFilters, searchText: searchQuery }, 1);
  };

  if (loadingUser) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-white">
        Cargando usuario...
      </div>
    );
  }

  return (
    <div className="bg-dark text-white min-vh-100">
      <Navbar bg="dark" variant="dark" expand="lg" className="border-bottom border-light shadow">
        <Container fluid>
          <Navbar.Brand as={Link} to="/">
            <img src="/img/Mangaka.png" alt="Logo" width="40" height="40" className="rounded-circle" />
            <span className="ms-2">Mangaka Baka Shop</span>
          </Navbar.Brand>

          <Form
            className="d-flex mx-auto"
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

          <div className="d-flex ms-auto align-items-center">
            {user ? (
              <>
                <span className="me-2">Hola, {user.nombre}</span>
                <Button variant="outline-light" className="me-2" as={Link} to="/facturas">
                  Mis Facturas
                </Button>
                <Dropdown align="end" className="me-2">
                  <Dropdown.Toggle variant="outline-light">
                    <FaShoppingCart /> {cartCount}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {cartCount === 0 ? (
                      <Dropdown.ItemText>No hay elementos</Dropdown.ItemText>
                    ) : (
                      <Dropdown.Item as={Link} to="/cart">Ir al carrito</Dropdown.Item>
                    )}
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
        <SideBarFilters onFilterChange={f => handleFilterChange(f, 1)} />
        <TomoList
          tomos={tomos}
          pagination={pagination}
          onPageChange={handlePageChange}
          onShowInfo={handleShowInfo}
          isLoggedIn={Boolean(user)}
        />
      </div>

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
          <Route path="/" element={<MainApp />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/facturas" element={<FacturasPage />} />
          <Route path="/facturas/:id" element={<InvoicePage />} />
        </Routes>
      </Router>
    </CartProvider>
  </UserProvider>
);

export default App;

