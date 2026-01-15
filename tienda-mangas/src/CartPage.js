// src/CartPage.js
import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import { UserContext } from './UserContext';
import { Button, Image, Alert, Spinner, Modal } from 'react-bootstrap';

const CLOUDINARY_BASE_URL = process.env.REACT_APP_CLOUDINARY_URL;
const REACT_PAYPAL_CREATE_ORDER = `${process.env.REACT_APP_API_URL}/paypal/create-order`;
const REACT_TOMOS_GET = (id) => `${process.env.REACT_APP_API_URL}/tomos/${id}`;

const CartPage = () => {
  const { cart, updateCartItem, removeCartItem, updateCartItemStock } = useContext(CartContext);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null); // 'paypal'
  const [clearingCart, setClearingCart] = useState(false);

  // Modal para stock insuficiente
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalData, setStockModalData] = useState(null); // { id, titulo, numero_tomo, stock, message }

  const totalAmount = cart.reduce((sum, item) => sum + (Number(item.precio) || 0) * (Number(item.quantity) || 0), 0);

  const handleIncrease = (item) => {
    const qty = Number(item.quantity || 0);
    const stock = Number(item.stock || 0);
    if (qty < stock) {
      updateCartItem(item.id, qty + 1);
    } else {
      setStockModalData({ id: item.id, titulo: item.manga?.titulo || 'Producto', numero_tomo: item.numero_tomo, stock: item.stock });
      setShowStockModal(true);
    }
  };

  const handleDecrease = (item) => {
    const qty = Number(item.quantity || 0);
    if (qty > 1) updateCartItem(item.id, qty - 1);
  };

  const handleRemove = (item) => removeCartItem(item.id);

  const handleClearCart = () => setShowClearCartModal(true);

  const confirmClearCart = async () => {
    setClearingCart(true);
    try {
      const itemsToRemove = [...cart];
      const failed = [];
      for (const item of itemsToRemove) {
        try {
          const result = handleRemove(item);
          await (result instanceof Promise ? result : Promise.resolve(result));
        } catch (err) {
          failed.push(item);
        }
      }
      if (failed.length > 0) {
        alert(`No se pudieron eliminar ${failed.length} item(s).`);
      }
    } finally {
      setClearingCart(false);
      setShowClearCartModal(false);
    }
  };

  /**
   * validatePurchase: si detecta stock insuficiente en el carrito, abre el modal
   */
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

    const itemsSinStock = cart.filter(item => Number(item.quantity) > Number(item.stock));
    if (itemsSinStock.length > 0) {
      const item = itemsSinStock[0];
      setStockModalData({ id: item.id, titulo: item.manga?.titulo || 'Producto', numero_tomo: item.numero_tomo, stock: item.stock });
      setShowStockModal(true);
      return false;
    }

    const itemsCantidadCero = cart.filter(item => Number(item.quantity) <= 0);
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

  /**
   * Maneja errores de pago relacionados con stock. Ahora SIEMPRE muestra modal (no alert),
   * intenta obtener datos del tomo desde la API y, si no puede, usa la info del carrito o del propio error JSON.
   */
  const handlePaymentError = async (errObj) => {
    const message = errObj && errObj.message ? errObj.message : String(errObj || 'Error desconocido');

    const tomoIdFromJson = errObj && (errObj.tomo_id || errObj.tomoId || errObj.id || (errObj.error && errObj.error.tomo_id));
    let tomoId = tomoIdFromJson ? String(tomoIdFromJson) : null;
    const stockFromJson = errObj && (errObj.stock || errObj.available);

    // 1) Si tenemos ID del tomo: intentamos obtener datos actualizados desde la API
    if (tomoId) {
      try {
        const resp = await fetch(REACT_TOMOS_GET(tomoId), { headers: { Accept: 'application/json' } });
        if (resp.ok) {
          const tomoData = await resp.json();
          // compatibilizar con respuestas paginadas u objetos directos
          const tomo = tomoData.data ? tomoData.data : tomoData;
          const titulo = tomo.manga?.titulo || tomo.titulo || 'Producto';
          const numero = tomo.numero_tomo || tomo.numero || '';
          const stock = Number(tomo.stock ?? stockFromJson ?? 0);

          setStockModalData({ id: tomoId, titulo, numero_tomo: numero, stock });
          setProcessingPayment(false);
          setPaymentMethod(null);
          setShowStockModal(true);
          return;
        }
      } catch (e) {
        // fallback: seguimos intentando con datos locales
      }

      // 2) Fallback si la llamada falló: usar info disponible en el carrito o en el error
      const cartItem = cart.find(it => String(it.id) === String(tomoId));
      const titulo = cartItem?.manga?.titulo || 'Producto';
      const numero = cartItem?.numero_tomo || '';
      const stock = Number(stockFromJson ?? cartItem?.stock ?? 0);

      setStockModalData({ id: tomoId, titulo, numero_tomo: numero, stock });
      setProcessingPayment(false);
      setPaymentMethod(null);
      setShowStockModal(true);
      return;
    }

    // 3) Si no hay ID, mostrar modal genérico informando el problema y permitiendo al usuario volver al carrito
    setStockModalData({ id: null, titulo: null, numero_tomo: null, stock: null, message: message });
    setProcessingPayment(false);
    setPaymentMethod(null);
    setShowStockModal(true);
  };

  /**
   * Manejo de compra con PayPal (único método ahora).
   */
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
        const errorJson = await response.json().catch(() => null);
        return handlePaymentError(errorJson || { message: `HTTP ${response.status}` });
      }

      const { approve_url } = await response.json();
      if (!approve_url) return handlePaymentError({ message: 'No se recibió una URL de pago válida de PayPal.' });

      sessionStorage.setItem('pendingPurchase', JSON.stringify({
        timestamp: new Date().getTime(),
        cartItems: cart.length,
        paymentMethod: 'paypal'
      }));

      window.location.href = approve_url;
    } catch (err) {
      await handlePaymentError(err);
    }
  };

  // UI: pantalla de espera mientras se procesa el pago
  if (processingPayment) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white" role="status" aria-live="polite">
        <Spinner animation="border" role="status" className="mb-3" variant="primary" />
        <h1 className="h4">
          Procesando tu pago
          {paymentMethod === 'paypal' ? ' con PayPal' : ''}
          ...
        </h1>
        <p className="text-muted">Serás redirigido en un momento. Por favor, no cierres esta página.</p>
      </div>
    );
  }

  if (!cart.length) {
    const lastPage = sessionStorage.getItem('tomos_current_page') || '1';
    return (
      <main role="main" aria-label="Carrito de compras" className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white">
        <h1>Tu carrito está vacío</h1>
        <Button variant="secondary" className="mt-3" onClick={() => navigate(`/?page=${lastPage}`)}>Volver a la Tienda</Button>
      </main>
    );
  }

  const productosConProblemas = cart.filter(item => Number(item.quantity) > Number(item.stock));

  return (
    <main role="main" aria-label="Carrito de compras" className="d-flex flex-column min-vh-100 bg-dark text-white">
      <div className="container flex-grow-1 d-flex flex-column py-4">
        <h1 className="mb-4 text-center">Carrito de Compras</h1>

        {productosConProblemas.length > 0 && (
          <Alert variant="warning" className="mb-3" role="alert">
            <Alert.Heading>¡Atención!</Alert.Heading>
            Algunos productos en tu carrito tienen más cantidad que el stock disponible. Por favor, ajusta las cantidades antes de proceder con la compra.
          </Alert>
        )}

        <div className="overflow-auto flex-grow-1 bg-dark p-3 rounded" aria-live="polite" aria-atomic="true">
          {cart.map(item => {
            const itemTotal = (Number(item.precio) || 0) * (Number(item.quantity) || 0);
            const imageUrl = item.portada?.startsWith('http') ? item.portada : `${CLOUDINARY_BASE_URL}/${item.portada}`;
            const tieneStockSuficiente = Number(item.quantity) <= Number(item.stock);

            return (
              <article key={item.id} className={`d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3 p-3 border-bottom ${!tieneStockSuficiente ? 'bg-warning bg-opacity-10' : 'bg-dark'} text-white`} aria-labelledby={`product-title-${item.id}`}>
                <Image src={imageUrl} alt={`${item.manga?.titulo} — portada del tomo ${item.numero_tomo}`} thumbnail style={{ maxWidth: '80px', width: '80px', height: '100px', objectFit: 'cover' }} className="me-md-3 mb-2 mb-md-0" loading="lazy" width={80} height={100} />

                <div className="flex-grow-1">
                  <h2 id={`product-title-${item.id}`} className="h5 mb-1">
                    {item.manga?.titulo} - Tomo {item.numero_tomo}
                    {!tieneStockSuficiente && (<span className="badge bg-danger ms-2">Stock insuficiente</span>)}
                  </h2>

                  <p className="mb-1">Idioma: {item.idioma}</p>
                  <p className="mb-1">Stock disponible: <strong>{item.stock}</strong></p>

                  <div>
                    <Button type="button" variant="secondary" size="sm" className="me-2" onClick={() => handleDecrease(item)} disabled={Number(item.quantity) <= 1} aria-label={`Disminuir cantidad de ${item.manga?.titulo}, actualmente ${item.quantity}`}>
                      <span aria-hidden="true">–</span>
                      <span className="visually-hidden"> Disminuir cantidad</span>
                    </Button>

                    <span className="mx-2" aria-live="polite" aria-atomic="true">{item.quantity}</span>

                    <Button type="button" variant="secondary" size="sm" onClick={() => handleIncrease(item)} disabled={Number(item.quantity) >= Number(item.stock)} aria-label={`Aumentar cantidad de ${item.manga?.titulo}, máximo ${item.stock}`}>
                      <span aria-hidden="true">+</span>
                      <span className="visually-hidden"> Aumentar cantidad</span>
                    </Button>

                    <Button type="button" variant="danger" size="sm" className="ms-2" onClick={() => handleRemove(item)} aria-label={`Eliminar ${item.manga?.titulo} del carrito`}>
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
            <div aria-live="polite" aria-atomic="true"><strong>${totalAmount.toFixed(2)}</strong></div>
          </div>

          <div className="d-flex justify-content-center">
            <div className="d-flex gap-2 flex-column flex-sm-row cart-actions">
              <Button type="button" variant="outline-light" onClick={() => { const lastPage = sessionStorage.getItem('tomos_current_page') || '1'; navigate(`/?page=${lastPage}`); }} className="cart-btn" aria-label="Seguir comprando, ir al inicio" disabled={clearingCart}>Seguir Comprando</Button>

              <Button type="button" variant="warning" onClick={handlePayPalBuy} className="cart-btn" disabled={productosConProblemas.length > 0 || processingPayment || clearingCart} title="Pagar con PayPal" aria-label="Pagar con PayPal">
                {processingPayment && paymentMethod === 'paypal' ? (<><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />PayPal...</>) : (<>PayPal</>)}
              </Button>
            </div>
          </div>

          {productosConProblemas.length > 0 && (<div className="mt-2"><small className="text-warning">No puedes proceder con la compra hasta que ajustes las cantidades de los productos con stock insuficiente.</small></div>)}
        </div>
      </div>

      {/* Modal: aviso de stock insuficiente */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Disculpas — stock insuficiente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stockModalData ? (
            <> 
              {stockModalData.message ? (
                <>
                  <p>{stockModalData.message}</p>
                </>
              ) : (
                <>
                  <p>Te pedimos disculpas, pero el siguiente producto:</p>
                  <p className="fw-bold">{stockModalData.titulo} {stockModalData.numero_tomo ? `- Tomo ${stockModalData.numero_tomo}` : ''}</p>
                  <p>tiene <strong>{stockModalData.stock}</strong> unidades disponibles actualmente.</p>
                  <p>Por favor elige una nueva cantidad o intenta la compra más tarde.</p>
                </>
              )}
            </>
          ) : (
            <p>No se pudo obtener la información del producto. Intenta recargar la página.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStockModal(false)}>Cerrar</Button>
          <Button variant="primary" onClick={() => {
            // Al aceptar: actualizamos el stock en el carrito y volvemos/cargamos el CartPage
            if (!stockModalData) {
              setShowStockModal(false);
              return;
            }
            if (!stockModalData.id) {
              // Si no hay id no podemos actualizar; solo cerramos y volvemos al carrito
              setShowStockModal(false);
              navigate('/cart');
              return;
            }

            const item = cart.find(it => String(it.id) === String(stockModalData.id));
            if (item) {
              const nuevaCantidad = Math.max(1, Math.min(Number(item.quantity || 1), Number(stockModalData.stock || 0)));
              if (typeof updateCartItemStock === 'function') {
                updateCartItemStock(item.id, stockModalData.stock, nuevaCantidad);
              } else {
                updateCartItem(item.id, nuevaCantidad);
              }
            }
            setShowStockModal(false);
            // Navegar para asegurarnos de volver al CartPage (y forzar re-render si veníamos de otra ruta)
            navigate('/cart');
          }}>Aceptar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para confirmar vaciar carrito */}
      <Modal show={showClearCartModal} onHide={() => setShowClearCartModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Vaciar carrito</Modal.Title>
        </Modal.Header>
        <Modal.Body>¿Estás seguro que quieres vaciar el carrito?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClearCartModal(false)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmClearCart} disabled={clearingCart}>Vaciar</Button>
        </Modal.Footer>
      </Modal>
    </main>
  );
};

export default CartPage;
