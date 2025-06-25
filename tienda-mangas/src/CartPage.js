import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import { UserContext } from './UserContext'; // ¡IMPORTA UserContext!
import { Button, Image } from 'react-bootstrap';

const CLOUDINARY_BASE_URL =
  process.env.REACT_APP_CLOUDINARY_URL ||
  'https://res.cloudinary.com/TU_CLOUD_NAME/image/upload';



const REACT_MERCADO_PAGO_PREFERENCE=process.env.REACT_APP_REACT_MERCADO_PAGO_PREFERENCE
const CartPage = () => {
  const { cart, updateCartItem, clearCart, removeCartItem } = useContext(CartContext);
  const { user, loadingUser } = useContext(UserContext); // ¡CONSUME UserContext para obtener 'user' y 'loadingUser'!
  const navigate = useNavigate();

  const totalAmount = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);

  const handleIncrease = (item) => {
    if (item.quantity < item.stock) {
      updateCartItem(item.id, item.quantity + 1);
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

  const handleBuy = async () => {
    try {
      const token = localStorage.getItem('token'); // Todavía necesitas el token para la autorización
      // Asegúrate de que el usuario esté cargado y exista
      if (loadingUser || !user || !token) {
        alert('Debes iniciar sesión para comprar.');
        navigate('/login'); // O redirige a la página de login si lo prefieres
        return;
      }

      // Obtener cliente_id directamente del objeto `user` del contexto
      const clienteId = user.id;

      // Construir payload incluyendo cliente_id
      const payload = {
        cliente_id: clienteId, // `clienteId` ya es numérico
        productos: cart.map(i => ({
          tomo_id: i.id,
          titulo: i.manga?.titulo || 'Producto sin título',
          cantidad: i.quantity,
          precio_unitario: i.precio,
        })),
      };

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
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMsg += `: ${errorData.message}`;
          } else {
            errorMsg += `: ${JSON.stringify(errorData)}`;
          }
        } catch {
          // No JSON en body
        }
        throw new Error(errorMsg);
      }

      const { sandbox_init_point, init_point } = await response.json();
      const checkoutUrl = sandbox_init_point || init_point;
      if (!checkoutUrl) {
        throw new Error('No se recibió una URL de pago válida.');
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Error en createPreference:', err);
      alert(`No se pudo iniciar el pago: ${err.message || 'Error desconocido'}`);
    }
  };

  // Puedes mostrar un mensaje de carga si el usuario aún no se ha verificado
  if (loadingUser) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark text-white">
        Cargando tu sesión...
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-white">
        <h2>Tu carrito está vacío</h2>
        <Button variant="secondary" className="mt-3" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      <div className="container flex-grow-1 d-flex flex-column py-4">
        <h2 className="mb-4 text-center">Carrito de Compras</h2>
        <div className="overflow-auto flex-grow-1 bg-dark p-3 rounded">
          {cart.map(item => {
            const itemTotal = item.precio * item.quantity;
            const imageUrl = item.portada?.startsWith('http')
              ? item.portada
              : `${CLOUDINARY_BASE_URL}/${item.portada}`;

            return (
              <div
                key={item.id}
                className="d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3 p-3 border-bottom bg-dark text-white"
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
          <div className="d-flex justify-content-end">
            <Button variant="danger" className="me-2" onClick={clearCart}>
              Vaciar carrito
            </Button>
            <Button variant="primary" onClick={handleBuy}>
              Comprar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;