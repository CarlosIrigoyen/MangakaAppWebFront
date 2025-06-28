// src/FacturasPage.js
import React, { useEffect, useState, useRef, useContext } from 'react';
import { Table, Button, Spinner, Alert, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';
import './DetalleFacturaPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_URL='https://mangakaappweb-production.up.railway.app/api'

const FacturasPage = () => {
  const { user, loadingUser } = useContext(UserContext);
  const { clearCart } = useContext(CartContext);
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const facturaRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUltimaFactura = async () => {
      if (loadingUser) return;
      if (!user) {
        navigate('/');
        return;
      }
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const resList = await fetch(`${API_URL}/orders/invoices`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!resList.ok) throw new Error(`HTTP ${resList.status}`);
        const list = await resList.json();
        if (!list.length) {
          setFactura(null);
          return;
        }
        const ultima = list[0];
        const resDet = await fetch(`${API_URL}/orders/invoices/${ultima.id}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!resDet.ok) throw new Error(`HTTP ${resDet.status}`);
        const data = await resDet.json();
        setFactura(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUltimaFactura();
  }, [user, loadingUser, navigate]);

  const descargarComoPdf = async () => {
    if (!facturaRef.current) return;
    const canvas = await html2canvas(facturaRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 40;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    const numeroDigitos = String(factura.numero).replace(/\D/g, '').slice(0, 6);
    pdf.save(`Factura-${numeroDigitos}.pdf`);
  };

  const volverHome = () => {
    clearCart();
    navigate('/');
  };

  if (loadingUser || loading) {
    return <Container className="d-flex justify-content-center align-items-center min-vh-100"><Spinner animation="border" /></Container>;
  }

  if (error) {
    return <Container className="p-4"><Alert variant="danger">{error}</Alert><Button onClick={volverHome}>Volver al Home</Button></Container>;
  }

  if (!factura) {
    return <Container className="p-4"><Alert variant="info">No tienes facturas.</Alert><Button onClick={volverHome}>Volver al Home</Button></Container>;
  }

  const fechaSolo = factura.fecha ? new Date(factura.fecha).toLocaleDateString() : '';
  const numeroMostrar = String(factura.numero).replace(/\D/g, '').slice(0, 6);

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      <Container className="flex-grow-1 py-4">
        <Alert variant="success">¡Pago procesado con éxito!</Alert>
        <div ref={facturaRef} className="p-4 bg-white text-dark rounded invoice-container">
          {/* Encabezado con logo y meta */}
          <div className="invoice-header d-flex justify-content-between align-items-center mb-4">
            <div className="company-info d-flex align-items-center">
              <img src="/img/Mangaka.png" alt="Logo" width={50} height={50} className="me-3" />
              <h5 className="m-0">Mangaka Baka Shop</h5>
            </div>
            <div className="invoice-meta text-end">
              <p className="mb-1"><strong>Nº:</strong> {numeroMostrar}</p>
              <p className="mb-0"><strong>Fecha:</strong> {fechaSolo}</p>
            </div>
          </div>

          {/* Bloque Facturar A */}
          <div className="address-block mb-4">
            <h6>Facturar A:</h6>
            <p>{factura.cliente.nombre} {factura.cliente.apellido}</p>
          </div>

          {/* Tabla de detalles */}
          <Table bordered className="invoice-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th className="text-center">Cantidad</th>
                <th className="text-end">Precio</th>
                <th className="text-end">Importe</th>
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

          {/* Totales */}
          <div className="d-flex justify-content-end mt-3">
            <div className="totals-box p-3">
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>Total</span>
                <span>${(+factura.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
      <div className="p-3 bg-dark text-end">
        <Button variant="secondary" className="me-2" onClick={volverHome}>Volver al Home</Button>
        <Button variant="primary" onClick={descargarComoPdf}>Descargar PDF</Button>
      </div>
    </div>
  );
};

export default FacturasPage;
