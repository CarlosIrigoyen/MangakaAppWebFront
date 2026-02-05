// src/App.js
//
import React, { useContext, useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation
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
import { 
  FaShoppingCart, 
  FaSearch, 
  FaBars, 
  FaBell, 
  FaFilter, 
  FaHome, 
  FaExclamationTriangle,
  FaGoogle,
  FaSignInAlt,
  FaUserPlus
} from 'react-icons/fa';

// Lazy components de la app
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
const SubscriptionManagerModal = lazy(() => import('./SubscriptionManager'));

// Lazy-load Google OAuth components so they don't block initial load
const GoogleOAuthProviderLazy = lazy(() => import('@react-oauth/google').then(mod => ({ default: mod.GoogleOAuthProvider })));
const GoogleLoginLazy = lazy(() => import('@react-oauth/google').then(mod => ({ default: mod.GoogleLogin })));

// Contexts
import { CartProvider, CartContext } from './CartContext';
import { UserProvider, UserContext } from './UserContext';

// Endpoints
const REGISTER_URL = `${process.env.REACT_APP_API_URL}/register`;
const LOGIN_URL = `${process.env.REACT_APP_API_URL}/login`;
const GOOGLE_AUTH_URL = `${process.env.REACT_APP_API_URL}/auth/google`;
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

const MainApp = ({ googleClientId }) => {
  const navigate = useNavigate();
  const location = useLocation();

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

  // PERF: preconnect a Cloudinary para reducir handshake DNS/TLS al cargar imágenes (mejora LCP)
  useEffect(() => {
    try {
      const preconnectHref = 'https://res.cloudinary.com';
      if (!document.querySelector(`link[rel="preconnect"][href="${preconnectHref}"]`)) {
        const p = document.createElement('link');
        p.rel = 'preconnect';
        p.href = preconnectHref;
        p.crossOrigin = 'anonymous';
        document.head.appendChild(p);
      }
      // dns-prefetch extra
      const dnsHref = 'https://res.cloudinary.com';
      if (!document.querySelector(`link[rel="dns-prefetch"][href="${dnsHref}"]`)) {
        const d = document.createElement('link');
        d.rel = 'dns-prefetch';
        d.href = dnsHref;
        document.head.appendChild(d);
      }
    } catch (e) {
      // noop
    }
  }, []);

  // control para montar sidebar con requestIdleCallback (evita bloquear LCP)
  const [showSidebar, setShowSidebar] = useState(false);
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setShowSidebar(true), { timeout: 300 });
      return () => cancelIdleCallback(id);
    } else {
      const t = setTimeout(() => setShowSidebar(true), 300);
      return () => clearTimeout(t);
    }
  }, []);

  // PAGINACIÓN: inicializar desde URL ?page= o desde sessionStorage
  const getInitialPage = () => {
    const qs = new URLSearchParams(location.search);
    const qp = parseInt(qs.get('page'), 10);
    if (qp && qp > 0) return qp;
    const stored = parseInt(sessionStorage.getItem('tomos_current_page'), 10);
    return (stored && stored > 0) ? stored : 1;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);

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
  const [registerErrors, setRegisterErrors] = useState({});
  const [loginErrors, setLoginErrors] = useState({});
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const dropdownRef = useRef(null);

  // ==================== FUNCIÓN PARA LOGIN CON GOOGLE ====================
  const handleGoogleLogin = async (credentialResponse) => {
    setGoogleLoading(true);
    setError('');
    setLoginErrors({});
    
    try {
      const response = await fetch(GOOGLE_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          token: credentialResponse.credential
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Éxito - usar la función login del contexto
        login(data.cliente, data.token);
        
        // Cerrar modal de login si está abierto
        setShowLogin(false);
        
        // Mostrar mensaje de éxito
        setSuccessMessage(`¡Bienvenido ${data.cliente.nombre}!`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
      } else {
        // Error del backend
        setError(data.message || 'Error en autenticación con Google');
        setTimeout(() => setError(''), 5000);
      }
      
    } catch (error) {
      console.error('🔥 Error en login Google:', error);
      setError('Error de conexión con el servidor. Verifica tu conexión a internet.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.log('❌ Error en login Google (cliente)');
    setError('El inicio de sesión con Google fue cancelado o falló.');
    setTimeout(() => setError(''), 5000);
  };

  // Agregar preload dinámico para la imagen LCP (primera portada) -> reduce LCP
  const addPreloadImage = (url) => {
    try {
      if (!url) return;
      // evita duplicados
      if (document.querySelector(`link[rel="preload"][href="${url}"]`)) return;
      const l = document.createElement('link');
      l.rel = 'preload';
      l.as = 'image';
      l.href = url;
      // signal to browser it's important
      l.setAttribute('importance', 'high');
      document.head.appendChild(l);
    } catch (e) {
      // noop
    }
  };

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
        currentPage: data.current_page || page,
        lastPage: data.last_page || 1,
        total: data.total || 0
      });

      // Preload dinámico de la primera imagen (si existe) para mejorar LCP
      if (data.data && data.data.length) {
        const first = data.data[0];
        let imageUrl = null;
        const keys = ['imagen','image','cover','cover_url','portada','src','url'];
        for (const k of keys) {
          if (first[k]) { imageUrl = first[k]; break; }
        }
        if (!imageUrl && first.images && first.images[0]) {
          imageUrl = first.images[0].url || first.images[0].src;
        }
        if (imageUrl) addPreloadImage(imageUrl);
      }

      // guardar el page actual en sessionStorage
      sessionStorage.setItem('tomos_current_page', page);

      // PERF: actualizar la URL sin usar react-router navigate (evita posibles redirecciones/recargas en hosting)
      try {
        const base = window.location.pathname.split('?')[0] || '/';
        const newUrl = `${base}?page=${page}`;
        window.history.replaceState(null, '', newUrl);
      } catch (e) {
        // noop
      }

    } catch (error) {
      console.error('Error fetch tomos:', error);
      setError('Error al cargar los tomos. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar tomos cuando filters o currentPage cambian
  useEffect(() => {
    fetchTomos(filters, currentPage);
  }, [fetchTomos, filters, currentPage]);

  const handlePageChange = useCallback((page) => {
    if (!page || page < 1) page = 1;
    setCurrentPage(page);
    // fetchTomos será llamado por el useEffect que escucha currentPage
  }, []);

  const handleSearch = useCallback(() => {
    const f = { ...filters, searchText: searchQuery };
    setFilters(f);
    setCurrentPage(1);
    // fetchTomos se invoca por el useEffect
    setNavExpanded(false);
    setShowMobileSearch(false);
  }, [filters, searchQuery]);

  const handleShowInfo = useCallback((tomo) => {
    setSelectedTomo(tomo);
    setShowInfoModal(true);
  }, []);

  const handleFilterChange = useCallback((f) => {
    setFilters(f);
    setCurrentPage(1);
  }, []);

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
    setCurrentPage(1);
    setSuccessMessage('Filtros eliminados correctamente');
    setTimeout(() => setSuccessMessage(''), 3000);
  }, []);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRegisterErrors({});
    
    const nombre = e.target.formNombre?.value;
    const direccion = e.target.formDireccion?.value;
    const email = e.target.formEmailRegister?.value;
    const password = e.target.formPasswordRegister?.value;

    // Validación básica del frontend
    const errors = {};
    if (!nombre?.trim()) errors.nombre = 'El nombre es requerido';
    if (!direccion?.trim()) errors.direccion = 'La dirección es requerida';
    if (!email?.trim()) errors.email = 'El email es requerido';
    if (!password?.trim()) errors.password = 'La contraseña es requerida';
    if (password && password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres';
    
    if (Object.keys(errors).length > 0) {
      setRegisterErrors(errors);
      return;
    }

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
        setSuccessMessage('¡Registro exitoso! Bienvenido/a');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        // Manejar errores del servidor
        if (data.errors) {
          const serverErrors = {};
          Object.keys(data.errors).forEach(key => {
            serverErrors[key] = Array.isArray(data.errors[key]) 
              ? data.errors[key].join(', ') 
              : data.errors[key];
          });
          setRegisterErrors(serverErrors);
        } else {
          setError(data.message || 'Error en el registro');
        }
      }
    } catch (err) {
      setError('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoginErrors({});
    
    const email = e.target.formEmailLogin?.value;
    const password = e.target.formPasswordLogin?.value;

    // Validación básica del frontend
    const errors = {};
    if (!email?.trim()) errors.email = 'El email es requerido';
    if (!password?.trim()) errors.password = 'La contraseña es requerida';
    
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }

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
        setSuccessMessage(`¡Bienvenido de nuevo, ${data.cliente.nombre}!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        // Manejar errores del servidor
        if (data.errors) {
          const serverErrors = {};
          Object.keys(data.errors).forEach(key => {
            serverErrors[key] = Array.isArray(data.errors[key]) 
              ? data.errors[key].join(', ') 
              : data.errors[key];
          });
          setLoginErrors(serverErrors);
        } else {
          setError(data.message || 'Usuario o contraseña incorrectos');
        }
      }
    } catch (err) {
      setError('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
    }
  };

  const handleLogout = useCallback(() => {
    logout();
    // evitar navegar si ya estamos en '/'
    if (location.pathname !== '/') {
      navigate('/');
    }
    setShowMobileDropdown(false);
    setSuccessMessage('¡Sesión cerrada correctamente!');
    setTimeout(() => setSuccessMessage(''), 3000);
  }, [logout, navigate, location.pathname]);

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

  // Limpiar errores al cerrar modales
  useEffect(() => {
    if (!showRegister) {
      setRegisterErrors({});
    }
    if (!showLogin) {
      setLoginErrors({});
    }
  }, [showRegister, showLogin]);

  return (
    <div className="bg-dark text-white min-vh-100">
      {/* Skip link for keyboard users */}
      <a href="#main-content" className="skip-link">Saltar al contenido</a>

      {/* Mensajes de éxito con mejor espaciado */}
      {successMessage && (
        <Alert
          variant="success"
          className="floating-alert"
          dismissible
          onClose={() => setSuccessMessage('')}
        >
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            <span>{successMessage}</span>
          </div>
        </Alert>
      )}

      {/* Mensajes de error general */}
      {error && (
        <Alert
          variant="danger"
          className="floating-alert"
          dismissible
          onClose={() => setError('')}
        >
          <div className="d-flex align-items-center">
            <FaExclamationTriangle className="me-2" />
            <span>{error}</span>
          </div>
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
          <Navbar.Brand as={Link} to="/" onClick={() => { setNavExpanded(false); if (location.pathname !== '/') navigate('/'); }}>
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
                className="btn-black border border-secondary btn-equal"
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
                  className="ms-2 btn-equal"
                >
                  <FaBell className="me-1" />
                  Suscripciones
                </Button>

                <Button 
                  type="button" 
                  variant="outline-light" 
                  onClick={() => {
                    // antes de ir al carrito guardamos la página actual
                    sessionStorage.setItem('tomos_current_page', pagination?.currentPage || currentPage || 1);
                    navigate('/cart');
                  }}
                  className="btn-black ms-2 btn-equal"
                  aria-label={`Carrito, ${cartCount} items`}
                >
                  <FaShoppingCart /> {cartCount}
                </Button>
                <Button type="button" variant="danger" className="ms-2 btn-equal" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="primary" 
                  className="me-2 btn-equal"
                  onClick={() => setShowRegister(true)}
                >
                  <FaUserPlus className="me-1" />
                  Registro
                </Button>
                <Button 
                  variant="secondary" 
                  className="btn-equal"
                  onClick={() => setShowLogin(true)}
                >
                  <FaSignInAlt className="me-1" />
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
              className="btn-black btn-equal icon-btn"
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
                    onClick={() => { if (location.pathname !== '/') navigate('/'); setShowMobileDropdown(false); }}
                    className="text-start d-flex align-items-center w-100 mb-2 btn-equal"
                  >
                    <FaHome className="me-2" /> Inicio
                  </Button>
                  
                  {/* Opciones de filtros para TODOS los usuarios */}
                  <div className="border-top border-secondary pt-2 mt-2">
                    <Button 
                      variant="outline-light" 
                      onClick={() => { setShowFiltersModal(true); setShowMobileDropdown(false); }}
                      className="text-start d-flex align-items-center w-100 mb-2 btn-equal"
                    >
                      <FaFilter className="me-2" /> Filtros
                    </Button>
                    
                    <Button 
                      variant="outline-light" 
                      onClick={() => { resetFilters(); setShowMobileDropdown(false); }}
                      className="text-start w-100 mb-2 btn-black btn-equal"
                    >
                      Quitar Filtros
                    </Button>
                  </div>
                  
                  {/* Opciones específicas según si está logueado o no */}
                  {user ? (
                    <>
                      <div className="border-top border-secondary pt-2 mt-2">
                        <Button 
                          variant="outline-light" 
                          size="sm" 
                          onClick={() => { 
                            setShowSubscriptionModal(true); 
                            setShowMobileDropdown(false); 
                          }}
                          className="text-start d-flex align-items-center w-100 mb-2 btn-equal"
                        >
                          <FaBell className="me-2" /> Suscripciones
                        </Button>
                        
                        <Button 
                          variant="danger" 
                          onClick={() => { handleLogout(); setShowMobileDropdown(false); }}
                          className="mt-2 w-100 btn-equal"
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
                          className="w-100 mb-2 btn-equal"
                        >
                          <FaUserPlus className="me-2" />
                          Registrarse
                        </Button>
                        
                        <Button 
                          variant="outline-light" 
                          onClick={() => { setShowLogin(true); setShowMobileDropdown(false); }}
                          className="w-100 btn-equal"
                        >
                          <FaSignInAlt className="me-2" />
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
              className="me-2 btn-black btn-equal icon-btn"
              onClick={() => setShowMobileSearch(true)}
              aria-label="Buscar"
            >
              <FaSearch />
            </Button>
            {user && (
              <Button
                type="button"
                size="sm"
                className="btn-black btn-equal icon-btn"
                onClick={() => {
                  sessionStorage.setItem('tomos_current_page', pagination?.currentPage || currentPage || 1);
                  navigate('/cart');
                }}
                aria-label={`Carrito, ${cartCount} items`}
              >
                <FaShoppingCart />
                {cartCount > 0 && <span className="badge bg-danger ms-1">{cartCount}</span>}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay de búsqueda móvil con espacio */}
      {showMobileSearch && (
        <div className="d-lg-none search-overlay-mobile p-3" style={{ paddingTop: 72 }}>
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

      {/* CONTENIDO PRINCIPAL - SIN LOADING GLOBAL */}
      <main id="main-content" role="main" tabIndex="-1" className="d-flex flex-column flex-md-row main-content-container" style={{ minHeight: 'calc(100vh - 56px)', paddingTop: '80px' }}>
        {/* SIDEBAR ESCRITORIO */}
        <div className="d-none d-md-block sidebar-fixed" style={{ width: 300 }}>
          {showSidebar ? (
            <Suspense fallback={<div className="p-3 text-white" style={{ minHeight: 200 }}>Cargando filtros...</div>}>
              <SidebarFilters
                onFilterChange={handleFilterChange}
                onResetFilters={resetFilters}
                setShowLogin={setShowLogin}
                setShowRegister={setShowRegister}
              />
            </Suspense>
          ) : (
            // placeholder para evitar CLS (misma altura aproximada)
            <div className="p-3 text-white" style={{ minHeight: 200 }}>
              Cargando filtros...
            </div>
          )}
        </div>

        {/* LISTA DE TOMOS - Solo muestra loading interno si está cargando */}
        <div className="main-content flex-grow-1 p-2">
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
      </main>

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
            setRegisterErrors({});
          }}
          onSubmit={handleRegisterSubmit}
          errors={registerErrors}
          clearErrors={() => setRegisterErrors({})}
        />
        
        {/* MODAL DE LOGIN: renderizamos Google components solo cuando se abre el modal */}
        {showLogin && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
              <div className="modal-content bg-dark text-white border border-secondary">
                <div className="modal-header border-secondary">
                  <h5 className="modal-title">
                    <FaSignInAlt className="me-2" />
                    Iniciar Sesión
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => {
                      setShowLogin(false);
                      setLoginErrors({});
                    }}
                  ></button>
                </div>
                
                <div className="modal-body">
                  {/* Botón de Google Login (se carga dinámicamente) */}
                  <div className="text-center mb-4">
                    <h6 className="text-warning mb-3">
                      <FaGoogle className="me-2" />
                      Acceso Rápido con Google
                    </h6>
                    
                    <Suspense fallback={<div aria-hidden="true"><SmallSpinner /> Cargando Google...</div>}>
                      {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
                        <GoogleOAuthProviderLazy clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
                          <GoogleLoginLazy
                            onSuccess={handleGoogleLogin}
                            onError={handleGoogleError}
                            theme="filled_blue"
                            size="large"
                            text="signin_with"
                            shape="rectangular"
                            width="100%"
                            locale="es"
                          />
                        </GoogleOAuthProviderLazy>
                      ) : (
                        <div className="text-muted">Inicio con Google no disponible (Client ID no configurado).</div>
                      )}
                    </Suspense>
                    
                    {googleLoading && (
                      <div className="mt-3">
                        <Spinner animation="border" size="sm" variant="light" className="me-2" />
                        <span>Autenticando con Google...</span>
                      </div>
                    )}
                    
                    <div className="mt-4 mb-3 position-relative">
                      <hr className="border-secondary" />
                      <span className="position-absolute top-50 start-50 translate-middle bg-dark px-3 text-muted">
                        O
                      </span>
                    </div>
                    
                    <h6 className="text-info mb-3">Iniciar sesión con email</h6>
                  </div>
                  
                  {/* Formulario de login tradicional */}
                  {loginErrors.general && (
                    <Alert variant="danger" className="mb-3">
                      <FaExclamationTriangle className="me-2" />
                      {loginErrors.general}
                    </Alert>
                  )}
                  
                  <Form onSubmit={handleLoginSubmit}>
                    <Form.Group className="mb-3" controlId="formEmailLogin">
                      <Form.Label>Correo electrónico</Form.Label>
                      <Form.Control
                        type="email"
                        name="formEmailLogin"
                        placeholder="ejemplo@correo.com"
                        className={`bg-secondary text-white ${loginErrors.email ? 'border-danger' : 'border-dark'}`}
                        isInvalid={!!loginErrors.email}
                      />
                      {loginErrors.email && (
                        <Form.Text className="text-danger">
                          {loginErrors.email}
                        </Form.Text>
                      )}
                    </Form.Group>

                    <Form.Group className="mb-4" controlId="formPasswordLogin">
                      <Form.Label>Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        name="formPasswordLogin"
                        placeholder="Tu contraseña"
                        className={`bg-secondary text-white ${loginErrors.password ? 'border-danger' : 'border-dark'}`}
                        isInvalid={!!loginErrors.password}
                      />
                      {loginErrors.password && (
                        <Form.Text className="text-danger">
                          {loginErrors.password}
                        </Form.Text>
                      )}
                    </Form.Group>

                    <Button variant="primary" type="submit" className="w-100 mb-3">
                      <FaSignInAlt className="me-2" />
                      Iniciar Sesión
                    </Button>
                  </Form>
                  
                  <div className="text-center">
                    <p className="text-muted mb-2">
                      ¿No tienes una cuenta?
                    </p>
                    <Button
                      variant="outline-success"
                      className="w-100"
                      onClick={() => {
                        setShowLogin(false);
                        setTimeout(() => setShowRegister(true), 300);
                      }}
                    >
                      <FaUserPlus className="me-2" />
                      Crear Cuenta Nueva
                    </Button>
                  </div>
                </div>
                
                <div className="modal-footer border-secondary justify-content-center">
                  <small className="text-muted">
                    Al iniciar sesión, aceptas nuestros términos y condiciones
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
        
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

// Componente App principal (ahora sin GoogleOAuthProvider global)
const App = () => {
  // Obtener el Google Client ID de las variables de entorno
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  
  if (!googleClientId) {
    console.warn('REACT_APP_GOOGLE_CLIENT_ID no está configurado. Google Login quedará deshabilitado hasta configurar la variable.');
  }
  
  return (
    <UserProvider>
      <CartProvider>
        <Router>
          <Suspense fallback={
            <div className="d-flex justify-content-center align-items-center vh-100 bg-dark">
              <Spinner animation="border" variant="primary" />
            </div>
          }>
            <Routes>
              <Route path="/" element={<MainApp googleClientId={googleClientId} />} />
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
};

export default App;
