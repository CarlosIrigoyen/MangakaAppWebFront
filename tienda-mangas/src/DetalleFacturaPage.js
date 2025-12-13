// src/DetalleFacturaPage.js - Versión final corregida
import React, { useEffect, useState, useRef, useContext, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Alert, Button, Container, Table, Collapse } from 'react-bootstrap';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';
import './DetalleFacturaPage.css';

const API_URL = 'https://mangakaappweb-production.up.railway.app/api';

// busca arrays plausibles dentro del objeto factura
function findItems(factura) {
  if (!factura || typeof factura !== 'object') return null;
  const candidates = [];

  ['detalles', 'items', 'line_items', 'order_lines', 'productos', 'products'].forEach(k => {
    if (Array.isArray(factura[k])) candidates.push(factura[k]);
  });

  ['data', 'order', 'payload', 'invoice', 'result'].forEach(parentKey => {
    const parent = factura[parentKey];
    if (parent && typeof parent === 'object') {
      Object.keys(parent).forEach(k => {
        if (Array.isArray(parent[k])) candidates.push(parent[k]);
      });
    }
  });

  Object.keys(factura).forEach(k => {
    const v = factura[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.keys(v).forEach(k2 => { if (Array.isArray(v[k2])) candidates.push(v[k2]); });
    }
  });

  const plausible = candidates.filter(arr => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const sample = arr[0];
    if (typeof sample !== 'object') return false;
    const keys = Object.keys(sample).map(s => s.toLowerCase());
    const hasName = keys.some(k => k.includes('titulo') || k.includes('nombre') || k.includes('title') || k.includes('description') || k.includes('producto'));
    const hasQty = keys.some(k => k.includes('cant') || k.includes('qty') || k.includes('quantity'));
    const hasPrice = keys.some(k => k.includes('precio') || k.includes('price') || k.includes('unit') || k.includes('subtotal'));
    return hasName || hasQty || hasPrice;
  });

  if (plausible.length > 0) return plausible[0];
  if (candidates.length > 0) return candidates[0];
  return null;
}

