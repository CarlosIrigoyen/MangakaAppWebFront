import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import { UserContext } from './UserContext';
import { Button, Image } from 'react-bootstrap';

const API_BASE = process.env.REACT_APP_API_URL;
const CLOUDINARY = process.env.REACT_APP_CLOUDINARY_URL;

const CartPage = () => {
  const { cart, updateCartItem, clearCart, removeCartItem } = useContext(CartContext);
  const { user, loadingUser } = useContext(UserContext);
  const navigate = useNavigate();

  const total = cart.reduce((sum, i) => sum + i.precio * i.quantity, 0);

  const handleBuy = async () => {
    const token = localStorage.getItem('token');
    if (!user||!token) return navigate('/login');

    try {
      const res = await fetch(`${API_BASE}/paypal/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map(i=>({ id:i.id, quantity:i.quantity }))
        }),
      });
      if(!res.ok) throw new Error(await res.text());
      const { approval_url } = await res.json();
      window.location.href = approval_url;
    } catch (e) {
      alert('Error al iniciar pago: '+e.message);
    }
  };

  if (loadingUser) return <div>Cargando...</div>;
  if (!cart.length) return <div>Carrito vacío</div>;

  return (
    <div className="container py-4 bg-dark text-white">
      <h2>Carrito</h2>
      {cart.map(item=>(
        <div key={item.id} className="d-flex mb-3">
          <Image
            src={item.portada.startsWith('http')?item.portada:`${CLOUDINARY}/${item.portada}`}
            alt="" width={60} thumbnail
          />
          <div className="ms-3">
            <h5>{item.manga?.titulo} (x{item.quantity})</h5>
            <p>Precio: ${item.precio}</p>
          </div>
        </div>
      ))}
      <h4>Total: ${total.toFixed(2)} ARS</h4>
      <Button onClick={handleBuy}>Pagar con PayPal</Button>
    </div>
  );
};

export default CartPage;
