// src/FacturasPage.js
import React, { useEffect, useState, useRef, useContext } from 'react';
import { Table, Button, Spinner, Alert, Container } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';
import './DetalleFacturaPage.css';

// Usa la variable de entorno en build time si está definida
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const FacturasPage = () => {
  const { user, loadingUser } = useContext(UserContext);
  const { clearCart } = useContext(CartContext);
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const facturaRef = useRef();
  const navigate = useNavigate();

  // destructuring para evitar el global `location` (ESLint)
  const { search } = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(search);
    const paypalOrderId = queryParams.get('token'); // PayPal devuelve ?token=<ORDER_ID>

    const procesarPago = async () => {
      if (!paypalOrderId) return;
      const token = localStorage.getItem('token');
      if (!token) {
        // si el usuario no está con token, no intentamos capturar (puede ser otro flujo)
        console.warn('No hay token en localStorage para autenticar la captura PayPal.');
        return;
      }

      const endpoints = [
        `${API_URL}/paypal/capture/${paypalOrderId}`,
        `${API_URL}/paypal/capture-order/${paypalOrderId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          // si no existe la ruta, seguimos intentando el siguiente endpoint
          if (res.status === 404) continue;

          const body = await res.json().catch(() => ({}));

          if (res.ok) {
            console.log('Pago capturado OK en:', endpoint, body);
            // evitar recapturas: borramos el token de la URL
            try {
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('token');
              window.history.replaceState({}, document.title, newUrl.toString());
            } catch (err) {
              // si falla reemplazar historial, no es crítico
            }
            return;
          } else {
            console.warn('Intento de captura falló en', endpoint, body);
            // seguimos intentando el siguiente endpoint por compatibilidad
          }
        } catch (err) {
          console.error('Error intentando capturar en', endpoint, err);
          // seguimos intentando el siguiente endpoint
        }
      }

      // Si llegamos aquí, ninguno de los endpoints pudo confirmar la captura
      setError('No se pudo confirmar el pago en el servidor. Revisa los logs del backend.');
    };

    const fetchUltimaFactura = async () => {
      if (loadingUser) return;
      if (!user) {
        navigate('/');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1) Intentar procesar captura (si el usuario viene desde PayPal)
        await procesarPago();

        // 2) Pedir la lista de facturas ya pagas
        const token = localStorage.getItem('token');
        const resList = await fetch(`${API_URL}/orders/invoices`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!resList.ok) {
          throw new Error(`HTTP ${resList.status} fetching invoices`);
        }

        const list = await resList.json();
        if (!list.length) {
          setFactura(null);
          return;
        }

        const ultima = list[0];
        const resDet = await fetch(`${API_URL}/orders/invoices/${ultima.id}`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!resDet.ok) {
          throw new Error(`HTTP ${resDet.status} fetching invoice detail`);
        }
        const data = await resDet.json();
        setFactura(data);
      } catch (e) {
        console.error(e);
        setError(typeof e === 'string' ? e : (e.message || 'Error al obtener facturas'));
      } finally {
        setLoading(false);
      }
    };

    fetchUltimaFactura();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadingUser, navigate, search]);

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
