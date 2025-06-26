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

  if (loading) return <Spinner animation="border" />;
  if (error)   return <Alert variant="danger">{error}</Alert>;
  if (!factura) return <Alert variant="warning">Factura no encontrada</Alert>;

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
    const numeroDigitos = (factura.numero || '').replace(/\D/g, '');
    pdf.save(`Factura-${numeroDigitos}.pdf`);
  };

  const fechaSolo = factura.fecha
    ? new Date(factura.fecha).toLocaleDateString()
    : '';
  const numeroDigitos = (factura.numero || '').replace(/\D/g, '');
  const cliente = factura.cliente || {};

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      <div className="container flex-grow-1 py-4">
        <div ref={facturaRef} className="p-4 bg-secondary rounded">
          {/* Cabecera */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center">
              <img src="/img/Mangaka.png" alt="Logo" width={80} className="me-3 rounded-circle" />
              <h4 className="mb-0">Mangaka Baka Shop</h4>
            </div>
            <div className="text-end">
              <h5 className="text-warning">FACTURA</h5>
              <p className="mb-1"><strong>Nº:</strong> {numeroDigitos}</p>
              <p className="mb-0"><strong>Fecha:</strong> {fechaSolo}</p>
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-4 p-3 bg-dark rounded">
            <h6 className="text-warning">FACTURAR A:</h6>
            <p className="mb-0">
              {cliente.nombre || ''} {cliente.apellido || ''}
            </p>
          </div>

          {/* Detalles */}
          <Table bordered variant="dark" className="invoice-table">
            <thead>
              <tr className="bg-secondary text-white">
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
            <div className="p-3 bg-dark rounded" style={{ width: 240 }}>
              <hr className="border-light" />
              <div className="d-flex justify-content-between fw-bold">
                <span>Total</span>
                <span>${(+factura.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="p-3 bg-dark text-end">
        <Button variant="secondary" className="me-2" onClick={() => navigate('/')}>
          Volver al Home
        </Button>
        <Button variant="warning" onClick={descargarComoPdf}>
          Descargar Factura (PDF)
        </Button>
      </div>
    </div>
  );
};

export default DetalleFacturaPage;
