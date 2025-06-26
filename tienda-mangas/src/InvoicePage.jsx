// src/pages/InvoicePage.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import { Button, Table, Spinner, Alert } from 'react-bootstrap';

const API_BASE_URL = 'https://mangakaappweb-production.up.railway.app/api';

const InvoicePage = () => {
  const { id } = useParams();          // :id de /invoices/:id
  const navigate = useNavigate();
  const { user, loadingUser } = useContext(UserContext);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      const token = localStorage.getItem('token');
      if (loadingUser || !user || !token) {
        // Si no está logueado, lo mandamos al login
        return navigate('/login');
      }

      try {
        const res = await fetch(
          `${API_BASE_URL}/orders/invoices/${id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }
          }
        );
        if (res.status === 403) {
          setError('No tienes permiso para ver esta factura.');
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setInvoice(data);
      } catch (err) {
        console.error(err);
        setError('Error cargando la factura.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id, user, loadingUser, navigate]);

  if (loading || loadingUser) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <Alert variant="danger">{error}</Alert>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="container py-4">
      <Button variant="secondary" onClick={() => navigate(-1)}>← Volver</Button>
      <h2 className="mt-3">Factura #{invoice.numero}</h2>
      <p>Fecha: {new Date(invoice.fecha).toLocaleString()}</p>

      <Table striped bordered hover className="mt-3">
        <thead>
          <tr>
            <th>Título</th>
            <th>Tomo</th>
            <th>Cantidad</th>
            <th>Precio unitario</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.detalles.map((d, idx) => (
            <tr key={idx}>
              <td>{d.titulo}</td>
              <td>{d.numero_tomo}</td>
              <td>{d.cantidad}</td>
              <td>${d.precio_unitario.toFixed(2)}</td>
              <td>${d.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h4 className="text-end">Total: ${invoice.total.toFixed(2)}</h4>
    </div>
  );
};

export default InvoicePage;
