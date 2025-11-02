import React, { useContext, useRef, useEffect } from 'react';
import { Card, Button, Pagination } from 'react-bootstrap';
import { FaShoppingCart, FaInfoCircle } from 'react-icons/fa';
import { CartContext } from './CartContext';

const TomoList = ({ tomos, pagination, onPageChange, onShowInfo, isLoggedIn }) => {
  const { cart, addToCart } = useContext(CartContext);
  const data = tomos.data ? tomos.data : tomos;
  
  // Ref para el contenedor principal que usaremos para el scroll
  const containerRef = useRef(null);

  // Efecto para hacer scroll al inicio cuando cambia la página
  useEffect(() => {
    if (containerRef.current) {
      // Hacemos scroll suave al inicio del contenedor
      containerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [pagination?.currentPage]); // Se ejecuta cuando cambia la página actual

  if (!data.length) {
    return (
      <p className="text-white text-center my-4">
        No se encontraron resultados para los filtros seleccionados.
      </p>
    );
  }

  // 🔹 Función auxiliar para calcular las páginas visibles
  const renderPaginationItems = () => {
    const total = pagination.lastPage;
    const current = pagination.currentPage;
    const pages = [];

    // Mostrar máximo 4 páginas visibles + primera + última si aplica
    const visiblePages = 4;

    let start = Math.max(1, current - Math.floor(visiblePages / 2));
    let end = start + visiblePages - 1;

    if (end > total) {
      end = total;
      start = Math.max(1, end - visiblePages + 1);
    }

    // Primera página
    if (start > 1) {
      pages.push(
        <Pagination.Item key={1} onClick={() => onPageChange(1)} className="border border-light">
          1
        </Pagination.Item>
      );
      if (start > 2) {
        pages.push(<Pagination.Ellipsis key="start-ellipsis" disabled className="text-white" />);
      }
    }

    // Páginas visibles intermedias
    for (let i = start; i <= end; i++) {
      pages.push(
        <Pagination.Item
          key={i}
          active={i === current}
          onClick={() => onPageChange(i)}
          className="border border-light"
        >
          {i}
        </Pagination.Item>
      );
    }

    // Última página
    if (end < total) {
      if (end < total - 1) {
        pages.push(<Pagination.Ellipsis key="end-ellipsis" disabled className="text-white" />);
      }
      pages.push(
        <Pagination.Item key={total} onClick={() => onPageChange(total)} className="border border-light">
          {total}
        </Pagination.Item>
      );
    }

    return pages;
  };

  // Función personalizada para manejar el cambio de página con scroll
  const handlePageChangeWithScroll = (page) => {
    onPageChange(page);
    // El useEffect se encargará del scroll automáticamente
  };

  return (
    <div ref={containerRef} className="container my-4">
      <Card className="shadow-sm rounded mb-4">
        <Card.Header className="bg-dark text-white">Lista de Tomos</Card.Header>
        <Card.Body className="p-3 bg-dark">
          <div className="row">
            {data.map((tomo) => {
              const isInCart = cart.some((item) => item.id === tomo.id);
              return (
                <div
                  key={tomo.id}
                  className="col-md-3 mb-4 d-flex"
                  style={{ minWidth: 0 }}
                >
                  <Card
                    className="w-100 h-100 shadow-sm text-white bg-secondary border border-light"
                    style={{ minWidth: 0 }}
                  >
                    <Card.Img
                      variant="top"
                      src={tomo.portada}
                      alt={`${tomo.manga?.titulo} Tomo ${tomo.numero_tomo}`}
                      style={{ objectFit: 'cover', height: '200px' }}
                    />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title>
                        {tomo.manga?.titulo} Tomo {tomo.numero_tomo} — {tomo.idioma}
                      </Card.Title>
                      <Card.Text>Precio: ${parseFloat(tomo.precio).toFixed(0)}</Card.Text>
                      <Card.Text>Stock: {tomo.stock}</Card.Text>
                      <div className="mt-auto d-flex justify-content-center flex-wrap gap-2">
                        {isLoggedIn && (
                          <Button
                            variant="primary"
                            onClick={() => addToCart(tomo)}
                            disabled={isInCart}
                          >
                            <FaShoppingCart /> Agrega al Carrito
                          </Button>
                        )}
                        <Button variant="info" onClick={() => onShowInfo(tomo)}>
                          <FaInfoCircle /> Info
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>

      {pagination && (
        <Card className="shadow-sm rounded border border-light">
          <Card.Body className="d-flex justify-content-center py-3 bg-dark">
            <Pagination className="mb-0">
              {/* 🔹 Botón Anterior (sin texto) */}
              <Pagination.Prev
                onClick={() => handlePageChangeWithScroll(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="border border-light"
              />

              {renderPaginationItems()}

              {/* 🔹 Botón Siguiente (sin texto) */}
              <Pagination.Next
                onClick={() => handlePageChangeWithScroll(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.lastPage}
                className="border border-light"
              />
            </Pagination>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default TomoList;
