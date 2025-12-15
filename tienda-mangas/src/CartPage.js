// src/CartPage.js
import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import { UserContext } from './UserContext';
import { Button, Image, Alert, Spinner } from 'react-bootstrap';

const CLOUDINARY_BASE_URL = process.env.REACT_APP_CLOUDINARY_URL;
const REACT_MERCADO_PAGO_PREFERENCE = `${process.env.REACT_APP_API_URL}/mercadopago/preference`;
const REACT_PAYPAL_CREATE_ORDER = `${process.env.REACT_APP_API_URL}/paypal/create-order`;

const CartPage = () => {
  const { cart, updateCartItem, clearCartAfterPurchase, removeCartItem } = useContext(CartContext);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // Estados
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'mercadopago' o 'paypal'
  const [clearingCart, setClearingCart] = useState(false); // nuevo estado para vaciado masivo

  // Total y accesibilidad: usamos aria-live para anunciar cambios
  const totalAmount = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);

  const handleIncrease = (item) => {
    if (item.quantity < item.stock) {
      updateCartItem(item.id, item.quantity + 1);
    } else {
      // Mensaje visual; para producción conviene usar un toast accesible
      alert(`No hay suficiente stock. Stock disponible: ${item.stock}`);
    }
  };

  const handleDecrease = (item) => {
    if (item.quantity > 1) {
      updateCartItem(item.id, item.quantity - 1);
    }
  };

  // IMPORTANTE: devolvemos lo que retorne removeCartItem para poder awaitearlo
  const handleRemove = (item) => {
    // Aquí usamos exactamente la misma llamada que el botón "Eliminar" usa.
    return removeCartItem(item.id);
  };

  const handleClearCart = () => {
    setShowClearCartModal(true);
  };

  // confirmClearCart elimina los items **secuencialmente** usando handleRemove(item)
  const confirmClearCart = async () => {
    setClearingCart(true);
    try {
      // Hacemos copia del carrito actual para iterar sin problemas si el estado cambia
      const itemsToRemove = [...cart];
      const failed = [];

      for (const item of itemsToRemove) {
        try {
          // Soportamos tanto removeCartItem síncrono como asíncrono
          const result = handleRemove(item);
          await (result instanceof Promise ? result : Promise.resolve(result));
        } catch (err) {
          console.error(`Error eliminando item ${item.id}:`, err);
          failed.push(item);
          // Opcional: si preferís detenerte al primer error, descomenta la siguiente línea:
          // break;
        }
      }

      if (failed.length === 0) {
        // Todo bien: si tu context actualiza el estado del carrito, acá ya debería estar vacío
        // Si tenés una función que limpia todo en backend (clearCartAfterPurchase) podrías llamarla como fallback.
      } else {
        alert(`No se pudieron eliminar ${failed.length} item(s). Revisa la consola para más detalle.`);
      }
    } catch (err) {
      console.error('Error al vaciar el carrito:', err);
      alert('Ocurrió un error al intentar vaciar el carrito. Intenta nuevamente.');
    } finally {
      setClearingCart(false);
      setShowClearCartModal(false);
    }
  };

  // Validaciones antes del pago
  const validatePurchase = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Debes iniciar sesión para comprar.');
      navigate('/login');
      return false;
    }

    if (!user || !user.id) {
      alert('Usuario no identificado. Por favor, inicia sesión nuevamente.');
      navigate('/login');
      return false;
    }

    const itemsSinStock = cart.filter(item => item.quantity > item.stock);
    if (itemsSinStock.length > 0) {
      alert('Algunos productos en tu carrito no tienen suficiente stock disponible. Por favor, ajusta las cantidades.');
      return false;
    }

    const itemsCantidadCero = cart.filter(item => item.quantity <= 0);
    if (itemsCantidadCero.length > 0) {
      alert('Algunos productos en tu carrito tienen cantidad inválida.');
      return false;
    }

    return true;
  };

  const preparePayload = () => ({
    cliente_id: user.id,
    productos: cart.map(i => ({
      tomo_id: i.id,
      titulo: i.manga?.titulo || 'Producto sin título',
      cantidad: i.quantity,
      precio_unitario: i.precio,
    })),
  });

  const handleMercadoPagoBuy = async () => {
    if (!validatePurchase()) return;

    try {
      setProcessingPayment(true);
      setPaymentMethod('mercadopago');

      const token = localStorage.getItem('token');
      const payload = preparePayload();

      const response = await fetch(REACT_MERCADO_PAGO_PREFERENCE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}`);
      }

      const { init_point } = await response.json();
      if (!init_point) throw new Error('No se recibió una URL de pago válida.');

      sessionStorage.setItem('pendingPurchase', JSON.stringify({
        timestamp: new Date().getTime(),
        cartItems: cart.length,
        paymentMethod: 'mercadopago'
      }));

      window.location.href = init_point;
    } catch (err) {
      alert(`No se pudo iniciar el pago: ${err.message || 'Error desconocido'}`);
      setProcessingPayment(false);
      setPaymentMethod(null);
    }
  };

  const handlePayPalBuy = async () => {
    if (!validatePurchase()) return;

    try {
      setProcessingPayment(true);
      setPaymentMethod('paypal');

      const token = localStorage.getItem('token');
      const payload = preparePayload();

      const response = await fetch(REACT_PAYPAL_CREATE_ORDER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `HTTP ${response.status}`);
      }

      const { approve_url } = await response.json();
      if (!approve_url) throw new Error('No se recibió una URL de pago válida de PayPal.');

      sessionStorage.setItem('pendingPurchase', JSON.stringify({
        timestamp: new Date().getTime(),
        cartItems: cart.length,
        paymentMethod: 'paypal'
      }));

      window.location.href = approve_url;
    } catch (err) {
      alert(`No se pudo iniciar el pago con PayPal: ${err.message || 'Error desconocido'}`);
      setProcessingPayment(false);
      setPaymentMethod(null);
    }
  };

  // Estado procesando: pantalla dedicada (con accesible aria-live)
  if (processingPayment) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white"
        role="status"
        aria-live="polite"
      >
        <Spinner animation="border" role="status" className="mb-3" variant="primary" />
        <h1 className="h4">
          Procesando tu pago
          {paymentMethod === 'paypal' ? ' con PayPal' : paymentMethod === 'mercadopago' ? ' con MercadoPago' : ''}
          ...
        </h1>
        <p className="text-muted">Serás redirigido en un momento. Por favor, no cierres esta página.</p>
      </div>
    );
  }

  // Carrito vacío: título semántico h1
  if (!cart.length) {
    // leemos la última página visitada (guardada por MainApp) para volver a ella
    const lastPage = sessionStorage.getItem('tomos_current_page') || '1';

    return (
      <main
        role="main"
        aria-label="Carrito de compras"
        className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white"
      >
        <h1>Tu carrito está vacío</h1>
        <Button variant="secondary" className="mt-3" onClick={() => navigate(`/?page=${lastPage}`)}>
          Volver a la Tienda
        </Button>
      </main>
    );
  }

  const productosConProblemas = cart.filter(item => item.quantity > item.stock);

  return (
    <main role="main" aria-label="Carrito de compras" className="d-flex flex-column min-vh-100 bg-dark text-white">
      <div className="container flex-grow-1 d-flex flex-column py-4">
        {/* Título principal: h1 para accesibilidad / orden de encabezados */}
        <h1 className="mb-4 text-center">Carrito de Compras</h1>

        {productosConProblemas.length > 0 && (
          <Alert variant="warning" className="mb-3" role="alert">
            <Alert.Heading>¡Atención!</Alert.Heading>
            Algunos productos en tu carrito tienen más cantidad que el stock disponible.
            Por favor, ajusta las cantidades antes de proceder con la compra.
          </Alert>
        )}

        <div className="overflow-auto flex-grow-1 bg-dark p-3 rounded" aria-live="polite" aria-atomic="true">
          {cart.map(item => {
            const itemTotal = item.precio * item.quantity;
            const imageUrl = item.portada?.startsWith('http') ? item.portada : `${CLOUDINARY_BASE_URL}/${item.portada}`;

            const tieneStockSuficiente = item.quantity <= item.stock;

            return (
              <article
                key={item.id}
                className={`d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3 p-3 border-bottom ${!tieneStockSuficiente ? 'bg-warning bg-opacity-10' : 'bg-dark'} text-white`}
                aria-labelledby={`product-title-${item.id}`}
              >
                <Image
                  src={imageUrl}
                  alt={`${item.manga?.titulo} — portada del tomo ${item.numero_tomo}`}
                  thumbnail
                  style={{ maxWidth: '80px', width: '80px', height: '100px', objectFit: 'cover' }}
                  className="me-md-3 mb-2 mb-md-0"
                  loading="lazy"
                  width={80}
                  height={100}
                />

                <div className="flex-grow-1">
                  <h2 id={`product-title-${item.id}`} className="h5 mb-1">
                    {item.manga?.titulo} - Tomo {item.numero_tomo}
                    {!tieneStockSuficiente && (
                      <span className="badge bg-danger ms-2">Stock insuficiente</span>
                    )}
                  </h2>

                  <p className="mb-1">Idioma: {item.idioma}</p>
                  <p className="mb-1">Stock disponible: <strong>{item.stock}</strong></p>

                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="me-2"
                      onClick={() => handleDecrease(item)}
                      disabled={item.quantity <= 1}
                      aria-label={`Disminuir cantidad de ${item.manga?.titulo}, actualmente ${item.quantity}`}
                    >
                      <span aria-hidden="true">–</span>
                      <span className="visually-hidden"> Disminuir cantidad</span>
                    </Button>

                    <span className="mx-2" aria-live="polite" aria-atomic="true">{item.quantity}</span>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleIncrease(item)}
                      disabled={item.quantity >= item.stock}
                      aria-label={`Aumentar cantidad de ${item.manga?.titulo}, máximo ${item.stock}`}
                    >
                      <span aria-hidden="true">+</span>
                      <span className="visually-hidden"> Aumentar cantidad</span>
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      className="ms-2"
                      onClick={() => handleRemove(item)}
                      aria-label={`Eliminar ${item.manga?.titulo} del carrito`}
                    >
                      <i className="fas fa-trash" aria-hidden="true" /> <span className="ms-1">Eliminar</span>
                    </Button>
                  </div>
                </div>

                <div className="ms-md-auto text-md-end mt-2 mt-md-0">
                  <strong aria-label={`Precio total del producto ${item.manga?.titulo}`}>${itemTotal.toFixed(2)}</strong>
                </div>
              </article>
            );
          })}
        </div>

        <div className="p-3 border-top bg-dark">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <strong>Total</strong>
            <div aria-live="polite" aria-atomic="true">
              <strong>${totalAmount.toFixed(2)}</strong>
            </div>
          </div>

          {/* === CONTROLES DE BOTONES: contenedor unico para igualar anchos === */}
          {/* WRAPPER modificado para centrar correctamente el grupo de botones */}
          <div className="d-flex justify-content-center">
            <div className="d-flex gap-2 flex-column flex-sm-row cart-actions">
              <Button
                type="button"
                variant="outline-light"
                onClick={() => {
                  const lastPage = sessionStorage.getItem('tomos_current_page') || '1';
                  navigate(`/?page=${lastPage}`);
                }}
                className="cart-btn"
                aria-label="Seguir comprando, ir al inicio"
                disabled={clearingCart}
              >
                Seguir Comprando
              </Button>

              <Button
                type="button"
                variant="warning"
                onClick={handlePayPalBuy}
                className="cart-btn"
                disabled={productosConProblemas.length > 0 || processingPayment || clearingCart}
                title="Pagar con PayPal"
                aria-label="Pagar con PayPal"
              >
                {processingPayment && paymentMethod === 'paypal' ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                    PayPal...
                  </>
                ) : (
                  <>PayPal</>
                )}
              </Button>
            </div>
          </div>

          {productosConProblemas.length > 0 && (
            <div className="mt-2">
              <small className="text-warning">
                No puedes proceder con la compra hasta que ajustes las cantidades de los productos con stock insuficiente.
              </small>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default CartPage;
