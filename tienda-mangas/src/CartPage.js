// src/CartPage.js
import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import { UserContext } from './UserContext';
import { Button, Image, Alert, Spinner, Modal, InputGroup, FormControl } from 'react-bootstrap';

const CLOUDINARY_BASE_URL = process.env.REACT_APP_CLOUDINARY_URL;
const REACT_PAYPAL_CREATE_ORDER = `${process.env.REACT_APP_API_URL}/paypal/create-order`;
const REACT_TOMOS_GET = (id) => `${process.env.REACT_APP_API_URL}/tomos/${id}`;

const CartPage = () => {
  const { cart, updateCartItem, removeCartItem, updateCartItemStock } = useContext(CartContext);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [clearingCart, setClearingCart] = useState(false);

  // Stock modal state
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalData, setStockModalData] = useState(null); // { id, titulo, numero_tomo, stock, message }
  const [modalQuantity, setModalQuantity] = useState(1);

  useEffect(() => {
    // keep modalQuantity in sync if stockModalData changes
    if (stockModalData) {
      const cartItem = cart.find(it => String(it.id) === String(stockModalData.id));
      const currentQty = cartItem ? Number(cartItem.quantity || 1) : 1;
      const stock = Number(stockModalData.stock ?? 0);
      const initial = stock <= 0 ? 0 : Math.max(1, Math.min(currentQty, stock));
      setModalQuantity(initial);
    }
  }, [stockModalData, cart]);

  const totalAmount = cart.reduce((sum, item) => sum + (Number(item.precio) || 0) * (Number(item.quantity) || 0), 0);

  const handleIncrease = (item) => {
    const qty = Number(item.quantity || 0);
    const stock = Number(item.stock || 0);
    if (qty < stock) {
      updateCartItem(item.id, qty + 1);
    } else {
      // open modal with updated info
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
   * handlePaymentError: intenta extraer tomo_id y stock del error y obtener datos actualizados.
   * Actualiza el stock en el cart context (updateCartItemStock) y abre el modal permitiendo elegir la cantidad.
   */
  const handlePaymentError = async (errObj) => {
    const message = errObj && errObj.message ? errObj.message : String(errObj || 'Error desconocido');
    const tomoIdFromJson = errObj && (errObj.tomo_id || errObj.tomoId || errObj.id || (errObj.error && errObj.error.tomo_id));
    let tomoId = tomoIdFromJson ? String(tomoIdFromJson) : null;
    const stockFromJson = errObj && (errObj.stock || errObj.available);

    if (tomoId) {
      // try to fetch tomo fresh data
      try {
        const resp = await fetch(REACT_TOMOS_GET(tomoId), { headers: { Accept: 'application/json' } });
        if (resp.ok) {
          const tomoData = await resp.json();
          const tomo = tomoData.data ? tomoData.data : tomoData;
          const titulo = tomo.manga?.titulo || tomo.titulo || 'Producto';
          const numero = tomo.numero_tomo || tomo.numero || '';
          const stock = Number(tomo.stock ?? stockFromJson ?? 0);

          // update cart stock only (preserve quantity for now; modal lets user decide)
          if (typeof updateCartItemStock === 'function') {
            updateCartItemStock(tomoId, stock);
          }

          setStockModalData({ id: tomoId, titulo, numero_tomo: numero, stock });
          setProcessingPayment(false);
          setPaymentMethod(null);
          setShowStockModal(true);
          return;
        }
      } catch (e) {
        // fallback to cart info
      }

      // fallback: use cart item if fetch failed
      const cartItem = cart.find(it => String(it.id) === String(tomoId));
      const titulo = cartItem?.manga?.titulo || 'Producto';
      const numero = cartItem?.numero_tomo || '';
      const stock = Number(stockFromJson ?? cartItem?.stock ?? 0);

      if (typeof updateCartItemStock === 'function' && cartItem) {
        // update stock but keep quantity adjusted not exceeding stock
        updateCartItemStock(tomoId, stock);
      }

      setStockModalData({ id: tomoId, titulo, numero_tomo: numero, stock });
      setProcessingPayment(false);
      setPaymentMethod(null);
      setShowStockModal(true);
      return;
    }

    // Generic fallback
    setStockModalData({ id: null, titulo: null, numero_tomo: null, stock: null, message: message });
    setProcessingPayment(false);
    setPaymentMethod(null);
    setShowStockModal(true);
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
            const stockNum = Number(item.stock ?? 0);

            return (
              <article key={item.id} className={`d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3 p-3 border-bottom ${!tieneStockSuficiente ? 'bg-warning bg-opacity-10' : 'bg-dark'} text-white`} aria-labelledby={`product-title-${item.id}`}>
                <Image src={imageUrl} alt={`${item.manga?.titulo} — portada del tomo ${item.numero_tomo}`} thumbnail style={{ maxWidth: '80px', width: '80px', height: '100px', objectFit: 'cover' }} className="me-md-3 mb-2 mb-md-0" loading="lazy" width={80} height={100} />

                <div className="flex-grow-1">
                  <h2 id={`product-title-${item.id}`} className="h5 mb-1">
                    {item.manga?.titulo} - Tomo {item.numero_tomo}
                    {!tieneStockSuficiente && (<span className="badge bg-danger ms-2">Stock insuficiente</span>)}
                  </h2>

                  <p className="mb-1">Idioma: {item.idioma}</p>
                  <p className="mb-1">Stock disponible: <strong>{stockNum}</strong></p>

                  <div>
                    <Button type="button" variant="secondary" size="sm" className="me-2" onClick={() => handleDecrease(item)} disabled={Number(item.quantity) <= 1} aria-label={`Disminuir cantidad de ${item.manga?.titulo}, actualmente ${item.quantity}`}>
                      <span aria-hidden="true">–</span>
                      <span className="visually-hidden"> Disminuir cantidad</span>
                    </Button>

                    <span className="mx-2" aria-live="polite" aria-atomic="true">{item.quantity}</span>

                    <Button type="button" variant="secondary" size="sm" onClick={() => handleIncrease(item)} disabled={Number(item.quantity) >= stockNum} aria-label={`Aumentar cantidad de ${item.manga?.titulo}, máximo ${stockNum}`}>
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

      {/* Modal: aviso de stock insuficiente y selector de cantidad */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Stock insuficiente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stockModalData ? (
            <>
              {stockModalData.message ? (
                <p>{stockModalData.message}</p>
              ) : (
                <>
                  <p>Disculpa — el siguiente producto tiene menos stock del que solicitaste:</p>
                  <p className="fw-bold">{stockModalData.titulo} {stockModalData.numero_tomo ? `- Tomo ${stockModalData.numero_tomo}` : ''}</p>
                  <p>Stock disponible: <strong>{stockModalData.stock}</strong></p>

                  {Number(stockModalData.stock) === 0 ? (
                    <p className="text-danger">Actualmente no hay unidades disponibles. Puedes quitar el producto o volver más tarde.</p>
                  ) : (
                    <>
                      <p>Elige una nueva cantidad válida:</p>
                      <InputGroup className="mb-2" style={{ maxWidth: 160 }}>
                        <Button variant="outline-secondary" onClick={() => setModalQuantity(q => Math.max(1, q - 1))} disabled={modalQuantity <= 1}>−</Button>
                        <FormControl
                          type="number"
                          min={1}
                          max={Number(stockModalData.stock)}
                          value={modalQuantity}
                          onChange={(e) => {
                            const v = Number(e.target.value || 0);
                            if (Number.isNaN(v)) return;
                            const clamped = Math.max(1, Math.min(v, Number(stockModalData.stock)));
                            setModalQuantity(clamped);
                          }}
                          aria-label="Cantidad a comprar"
                        />
                        <Button variant="outline-secondary" onClick={() => setModalQuantity(q => Math.min(Number(stockModalData.stock), q + 1))} disabled={modalQuantity >= Number(stockModalData.stock)}>+</Button>
                      </InputGroup>
                      <small className="text-muted">Máximo disponible: {stockModalData.stock}</small>
                    </>
                  )}
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
            if (!stockModalData) {
              setShowStockModal(false);
              return;
            }
            if (!stockModalData.id) {
              setShowStockModal(false);
              navigate('/cart');
              return;
            }

            // Actualizar stock y cantidad en el cart context
            const chosen = Number(modalQuantity || 1);
            if (typeof updateCartItemStock === 'function') {
              updateCartItemStock(stockModalData.id, Number(stockModalData.stock || 0), chosen);
            } else {
              // fallback: actualizar solo cantidad
              updateCartItem(stockModalData.id, chosen);
            }

            setShowStockModal(false);
            navigate('/cart');
          }} disabled={Number(stockModalData?.stock ?? 0) === 0}>
            Actualizar carrito
          </Button>
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
