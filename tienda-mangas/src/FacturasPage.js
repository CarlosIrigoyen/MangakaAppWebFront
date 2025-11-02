// src/FacturasPage.js
import React, { useEffect, useState, useRef, useContext } from 'react';
import { Table, Button, Spinner, Alert, Container, Card, Row, Col } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';
import './DetalleFacturaPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const FacturasPage = () => {
  const { user, loadingUser } = useContext(UserContext);
  const { clearCart } = useContext(CartContext);
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const facturaRef = useRef();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUltimaFactura = async () => {
      if (loadingUser) return;
      if (!user) {
        navigate('/');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams(location.search);
        const paypalToken = searchParams.get('token');

        if (paypalToken) {
          await capturarPagoPayPal(paypalToken);
        }

        const token = localStorage.getItem('token');
        const resList = await fetch(`${API_URL}/orders/invoices`, {
          headers: { 
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          }
        });
        
        if (!resList.ok) throw new Error(`HTTP ${resList.status} fetching invoices`);

        const list = await resList.json();
        if (!list.length) {
          setFactura(null);
          return;
        }

        const ultima = list[0];
        const resDet = await fetch(`${API_URL}/orders/invoices/${ultima.id}`, {
          headers: { 
            Authorization: `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          }
        });
        
        if (!resDet.ok) throw new Error(`HTTP ${resDet.status} fetching invoice detail`);
        
        const data = await resDet.json();
        setFactura(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error al obtener facturas');
      } finally {
        setLoading(false);
      }
    };

    fetchUltimaFactura();
  }, [user, loadingUser, navigate, location]);

  const capturarPagoPayPal = async (orderId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/paypal/capture-order/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error capturando pago PayPal');

      const result = await response.json();
      console.log('Pago PayPal capturado y factura creada:', result);

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

    } catch (err) {
      console.error('Error capturando pago PayPal:', err);
      setError('Error confirmando el pago: ' + err.message);
    }
  };

  const descargarComoPdf = async () => {
    if (!facturaRef.current) return;
    
    try {
      const canvas = await html2canvas(facturaRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      const numeroDigitos = String(factura.numero).replace(/\D/g, '').slice(0, 6);
      pdf.save(`Factura-${numeroDigitos}.pdf`);

    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
    }
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
        <Button onClick={volverHome}>Volver al Home</Button>
      </Container>
    );
  }

  if (!factura) {
    return (
      <Container className="p-4">
        <Alert variant="info">No tienes facturas.</Alert>
        <Button onClick={volverHome}>Volver al Home</Button>
      </Container>
    );
  }

  const fechaSolo = factura.fecha ? new Date(factura.fecha).toLocaleDateString() : '';
  const numeroMostrar = String(factura.numero).replace(/\D/g, '').slice(0, 6);

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      <Container className="flex-grow-1 py-4">
        <Alert variant="success">¡Pago procesado con éxito!</Alert>
        <div ref={facturaRef} className="p-3 p-md-4 bg-white text-dark rounded invoice-container">
          {/* Header */}
          <div className="invoice-header">
            <div className="company-info">
              <img src="/img/Mangaka.png" alt="Logo" width={50} height={50} className="me-3" />
              <h5 className="m-0">Mangaka Baka Shop</h5>
            </div>
            <div className="invoice-meta">
              <p className="mb-1"><strong>Nº:</strong> {numeroMostrar}</p>
              <p className="mb-0"><strong>Fecha:</strong> {fechaSolo}</p>
            </div>
          </div>

          {/* Cliente */}
          <div className="address-block">
            <h6>Facturar A:</h6>
            <p>{factura.cliente.nombre} {factura.cliente.apellido}</p>
          </div>

          {/* Productos - Vista Desktop (Tabla) */}
          <div className="d-none d-lg-block">
            <div className="table-responsive">
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
            </div>
          </div>

          {/* Productos - Vista Tablet Horizontal (Tabla compacta) */}
          <div className="d-none d-md-block d-lg-none">
            <div className="table-responsive">
              <Table bordered size="sm" className="invoice-table-compact">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-center">Cant</th>
                    <th className="text-end">Precio</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {factura.detalles.map(d => (
                    <tr key={d.tomo_id}>
                      <td>
                        <div className="product-title-small">{d.titulo}</div>
                        <div className="product-subtitle">Tomo {d.numero_tomo}</div>
                      </td>
                      <td className="text-center">{d.cantidad}</td>
                      <td className="text-end">${(+d.precio_unitario).toFixed(2)}</td>
                      <td className="text-end">${(+d.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>

          {/* Productos - Vista Móvil (Tarjetas) */}
          <div className="d-md-none">
            <div className="productos-mobile">
              <h6 className="mb-3 border-bottom pb-2">Productos</h6>
              {factura.detalles.map(d => (
                <Card key={d.tomo_id} className="mb-3 product-card">
                  <Card.Body>
                    <div className="product-info">
                      <strong className="product-title">{d.titulo}</strong>
                      <div className="product-details">
                        <span>Tomo {d.numero_tomo}</span>
                      </div>
                    </div>
                    <div className="product-prices">
                      <div className="price-row">
                        <span>Cantidad:</span>
                        <span>{d.cantidad}</span>
                      </div>
                      <div className="price-row">
                        <span>Precio unitario:</span>
                        <span>${(+d.precio_unitario).toFixed(2)}</span>
                      </div>
                      <div className="price-row total-row">
                        <strong>Subtotal:</strong>
                        <strong>${(+d.subtotal).toFixed(2)}</strong>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="totals-section">
            <div className="total-final">
              <strong>Total: ${(+factura.total).toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </Container>
      
      {/* Botones */}
      <div className="botones-factura">
        <Button variant="secondary" onClick={volverHome}>Volver al Home</Button>
        <Button variant="primary" onClick={descargarComoPdf}>Descargar PDF</Button>
      </div>
    </div>
  );
};

export default FacturasPage;
