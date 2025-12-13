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
const API_URL = 'https://mangakaappweb-production.up.railway.app/api';

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
        const res = await fetch(`${API_URL}/orders/invoices/${id}`, {
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
    if (!element) return;
    const canvas = await html2canvas(element, { scale: 2 });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 40;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    const numeroDigitos = (factura?.numero || '').replace(/\D/g, '').slice(0, 6);
    pdf.save(`Factura-${numeroDigitos || id}.pdf`);
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

  const fechaSolo = factura.fecha ? new Date(factura.fecha).toLocaleDateString() : '';
  const numeroMostrar = String(factura.numero || '').replace(/\D/g, '').slice(0, 6);

  return (
    <div className="detalle-factura-page min-vh-100">
      <div className="invoice-wrapper container py-4">
        <div ref={facturaRef} className="invoice-container p-4">
          <div className="invoice-header mb-3">
            <div className="company-info d-flex align-items-center">
              <h5 className="company-name mb-0">Mangaka Baka Shop</h5>
            </div>
            <div className="invoice-meta text-end">
              <div><small className="meta-label">N°:</small> <strong>{numeroMostrar}</strong></div>
              <div><small className="meta-label">Fecha:</small> <span>{fechaSolo}</span></div>
            </div>
          </div>

          <hr className="divider" />

          <div className="address-block mb-3 p-2">
            <h6 className="address-title mb-1">FACTURAR A:</h6>
            <div className="address-content">{factura.cliente?.nombre || ''} {factura.cliente?.apellido || ''}</div>
          </div>

          <div className="table-section mb-3">
            <div className="table-responsive">
              <Table bordered className="invoice-table mb-0">
                <thead>
                  <tr className="table-head-row">
                    <th>Producto</th>
                    <th className="text-center">Cant</th>
                    <th className="text-end">Precio</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.detalles.map((d, idx) => (
                    <tr key={d.tomo_id ?? idx}>
                      <td>
                        <div className="product-title">{d.titulo}</div>
                        <div className="product-subtitle">Tomo {d.numero_tomo}</div>
                      </td>
                      <td className="text-center align-middle">{d.cantidad}</td>
                      <td className="text-end align-middle">${(+d.precio_unitario).toFixed(2)}</td>
                      <td className="text-end align-middle">${(+d.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>

          <hr className="divider" />

          <div className="totals-row d-flex justify-content-end mt-3">
            <div className="totals-box p-3">
              <div className="d-flex justify-content-between fw-bold">
                <span>Total:</span>
                <span>${(+factura.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-actions p-3 bg-light text-center">
        <div className="container d-flex gap-2 justify-content-center">
          <Button variant="secondary" className="w-50" onClick={volverHome}>
            Volver al Home
          </Button>
          <Button variant="primary" className="w-50" onClick={descargarComoPdf}>
            Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DetalleFacturaPage;
