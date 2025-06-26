import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from './CartContext';
import { UserContext } from './UserContext';
import { Button, Image } from 'react-bootstrap';

const API = 'https://mangakaappweb-production.up.railway.app/api';

const CartPage = () => {
  const { cart, clearCart } = useContext(CartContext);
  const { user, loadingUser } = useContext(UserContext);
  const navigate = useNavigate();

  const total = cart.reduce((sum, i) => sum + i.precio * i.quantity, 0);

  const handleBuy = async () => {
    const token = localStorage.getItem('token');
    if (loadingUser || !user || !token) {
      alert('Debes iniciar sesión para comprar.');
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`${API}/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          Authorization:`Bearer ${token}`
        },
        body: JSON.stringify({ items: cart.map(i=>({ id:i.id, quantity:i.quantity })) })
      });
      if (!res.ok) throw new Error(await res.text());
      const { factura_id } = await res.json();
      clearCart();
      navigate(`/facturas/${factura_id}`);
    } catch (e) {
      alert('Error al crear la factura: ' + e.message);
    }
  };

  if (loadingUser)   return <div className="p-4">Cargando sesión...</div>;
  if (!cart.length)  return <div className="p-4">Tu carrito está vacío.</div>;

  return (
    <div className="container py-4">
      <h2>Carrito de Compras</h2>
      {cart.map(item => (
        <div key={item.id} className="d-flex align-items-center mb-2">
          <Image src={item.portada} thumbnail style={{ width:60 }} />
          <div className="flex-grow-1 ms-3">
            {item.manga.titulo} (x{item.quantity})
          </div>
          <div>${(item.precio*item.quantity).toFixed(2)}</div>
        </div>
      ))}
      <hr />
      <h5>Total: ${total.toFixed(2)}</h5>
      <Button variant="primary" onClick={handleBuy}>Comprar</Button>{' '}
      <Button variant="danger" onClick={clearCart}>Vaciar Carrito</Button>
    </div>
  );
};

export default CartPage;
