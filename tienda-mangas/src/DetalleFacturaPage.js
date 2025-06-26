// src/DetalleFacturaPage.js
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Spinner, Alert, Button } from 'react-bootstrap';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './DetalleFacturaPage.css';

const API_BASE = 'https://mangakaappweb-production.up.railway.app/api';

const DetalleFacturaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const facturaRef = useRef();

  useEffect(() => {
    const fetchFactura = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/orders/invoices/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('No se pudo cargar la factura');
        const data = await res.json();
        setFactura(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFactura();
  }, [id]);

  if (loading)  return <Spinner animation="border" />;
  if (error)    return <Alert variant="danger">{error}</Alert>;
  if (!factura) return <Alert variant="warning">Factura no encontrada</Alert>;

  const descargarComoPdf = async () => {
    const canvas = await html2canvas(facturaRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    const imgH = (canvas.height * w) / canvas.width;
    pdf.addImage(imgData, 'PNG', 40, 40, w - 80, imgH);
    const num = (factura.numero || '').replace(/\D/g, '');
    pdf.save(`Factura-${num}.pdf`);
  };

  const fechaSolo = factura.fecha
    ? new Date(factura.fecha).toLocaleDateString()
    : '';
  const numeroDigitos = (factura.numero || '').replace(/\D/g, '');
  const cliente = factura.cliente || {};

  return (
    <div className="page-wrapper">
      <div className="page-content">
        <div ref={facturaRef} className="invoice-card">
          {/* Cabecera */}
          <div className="invoice-header">
            <div className="company-info d-flex align-items-center">
              <img src="/img/Mangaka.png" alt="Logo" width={80} className="me-3" />
              <h4 className="mb-0">Mangaka Baka Shop</h4>
            </div>
            <div className="invoice-meta text-end">
              <h5>FACTURA</h5>
              <p className="mb-1"><strong>Nº:</strong> {numeroDigitos}</p>
              <p className="mb-0"><strong>Fecha:</strong> {fechaSolo}</p>
            </div>
          </div>

          {/* Facturar A */}
          <div className="billing-block">
            <h6>FACTURAR A:</h6>
            <p className="mb-0">
              {cliente.nombre || ''} {cliente.apellido || ''}
            </p>
          </div>

          {/* Detalles */}
          <Table bordered className="invoice-table">
            <thead>
              <tr>
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

          {/* Total */}
          <div className="d-flex justify-content-end mt-3">
            <div className="invoice-total-box">
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>Total</span>
                <span>${(+factura.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="page-footer">
        <Button variant="secondary" className="me-2" onClick={() => navigate('/')}>
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
