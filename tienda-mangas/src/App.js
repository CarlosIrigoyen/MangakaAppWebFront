// src/App.js
import React, { useState, useEffect, useContext } from 'react';
import PagoSuccessPage from './PagoSuccessPage';
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
import DetalleFacturaPage from './DetalleFacturaPage';

import { CartProvider, CartContext } from './CartContext';
import { UserProvider, UserContext } from './UserContext'; // ¡IMPORTA UserProvider y UserContext!

const MainApp = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Consume el UserContext para obtener el estado del usuario y las funciones de autenticación
  const { user, login, logout, loadingUser } = useContext(UserContext); // ¡CAMBIO AQUÍ!

  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const [tomos, setTomos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedTomo, setSelectedTomo] = useState(null);
  const [currentFilters, setCurrentFilters] = useState({
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

  const { cart } = useContext(CartContext);
  const cartCount = cart.length;

  useEffect(() => {
    // La verificación de autenticación (checkAuth) ahora la maneja UserContext
    handleFilterChange(currentFilters, 1);
  }, []);

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    const nombre    = event.target.elements.formNombre.value;
    const direccion = event.target.elements.formDireccion.value;
    const email     = event.target.elements.formEmailRegister.value;
    const password  = event.target.elements.formPasswordRegister.value;
    const data      = { nombre, email, password, direccion };

    try {
      const response = await fetch('http://localhost:8000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok) {
        login(result.cliente, result.token); // ¡USA LA FUNCIÓN login DEL CONTEXTO!
        setShowRegister(false);
      } else {
        console.error(result.errors);
      }
    } catch (error) {
      console.error('Error en registro:', error);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    const email    = event.target.elements.formEmailLogin.value;
    const password = event.target.elements.formPasswordLogin.value;
    const data     = { email, password };

    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok) {
        login(result.cliente, result.token); // ¡USA LA FUNCIÓN login DEL CONTEXTO!
        setShowLogin(false);
      } else {
        console.error(result.errors);
      }
    } catch (error) {
      console.error('Error en login:', error);
    }
  };

  // Esta función `handleLogout` ahora solo llama a la función `logout` del UserContext
  const handleLogout = () => {
    logout(); // ¡USA LA FUNCIÓN logout DEL CONTEXTO!
  };

  const handleFilterChange = async (filters, page = 1) => {
    setCurrentFilters(filters);
    const queryParams = new URLSearchParams();
    if (filters.authors.length) queryParams.append('authors', filters.authors.join(','));
    if (filters.languages.length) queryParams.append('languages', filters.languages.join(','));
    if (filters.mangas.length) queryParams.append('mangas', filters.mangas.join(','));
    if (filters.editorials.length) queryParams.append('editorials', filters.editorials.join(','));
    if (filters.searchText) queryParams.append('search', filters.searchText);
    if (filters.applyPriceFilter === 1 && filters.minPrice !== '' && filters.maxPrice !== '') {
      queryParams.append('applyPriceFilter', 1);
      queryParams.append('minPrice', filters.minPrice);
      queryParams.append('maxPrice', filters.maxPrice);
    }
    queryParams.append('page', page);

    try {
      const response = await fetch(
        `http://localhost:8000/api/public/tomos?${queryParams.toString()}`
      );
      const result = await response.json();
      setTomos(result.data);
      setPagination({
        currentPage: result.current_page,
        lastPage: result.last_page,
        total: result.total
      });
    } catch (error) {
      console.error('Error al obtener tomos:', error);
    }
  };

  const handlePageChange = (page) => handleFilterChange(currentFilters, page);
  const handleShowInfo   = (tomo) => {
    setSelectedTomo(tomo);
    setShowInfoModal(true);
  };
  const handleSearch     = () => {
    const newFilters = { ...currentFilters, searchText: searchQuery };
    handleFilterChange(newFilters, 1);
  };

  // Puedes mostrar un spinner o mensaje de carga mientras se verifica el usuario
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
            <img
              src="/img/Mangaka.png"
              alt="Logo Mangaka"
              width="40"
              height="40"
              className="rounded-circle"
            />
            <span className="ms-2">Mangaka Baka Shop</span>
          </Navbar.Brand>

          <Form
            className="d-flex mx-auto"
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
                      <Dropdown.ItemText>No hay elementos en el carrito</Dropdown.ItemText>
                    ) : (
                      <Dropdown.Item as={Link} to="/cart">
                        Ir a carrito
                      </Dropdown.Item>
                    )}
                  </Dropdown.Menu>
                </Dropdown>
                <Button variant="danger" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  className="me-2"
                  onClick={() => setShowRegister(true)}
                >
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
        <SideBarFilters onFilterChange={(f) => handleFilterChange(f, 1)} />
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

// La aplicación se envuelve con los proveedores de contexto necesarios
const App = () => (
  <UserProvider> {/* ¡ENVUELVE TODA LA APP CON UserProvider! */}
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/cart" element={<CartPage />} />
            <Route path="/pago/success" element={<PagoSuccessPage />} />
          <Route path="/facturas" element={<FacturasPage />} />
          <Route path="/facturas/:id" element={<DetalleFacturaPage />} />
        </Routes>
      </Router>
    </CartProvider>
  </UserProvider>
);

export default App;