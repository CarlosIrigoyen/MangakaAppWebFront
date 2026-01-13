import React, { useEffect, useState, useRef, useContext, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, Alert, Button, Container, Table } from 'react-bootstrap';
import { UserContext } from './UserContext';
import { CartContext } from './CartContext';
import './DetalleFacturaPage.css';

const API_URL = 'https://mangakaappweb-production.up.railway.app/api';

/**
 * findItems: intenta localizar un array de items/productos dentro del objeto factura
 * (busca en campos comunes: detalles, items, line_items, etc.)
 */
function findItems(factura) {
  if (!factura || typeof factura !== 'object') return [];
  const keysToCheck = ['detalles', 'items', 'line_items', 'order_lines', 'productos', 'products'];
  for (const k of keysToCheck) {
    if (Array.isArray(factura[k])) return factura[k];
  }
  // buscar en objetos habituales (data, order, payload)
  const parents = ['data', 'order', 'payload', 'invoice', 'result'];
  for (const p of parents) {
    const obj = factura[p];
    if (obj && typeof obj === 'object') {
      for (const k2 of Object.keys(obj)) {
        if (Array.isArray(obj[k2])) return obj[k2];
      }
    }
  }
  // último recurso: buscar primer array en primer nivel
  for (const k of Object.keys(factura || {})) {
    if (Array.isArray(factura[k])) return factura[k];
  }
  return [];
}

// Renderiza tabla (desktop) + lista apilada (mobile)
const FacturaTable = React.memo(({ items = [] }) => {
  const rows = Array.isArray(items) ? items : [];

  return (
    <>
      {/* TABLA para desktop - CSS controla visibilidad en mobile */}
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

      {/* LISTA apilada para mobile — sin cards, sólo filas apiladas que usan tus clases CSS */}
      <div className="productos-mobile" aria-hidden={rows.length === 0 ? 'false' : 'false'}>
        {rows.map((d, idx) => (
          <div key={d.tomo_id ?? d.id ?? idx} className="product-row">
            <div className="product-title-small">
              {`${d.titulo ?? d.nombre ?? d.title ?? 'Producto'}${d.numero_tomo ? ` – Tomo ${d.numero_tomo}` : ''}`}
            </div>
            <div className="product-details small text-muted">
              Cantidad: {d.cantidad ?? d.qty ?? d.quantity ?? 0}
            </div>
            <div className="price-row">
              <div className="product-prices">Precio: ${(+ (d.precio_unitario ?? d.precio ?? d.price ?? 0)).toFixed(2)}</div>
              <div className="product-prices">Importe: ${(+ (d.subtotal ?? d.total ?? ((d.cantidad ?? 0) * (d.precio_unitario ?? d.precio ?? d.price ?? 0)))).toFixed(2)}</div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="product-row">
            <div className="product-title-small text-muted">No hay productos.</div>
          </div>
        )}
      </div>
    </>
  );
});

const FacturaHeader = React.memo(({ numeroMostrar, fechaSolo }) => (
  <div className="d-flex justify-content-between align-items-center mb-4 invoice-header-compact">
    <div className="d-flex align-items-center company-info">
      {/* imagen eliminada intencionalmente — solo queda el nombre */}
      <h4 className="mb-0 text-primary">Mangaka Baka Shop</h4>
    </div>
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
  const facturaRef = useRef();

  // Preload imagen (optimización)
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = '/img/Mangaka.webp';
    link.as = 'image';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

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

  /**
   * Descargar PDF:
   * - Si estamos en móvil (<= MOBILE_MAX), aplicamos meta viewport y clase .mobile-zoom-50,
   *   forzamos repaint, capturamos y luego restauramos.
   * - En desktop capturamos directamente.
   */
  const descargarComoPdf = useCallback(async () => {
    const MOBILE_MAX = 767.98;
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX;

    const element = facturaRef.current;
    if (!element) return;

    // Helpers para meta viewport
    const metaSelector = 'meta[name="viewport"]';
    const ensureMeta = () => {
      let m = document.querySelector(metaSelector);
      let created = false;
      if (!m) {
        m = document.createElement('meta');
        m.name = 'viewport';
        document.head.appendChild(m);
        created = true;
      }
      return { meta: m, created };
    };

    let previousViewportContent = null;
    let createdViewportMeta = false;

    try {
      // Si es móvil: aplicar zoom out (meta + clase)
      if (isMobile) {
        const { meta, created } = ensureMeta();
        createdViewportMeta = created;
        previousViewportContent = meta.getAttribute('content') || '';
        meta.setAttribute('content', 'width=device-width, initial-scale=0.5, maximum-scale=1');

        if (!element.classList.contains('mobile-zoom-50')) {
          element.classList.add('mobile-zoom-50');
        }

        // Forzar repintado breve para que el DOM se renderice con la escala aplicada
        await new Promise(resolve => requestAnimationFrame(resolve));
        // un pequeño timeout adicional para asegurar que fonts/imagenes se re-rendericen
        await new Promise(resolve => setTimeout(resolve, 120));
      }

      // Import dinámico de html2canvas y jspdf
      const [html2canvasModule, jsPDFModule] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const html2canvas = html2canvasModule.default ?? html2canvasModule;
      const jsPDF = jsPDFModule.default ?? jsPDFModule;

      // Captura: mantener scale alto para mejor resolución
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png', 0.9);
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth(); const margin = 40;
      const imgWidth = pageWidth - margin * 2; const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      const numeroDigitos = (factura?.numero ?? '').toString().replace(/\D/g, '').slice(0, 6) || id;
      pdf.save(`Factura-${numeroDigitos}.pdf`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error al generar PDF:', err);
      // eslint-disable-next-line no-alert
      alert('Error al generar el PDF. Intenta nuevamente.');
    } finally {
      // Restaurar viewport y clase si aplicamos zoom
      if (isMobile) {
        const meta = document.querySelector(metaSelector);
        if (meta) {
          if (previousViewportContent !== null && previousViewportContent !== undefined && previousViewportContent !== '') {
            meta.setAttribute('content', previousViewportContent);
          } else if (createdViewportMeta) {
            // eliminamos el meta si lo creamos y no había contenido previo
            try { meta.parentNode.removeChild(meta); } catch {}
          } else {
            meta.setAttribute('content', 'width=device-width, initial-scale=1');
          }
        }

        if (element.classList.contains('mobile-zoom-50')) {
          element.classList.remove('mobile-zoom-50');
        }

        // Forzar repintado para restauración visual
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
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

          <h6 className="mb-2">Productos</h6>

          <FacturaTable items={items} />

          <TotalSection total={factura.total ?? factura.monto_total ?? 0} />
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

