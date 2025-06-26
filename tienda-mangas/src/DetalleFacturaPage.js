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

  return (
    <div className="invoice-container p-5 bg-white text-dark" style={{ maxWidth: 800, margin: 'auto' }}>
      <div ref={facturaRef} className="invoice-content">

        {/* Cabecera */}
        <div className="d-flex justify-content-between align-items-center invoice-header mb-4">
          <div className="company-info">
            <img src="/img/Mangaka.png" alt="Logo" width={120} />
            <h5>Mangaka Baka Shop</h5>
          </div>
          <div className="invoice-meta text-end">
            <h4 className="text-primary">FACTURA</h4>
            <p><strong>Nº:</strong> {numeroDigitos}</p>
            <p><strong>Fecha:</strong> {fechaSolo}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="address-block mb-4">
          <h6 className="bg-primary text-white p-2">FACTURAR A:</h6>
          <p className="m-2">{factura.cliente?.nombre || ''}</p>
        </div>

        {/* Detalles */}
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

        {/* Total */}
        <div className="d-flex justify-content-end mt-3">
          <div className="totals-box p-3" style={{ width: 240 }}>
            <hr />
            <div className="d-flex justify-content-between fw-bold">
              <span>Total</span>
              <span>${(+factura.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      <div className="text-end mt-4">
        <Button onClick={descargarComoPdf}>Descargar Factura (PDF)</Button>{' '}
        <Button variant="secondary" onClick={() => navigate('/facturas')}>
          Volver
        </Button>
      </div>
    </div>
  );
};

export default DetalleFacturaPage;
