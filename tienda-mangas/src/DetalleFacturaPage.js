// src/DetalleFacturaPage.js - VERSIÓN COMPLETA OPTIMIZADA (renderiza tabla + vista móvil)
import React, { useEffect, useState, useRef, useContext, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Alert, Button, Container, Table } from 'react-bootstrap';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';
import './DetalleFacturaPage.css';

const API_URL = 'https://mangakaappweb-production.up.railway.app/api';

// Componente FacturaTable (renderiza tabla desktop y lista móvil)
const FacturaTable = React.memo(({ detalles }) => {
  // seguridad: si detalles es null/undefined mostrar array vacío
  const items = Array.isArray(detalles) ? detalles : [];

  // console.log('FacturaTable detalles:', items); // <-- descomentar para debug

  return (
    <>
      {/* Tabla desktop (se ocultará en mobile por CSS) */}
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
          {items.map((d, idx) => (
            <tr key={d.tomo_id ?? d.id ?? idx}>
              <td>{`${d.titulo ?? d.nombre ?? ''}${d.numero_tomo ? ` – Tomo ${d.numero_tomo}` : ''}`}</td>
              <td className="text-center">{d.cantidad ?? d.qty ?? 0}</td>
              <td className="text-end">${(+ (d.precio_unitario ?? d.precio ?? 0)).toFixed(2)}</td>
              <td className="text-end">${(+ (d.subtotal ?? ((d.cantidad ?? 0) * (d.precio_unitario ?? d.precio ?? 0)))).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Lista móvil (se mostrará en móvil por CSS) */}
      <div className="productos-mobile">
        {items.map((d, idx) => (
          <div key={d.tomo_id ?? d.id ?? idx} className="product-row">
            <div className="product-title-small">
              {`${d.titulo ?? d.nombre ?? 'Producto'}${d.numero_tomo ? ` – Tomo ${d.numero_tomo}` : ''}`}
            </div>
            <div className="product-details small text-muted">
              Cantidad: {d.cantidad ?? d.qty ?? 0}
            </div>
            <div className="price-row">
              <div className="product-prices">Precio: ${(+ (d.precio_unitario ?? d.precio ?? 0)).toFixed(2)}</div>
              <div className="product-prices">Importe: ${(+ (d.subtotal ?? ((d.cantidad ?? 0) * (d.precio_unitario ?? d.precio ?? 0)))).toFixed(2)}</div>
            </div>
          </div>
        ))}

        {/* fallback si no hay items */}
        {items.length === 0 && (
          <div className="product-row">
            <div className="product-title-small text-muted">No hay productos.</div>
          </div>
        )}
      </div>
    </>
  );
});

// Componente memoizado para el header (sin icono)
const FacturaHeader = React.memo(({ numeroMostrar, fechaSolo }) => {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4 invoice-header-compact">
      <div className="d-flex align-items-center company-info">
        {/* Icono eliminado: sólo nombre de la tienda */}
        <h4 className="mb-0 text-primary">Mangaka Baka Shop</h4>
      </div>
      <div className="text-end invoice-meta">
        <h6 className="mb-1 fw-bold">FACTURA</h6>
        <p className="mb-1"><strong>Nº:</strong> {numeroMostrar}</p>
        <p className="mb-0"><strong>Fecha:</strong> {fechaSolo}</p>
      </div>
    </div>
  );
});

// Componente memoizado para el cliente
const ClienteInfo = React.memo(({ factura }) => {
  return (
    <div className="mb-4 address-block">
      <h6 className="mb-2">FACTURAR A:</h6>
      <p className="mb-0">
        {factura.cliente?.nombre ?? ''} {factura.cliente?.apellido ?? ''}
      </p>
    </div>
  );
});

// Componente memoizado para el total
const TotalSection = React.memo(({ total }) => {
  return (
    <div className="d-flex justify-content-end mt-3">
      <div className="total-final p-3 bg-light rounded" style={{ width: 240 }}>
        <div className="d-flex justify-content-between fw-bold">
          <span>Total</span>
          <span>${(+total).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
});

const DetalleFacturaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loadingUser } = useContext(UserContext);
  const { clearCart } = useContext(CartContext);
  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const facturaRef = useRef();

  // Preload de imagen crítica (mantengo preload en caso de usarla)
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = '/img/Mangaka.webp';
    link.as = 'image';
    document.head.appendChild(link);

    return () => {
      try { document.head.removeChild(link); } catch {}
    };
  }, []);

  // Fetch de factura con useCallback
  const fetchFactura = useCallback(async () => {
    if (loadingUser) return;
    if (!user) {
      navigate('/');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(`${API_URL}/orders/invoices/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFactura(data);

      // console.log('fetchFactura detalles:', data?.detalles); // <-- descomentar para debug
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('La solicitud tardó demasiado tiempo');
      } else {
        setError(e.message || 'Error desconocido');
      }
    } finally {
      setLoading(false);
    }
  }, [id, user, loadingUser, navigate]);

  useEffect(() => {
    fetchFactura();
  }, [fetchFactura]);

  // Lazy load de librerías PDF solo cuando se necesiten
  const descargarComoPdf = useCallback(async () => {
    try {
      // Dynamic imports para reducir bundle inicial
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const html2canvas = html2canvasModule.default ?? html2canvasModule;
      const jsPDF = jsPDFModule.default ?? jsPDFModule;

      const element = facturaRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png', 0.9);
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      const numeroDigitos = (factura?.numero ?? '').toString().replace(/\D/g, '').slice(0, 6) || id;
      pdf.save(`Factura-${numeroDigitos}.pdf`);
    } catch (err) {
      // no mostrar error técnico al usuario, solo aviso amigable
      // eslint-disable-next-line no-alert
      alert('Error al generar el PDF. Intenta nuevamente.');
      // console.error('Error generar PDF', err);
    }
  }, [factura, id]);

  const volverHome = useCallback(() => {
    clearCart();
    navigate('/');
  }, [clearCart, navigate]);

  // Memoizar cálculos costosos
  const { fechaSolo, numeroMostrar } = useMemo(() => {
    if (!factura) return { fechaSolo: '', numeroMostrar: '' };

    const fechaSolo = factura.fecha ? new Date(factura.fecha).toLocaleDateString() : '';
    const numeroMostrar = String(factura.numero ?? factura.id ?? '').replace(/\D/g, '').slice(0, 6);

    return { fechaSolo, numeroMostrar };
  }, [factura]);

  // Estados de carga
  if (loadingUser || loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="p-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          {error}
        </Alert>
        <Button variant="secondary" className="mt-3" onClick={volverHome}>
          Volver al Home
        </Button>
      </Container>
    );
  }

  if (!factura) {
    return (
      <Container className="p-4">
        <Alert variant="warning">
          <Alert.Heading>Factura no encontrada</Alert.Heading>
          La factura solicitada no existe o no tienes permisos para verla.
        </Alert>
        <Button variant="secondary" className="mt-3" onClick={volverHome}>
          Volver al Home
        </Button>
      </Container>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      <div className="container flex-grow-1 d-flex flex-column py-4">
        <div ref={facturaRef} className="p-4 bg-white text-dark rounded invoice-container">
          <FacturaHeader numeroMostrar={numeroMostrar} fechaSolo={fechaSolo} />

          <ClienteInfo factura={factura} />

          <FacturaTable detalles={factura.detalles ?? factura.items ?? []} />

          <TotalSection total={factura.total ?? factura.monto_total ?? 0} />
        </div>
      </div>

      <div className="p-3 bg-dark text-end botones-factura">
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

export default React.memo(DetalleFacturaPage);
