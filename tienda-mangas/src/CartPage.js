import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import { UserContext } from './UserContext';
import { Button, Image, Alert, Modal } from 'react-bootstrap';

const CLOUDINARY_BASE_URL = process.env.REACT_APP_CLOUDINARY_URL;
const REACT_MERCADO_PAGO_PREFERENCE = `${process.env.REACT_APP_API_URL}/mercadopago/preference`;

const CartPage = () => {
  const { cart, updateCartItem, clearCartAfterPurchase, removeCartItem } = useContext(CartContext);
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  // Estado para el modal de vaciar carrito
  const [showClearCartModal, setShowClearCartModal] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);

  const handleIncrease = (item) => {
    if (item.quantity < item.stock) {
      updateCartItem(item.id, item.quantity + 1);
    } else {
      alert(`No hay suficiente stock. Stock disponible: ${item.stock}`);
    }
  };

  const handleDecrease = (item) => {
    if (item.quantity > 1) {
      updateCartItem(item.id, item.quantity - 1);
    }
  };

  const handleRemove = (item) => {
    removeCartItem(item.id);
  };

  const handleClearCart = () => {
    setShowClearCartModal(true);
  };

  const confirmClearCart = async () => {
    await clearCartAfterPurchase();
    setShowClearCartModal(false);
  };

  const handleBuy = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Debes iniciar sesión para comprar.');
        navigate('/login');
        return;
      }

      if (!user || !user.id) {
        alert('Usuario no identificado. Por favor, inicia sesión nuevamente.');
        navigate('/login');
        return;
      }

      // Verificar que todos los items tengan stock disponible
      const itemsSinStock = cart.filter(item => item.quantity > item.stock);
      if (itemsSinStock.length > 0) {
        alert('Algunos productos en tu carrito no tienen suficiente stock disponible. Por favor, ajusta las cantidades.');
        return;
      }

      // Verificar que no haya items con cantidad 0
      const itemsCantidadCero = cart.filter(item => item.quantity <= 0);
      if (itemsCantidadCero.length > 0) {
        alert('Algunos productos en tu carrito tienen cantidad inválida.');
        return;
      }

      const payload = {
        cliente_id: user.id,
        productos: cart.map(i => ({
          tomo_id: i.id,
          titulo: i.manga?.titulo || 'Producto sin título',
          cantidad: i.quantity,
          precio_unitario: i.precio,
        })),
      };

      console.log('Token:', token);
      console.log('Payload enviado:', payload);

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
        let errorMsg = `HTTP ${response.status}`;
        const errorData = await response.json().catch(() => null);
        console.error('Detalle del error de la API:', errorData);
        if (errorData?.message) {
          errorMsg += `: ${errorData.message}`;
        } else if (errorData) {
          errorMsg += `: ${JSON.stringify(errorData)}`;
        }
        throw new Error(errorMsg);
      }

      const { init_point } = await response.json();
      if (!init_point) {
        throw new Error('No se recibió una URL de pago válida.');
      }

      // LIMPIAR CARRITO DESPUÉS DE COMPRA EXITOSA
      await clearCartAfterPurchase();
      
      window.location.href = init_point;
    } catch (err) {
      console.error('Error en createPreference:', err);
      alert(`No se pudo iniciar el pago: ${err.message || 'Error desconocido'}`);
    }
  };

  if (!cart.length) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white">
        <h2>Tu carrito está vacío</h2>
        <Button variant="secondary" className="mt-3" onClick={() => navigate('/')}>
          Volver a la Tienda
        </Button>
      </div>
    );
  }

  // Verificar si hay productos con problemas de stock
  const productosConProblemas = cart.filter(item => item.quantity > item.stock);

  return (
    <>
      <div className="d-flex flex-column min-vh-100 bg-dark text-white">
        <div className="container flex-grow-1 d-flex flex-column py-4">
          <h2 className="mb-4 text-center">Carrito de Compras</h2>
          
          {productosConProblemas.length > 0 && (
            <Alert variant="warning" className="mb-3">
              <Alert.Heading>¡Atención!</Alert.Heading>
              Algunos productos en tu carrito tienen más cantidad que el stock disponible. 
              Por favor, ajusta las cantidades antes de proceder con la compra.
            </Alert>
          )}

          <div className="overflow-auto flex-grow-1 bg-dark p-3 rounded">
            {cart.map(item => {
              const itemTotal = item.precio * item.quantity;
              const imageUrl = item.portada?.startsWith('http')
                ? item.portada
                : `${CLOUDINARY_BASE_URL}/${item.portada}`;

              const tieneStockSuficiente = item.quantity <= item.stock;

              return (
                <div
                  key={item.id}
                  className={`d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3 p-3 border-bottom ${
                    !tieneStockSuficiente ? 'bg-warning bg-opacity-10' : 'bg-dark'
                  } text-white`}
                >
                  <Image
                    src={imageUrl}
                    alt={item.manga?.titulo}
                    thumbnail
                    style={{ maxWidth: '80px' }}
                    className="me-md-3 mb-2 mb-md-0"
                  />
                  <div className="flex-grow-1">
                    <h5 className="mb-1">
                      {item.manga?.titulo} - Tomo {item.numero_tomo}
                      {!tieneStockSuficiente && (
                        <span className="badge bg-danger ms-2">Stock insuficiente</span>
                      )}
                    </h5>
                    <p className="mb-1">Idioma: {item.idioma}</p>
                    <p className="mb-1">
                      Stock disponible: <strong>{item.stock}</strong>
                    </p>
                    <div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleDecrease(item)}
                        disabled={item.quantity <= 1}
                      >
                        –
                      </Button>
                      <span className="mx-2">{item.quantity}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleIncrease(item)}
                        disabled={item.quantity >= item.stock}
                      >
                        +
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="ms-2"
                        onClick={() => handleRemove(item)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                  <div className="ms-md-auto text-md-end mt-2 mt-md-0">
                    <strong>${itemTotal.toFixed(2)}</strong>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-top bg-dark">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <strong>Total</strong>
              <strong>${totalAmount.toFixed(2)}</strong>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <Button variant="outline-light" onClick={() => navigate('/')}>
                Seguir Comprando
              </Button>
              <div>
                <Button 
                  variant="danger" 
                  className="me-2" 
                  onClick={handleClearCart}
                >
                  Vaciar carrito
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleBuy}
                  disabled={productosConProblemas.length > 0}
                >
                  Comprar
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
      </div>

      {/* Modal para vaciar carrito */}
      <Modal show={showClearCartModal} onHide={() => setShowClearCartModal(false)} centered>
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>Vaciar Carrito</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-dark text-white">
          <div className="text-center">
            <i className="fas fa-shopping-cart fa-3x text-warning mb-3"></i>
            <h5>¿Estás seguro de que quieres vaciar tu carrito?</h5>
            <p className="text-muted">
              Se eliminarán {cart.length} producto{cart.length !== 1 ? 's' : ''} de tu carrito.
              {user}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-dark">
          <Button variant="secondary" onClick={() => setShowClearCartModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmClearCart}>
            <i className="fas fa-trash me-2"></i>
            Sí, vaciar carrito
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CartPage;