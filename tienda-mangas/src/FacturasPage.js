// src/FacturasPage.js
import React, { useEffect, useState, useRef, useContext } from 'react';
import { Table, Button, Spinner, Alert, Container, Badge } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';

import './DetalleFacturaPage.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://mangakaappweb-production.up.railway.app/api';

const FacturasPage = () => {
  const { user, loadingUser } = useContext(UserContext);
  const { clearCart } = useContext(CartContext);
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const facturaRef = useRef();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
        let facturaData = null;

        // Verificar si hay external_reference en los query params (para PayPal)
        const externalReference = searchParams.get('external_reference');
        const paypalSuccess = searchParams.get('paypal_success');

        if (externalReference) {
          // Buscar factura por external_reference
          try {
            const res = await fetch(`${API_URL}/orders/invoices/by-reference/${externalReference}`, {
              headers: { 
                Authorization: `Bearer ${token}`, 
                'Content-Type': 'application/json' 
              }
            });
            if (res.ok) {
              facturaData = await res.json();
              
              // Si es PayPal y el pago fue exitoso, capturar la orden
              if (paypalSuccess && facturaData && !facturaData.pagado) {
                await capturePayPalOrder(externalReference, token);
                // Recargar los datos de la factura
                const resUpdated = await fetch(`${API_URL}/orders/invoices/by-reference/${externalReference}`, {
                  headers: { 
                    Authorization: `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                  }
                });
                if (resUpdated.ok) {
                  facturaData = await resUpdated.json();
                }
              }
            }
          } catch (e) {
            console.log('No se pudo obtener factura por referencia:', e);
          }
        }

        // Si no se obtuvo factura por referencia, obtener la última factura pagada
        if (!facturaData) {
          const resList = await fetch(`${API_URL}/orders/invoices`, {
            headers: { 
              Authorization: `Bearer ${token}`, 
              'Content-Type': 'application/json' 
            }
          });
          if (!resList.ok) throw new Error(`HTTP ${resList.status}`);
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
          if (!resDet.ok) throw new Error(`HTTP ${resDet.status}`);
          facturaData = await resDet.json();
        }

        setFactura(facturaData);
        
        // Limpiar sessionStorage después de mostrar la factura
        sessionStorage.removeItem('pendingPurchase');
        
      } catch (e) {
        setError(e.message);
        console.error('Error fetching invoice:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchFactura();
  }, [user, loadingUser, navigate, searchParams]);

  const capturePayPalOrder = async (externalReference, token) => {
    try {
      // Obtener el order_id de la sesión (en un caso real, deberías guardarlo en la base de datos)
      const response = await fetch(`${API_URL}/paypal/capture-order/${externalReference}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ Orden PayPal capturada exitosamente');
      } else {
        console.error('❌ Error capturando orden PayPal');
      }
    } catch (error) {
      console.error('❌ Error capturando orden PayPal:', error);
    }
  };

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

  const getMetodoPagoBadge = (metodo) => {
    const variants = {
      mercadopago: 'primary',
      paypal: 'warning'
    };
    
    const textos = {
      mercadopago: 'MercadoPago',
      paypal: 'PayPal'
    };

    return (
      <Badge bg={variants[metodo] || 'secondary'} className="ms-2">
        {textos[metodo] || metodo}
      </Badge>
    );
  };

  if (loadingUser || loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="p-4">
        <Alert variant="danger">
          <h4>Error al cargar la factura</h4>
          <p>{error}</p>
        </Alert>
        <Button onClick={volverHome}>Volver al Home</Button>
      </Container>
    );
  }

  if (!factura) {
    return (
      <Container className="p-4">
        <Alert variant="info">No tienes facturas pagadas.</Alert>
        <Button onClick={volverHome}>Volver al Home</Button>
      </Container>
    );
  }

  const fechaSolo = factura.fecha ? new Date(factura.fecha).toLocaleDateString() : '';
  const numeroMostrar = factura.numero;

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      <Container className="flex-grow-1 py-4">
        <Alert variant="success" className="d-flex align-items-center">
          <i className="fas fa-check-circle me-2"></i>
          <div>
            <strong>¡Pago procesado con éxito!</strong>
            {factura.metodo_pago && getMetodoPagoBadge(factura.metodo_pago)}
          </div>
        </Alert>
        
        <div ref={facturaRef} className="p-4 bg-white text-dark rounded invoice-container">
          {/* Encabezado con logo y meta */}
          <div className="invoice-header d-flex justify-content-between align-items-center mb-4">
            <div className="company-info d-flex align-items-center">
              <img src="/img/Mangaka.png" alt="Logo" width={50} height={50} className="me-3" />
              <div>
                <h5 className="m-0">Mangaka Baka Shop</h5>
                <small className="text-muted">Tu tienda de confianza para manga</small>
              </div>
            </div>
            <div className="invoice-meta text-end">
              <p className="mb-1"><strong>Nº Factura:</strong> {numeroMostrar}</p>
              <p className="mb-0"><strong>Fecha:</strong> {fechaSolo}</p>
              {factura.metodo_pago && (
                <p className="mb-0">
                  <strong>Método:</strong> 
                  {factura.metodo_pago === 'paypal' ? ' PayPal' : ' MercadoPago'}
                </p>
              )}
            </div>
          </div>

          {/* Bloque Facturar A */}
          <div className="address-block mb-4">
            <h6 className="border-bottom pb-2">Facturar A:</h6>
            <p className="mb-0">{factura.cliente.nombre} {factura.cliente.apellido}</p>
          </div>

          {/* Tabla de detalles */}
          <Table bordered className="invoice-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th className="text-center">Cantidad</th>
                <th className="text-end">Precio Unitario</th>
                <th className="text-end">Importe</th>
              </tr>
            </thead>
            <tbody>
              {factura.detalles.map(d => (
                <tr key={d.tomo_id}>
                  <td>
                    <strong>{d.titulo}</strong>
                    <br />
                    <small className="text-muted">Tomo {d.numero_tomo}</small>
                  </td>
                  <td className="text-center">{d.cantidad}</td>
                  <td className="text-end">${(+d.precio_unitario).toFixed(2)}</td>
                  <td className="text-end">${(+d.subtotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Totales */}
          <div className="d-flex justify-content-end mt-4">
            <div className="totals-box p-3 border rounded" style={{ minWidth: '250px' }}>
              <div className="d-flex justify-content-between">
                <span>Subtotal:</span>
                <span>${(+factura.total).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Impuestos:</span>
                <span>$0.00</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-5">
                <span>Total:</span>
                <span>${(+factura.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Mensaje de agradecimiento */}
          <div className="text-center mt-4 pt-3 border-top">
            <p className="text-muted mb-0">
              <i className="fas fa-heart text-danger me-1"></i>
              Gracias por tu compra. ¡Esperamos verte pronto!
            </p>
          </div>
        </div>
      </Container>
      
      {/* Botones de acción */}
      <div className="p-3 bg-dark border-top">
        <Container className="d-flex justify-content-between align-items-center">
          <Button variant="outline-light" onClick={volverHome}>
            <i className="fas fa-home me-2"></i>
            Volver al Home
          </Button>
          <Button variant="primary" onClick={descargarComoPdf}>
            <i className="fas fa-download me-2"></i>
            Descargar PDF
          </Button>
        </Container>
      </div>
    </div>
  );
};

export default FacturasPage;