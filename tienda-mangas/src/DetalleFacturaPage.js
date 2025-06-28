// src/DetalleFacturaPage.js
import React, { useEffect, useState, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Spinner, Alert, Button, Container } from 'react-bootstrap';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';
import './DetalleFacturaPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const DetalleFacturaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loadingUser } = useContext(UserContext);
  const { clearCart } = useContext(CartContext);
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const facturaRef = useRef();

  useEffect(() => {
    const fetchFactura = async () => {
      if (loadingUser) return;
      if (!user) {
        navigate('/');
        return;
      }
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/orders/invoices/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setFactura(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFactura();
  }, [id, user, loadingUser, navigate]);

  const descargarComoPdf = async () => {
    const element = facturaRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 40;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    // Limitar número de factura a 6 dígitos
    const numeroDigitos = (factura.numero || '').replace(/\D/g, '').slice(0, 6);
    pdf.save(`Factura-${numeroDigitos}.pdf`);
  };

  const volverHome = () => {
    clearCart();
    navigate('/');
  };

  if (loadingUser || loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="p-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="secondary" className="mt-3" onClick={volverHome}>
          Volver al Home
        </Button>
      </Container>
    );
  }

  if (!factura) {
    return (
      <Container className="p-4">
        <Alert variant="warning">Factura no encontrada</Alert>
        <Button variant="secondary" className="mt-3" onClick={volverHome}>
          Volver al Home
        </Button>
      </Container>
    );
  }

  const fechaSolo = factura.fecha
    ? new Date(factura.fecha).toLocaleDateString()
    : '';
  // Obtener primeros 6 dígitos para mostrar
  const numeroMostrar = String(factura.numero).replace(/\D/g, '').slice(0, 6);

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      <div className="container flex-grow-1 d-flex flex-column py-4">
        <div ref={facturaRef} className="p-4 bg-white text-dark rounded">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center">
              <img src="/img/Mangaka.png" alt="Logo" width={80} className="me-3 rounded-circle" />
              <h4 className="mb-0">Mangaka Baka Shop</h4>
            </div>
            <div className="text-end">
              <h5 className="text-primary">FACTURA</h5>
              <p className="mb-1"><strong>Nº:</strong> {numeroMostrar}</p>
              <p className="mb-0"><strong>Fecha:</strong> {fechaSolo}</p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-light rounded">
            <h6 className="text-primary mb-2">FACTURAR A:</h6>
            <p className="mb-0">
              {factura.cliente?.nombre || ''} {factura.cliente?.apellido || ''}
            </p>
          </div>

          <Table bordered className="invoice-table">
            <thead>
              <tr className="bg-primary text-white">
                <th>DESCRIPCIÓN</th>
                <th className="text-center">CANTIDAD</th>
                <th className="text-end">PRECIO</th>
                <th className="text-end">IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {factura.detalles.map(d => (
                <tr key={d.tomo_id}>
                  <td>{`${d.titulo} – Tomo ${d.numero_tomo}`}</td>
                  <td className="text-center">{d.cantidad}</td>
                  <td className="text-end">${(+d.precio_unitario).toFixed(2)}</td>
                  <td className="text-end">${(+d.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="d-flex justify-content-end mt-3">
            <div className="p-3 bg-light rounded" style={{ width: 240 }}>
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>Total</span>
                <span>${(+factura.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-dark text-end">
        <Button variant="secondary" className="me-2" onClick={volverHome}>
          Volver al Home
        </Button>
        <Button variant="primary" onClick={descargarComoPdf}>
          Descargar Factura (PDF)
        </Button>
      </div>
    </div>
  );
};

export default DetalleFacturaPage;