const FacturaTable = React.memo(({ items = [] }) => {
  const rows = Array.isArray(items) ? items : [];

  return (
    <>
      {/* Tabla desktop - se oculta en móvil con CSS */}
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
          {rows.map((d, idx) => (
            <tr key={d.tomo_id ?? d.id ?? idx}>
              <td>{`${d.titulo ?? d.nombre ?? d.title ?? ''}${d.numero_tomo ? ` – Tomo ${d.numero_tomo}` : ''}`}</td>
              <td className="text-center">{d.cantidad ?? d.qty ?? d.quantity ?? 0}</td>
              <td className="text-end">${(+ (d.precio_unitario ?? d.precio ?? d.price ?? 0)).toFixed(2)}</td>
              <td className="text-end">${(+ (d.subtotal ?? d.total ?? ((d.cantidad ?? 0) * (d.precio_unitario ?? d.precio ?? d.price ?? 0)))).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Lista móvil - se muestra solo en móvil con CSS */}
      <div className="productos-mobile">
        {rows.map((d, idx) => (
          <div key={d.tomo_id ?? d.id ?? idx} className="product-row">
            <div className="product-title-small">
              {`${d.titulo ?? d.nombre ?? d.title ?? 'Producto'}${d.numero_tomo ? ` – Tomo ${d.numero_tomo}` : ''}`}
            </div>
            <div className="product-details small text-muted">
              Cantidad: {d.cantidad ?? d.qty ?? d.quantity ?? 0}
            </div>
            <div className="price-row">
              <div className="product-prices">
                Precio: ${(+ (d.precio_unitario ?? d.precio ?? d.price ?? 0)).toFixed(2)}
              </div>
              <div className="product-prices">
                Importe: ${(+ (d.subtotal ?? d.total ?? ((d.cantidad ?? 0) * (d.precio_unitario ?? d.precio ?? d.price ?? 0)))).toFixed(2)}
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="product-row text-center py-4">
            <div className="product-title-small text-muted">
              No hay productos en esta factura.
            </div>
          </div>
        )}
      </div>
    </>
  );
});

const FacturaHeader = React.memo(({ numeroMostrar, fechaSolo }) => (
  <div className="d-flex justify-content-between align-items-center mb-4 invoice-header-compact">
    <div className="d-flex align-items-center company-info"><h4 className="mb-0 text-primary">Mangaka Baka Shop</h4></div>
    <div className="text-end invoice-meta">
      <h6 className="mb-1 fw-bold">FACTURA</h6>
      <p className="mb-1"><strong>Nº:</strong> {numeroMostrar}</p>
      <p className="mb-0"><strong>Fecha:</strong> {fechaSolo}</p>
    </div>
  </div>
));

const ClienteInfo = React.memo(({ factura }) => (
  <div className="mb-4 address-block">
    <h6 className="mb-2">FACTURAR A:</h6>
    <p className="mb-0">{factura.cliente?.nombre ?? ''} {factura.cliente?.apellido ?? ''}</p>
  </div>
));

const TotalSection = React.memo(({ total }) => (
  <div className="d-flex justify-content-end mt-3">
    <div className="total-final p-3 bg-light rounded" style={{ width: 240 }}>
      <div className="d-flex justify-content-between fw-bold"><span>Total</span><span>${(+total).toFixed(2)}</span></div>
    </div>
  </div>
));

const DetalleFacturaPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loadingUser } = useContext(UserContext);
  const { clearCart } = useContext(CartContext);

  const [factura, setFactura] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const facturaRef = useRef();

  const fetchFactura = useCallback(async () => {
    if (loadingUser) return;
    if (!user) { navigate('/'); return; }
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_URL}/orders/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFactura(data);
    } catch (e) {
      if (e.name === 'AbortError') setError('La solicitud tardó demasiado tiempo');
      else setError(e.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [id, user, loadingUser, navigate]);

  useEffect(() => { fetchFactura(); }, [fetchFactura]);

  const descargarComoPdf = useCallback(async () => {
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const html2canvas = html2canvasModule.default ?? html2canvasModule;
      const jsPDF = jsPDFModule.default ?? jsPDFModule;
      const element = facturaRef.current;
      if (!element) return;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png', 0.9);
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth(); const margin = 40;
      const imgWidth = pageWidth - margin * 2; const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      const numeroDigitos = (factura?.numero ?? '').toString().replace(/\D/g, '').slice(0, 6) || id;
      pdf.save(`Factura-${numeroDigitos}.pdf`);
    } catch {
      alert('Error al generar el PDF. Intenta nuevamente.');
    }
  }, [factura, id]);

  const volverHome = useCallback(() => { clearCart(); navigate('/'); }, [clearCart, navigate]);

  const { fechaSolo, numeroMostrar } = useMemo(() => {
    if (!factura) return { fechaSolo: '', numeroMostrar: '' };
    const fechaSolo = factura.fecha ? new Date(factura.fecha).toLocaleDateString() : '';
    const numeroMostrar = String(factura.numero ?? factura.id ?? '').replace(/\D/g, '').slice(0, 6);
    return { fechaSolo, numeroMostrar };
  }, [factura]);

  const items = useMemo(() => findItems(factura) ?? [], [factura]);

  if (loadingUser || loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status"><span className="visually-hidden">Cargando...</span></Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="p-4">
        <Alert variant="danger"><Alert.Heading>Error</Alert.Heading>{error}</Alert>
        <Button variant="secondary" className="mt-3" onClick={volverHome}>Volver al Home</Button>
      </Container>
    );
  }

  if (!factura) {
    return (
      <Container className="p-4">
        <Alert variant="warning"><Alert.Heading>Factura no encontrada</Alert.Heading>
          La factura solicitada no existe o no tienes permisos para verla.
        </Alert>
        <Button variant="secondary" className="mt-3" onClick={volverHome}>Volver al Home</Button>
      </Container>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-white">
      <div className="container flex-grow-1 d-flex flex-column py-4">
        <div ref={facturaRef} className="p-4 bg-white text-dark rounded invoice-container">
          <FacturaHeader numeroMostrar={numeroMostrar} fechaSolo={fechaSolo} />
          <ClienteInfo factura={factura} />

          <div className="mb-2 d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Productos</h6>
            <Button variant="link" size="sm" onClick={() => setDebugOpen(open => !open)}>
              {debugOpen ? 'Ocultar datos raw' : 'Mostrar datos raw'}
            </Button>
          </div>

          {/* Tabla / Lista controlada por CSS */}
          <FacturaTable items={items} />

          <Collapse in={debugOpen}>
            <div className="p-2" style={{ background: '#f8f9fa', color: '#222', borderRadius: 6, overflow: 'auto', maxHeight: 260 }}>
              <strong>Items encontrados:</strong> {Array.isArray(items) ? items.length : 0}
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 8 }}>{JSON.stringify(factura, null, 2)}</pre>
            </div>
          </Collapse>

          <TotalSection total={factura.total ?? factura.monto_total ?? 0} />
          
          {/* Debug info */}
          <div className="mt-3 p-2 bg-warning bg-opacity-10 rounded">
            <small className="text-muted">
              Debug: {items.length} productos encontrados
            </small>
          </div>
        </div>
      </div>

      <div className="p-3 bg-dark text-end botones-factura">
        <Button variant="secondary" className="me-2" onClick={volverHome}>Volver al Home</Button>
        <Button variant="primary" onClick={descargarComoPdf}>Descargar Factura (PDF)</Button>
      </div>
    </div>
  );
};

export default React.memo(DetalleFacturaPage);