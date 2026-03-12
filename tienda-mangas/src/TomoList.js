import React, { useContext, useEffect, memo, useCallback } from 'react';
import { Card, Button, Pagination, Badge } from 'react-bootstrap';
import { CartContext } from './CartContext';
import LCPImage from './components/LCPImage';
import { ShoppingCartIcon, InfoIcon } from './components/Icons';

// Componente de paginación memoizado
const PaginationComponent = memo(({ pagination, onPageChange }) => {
  const renderPaginationItems = useCallback(() => {
    const total = pagination.lastPage;
    const current = pagination.currentPage;
    const pages = [];
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
  }, [pagination, onPageChange]);

  if (!pagination || pagination.lastPage <= 1) return null;

  return (
    <Card className="shadow-sm rounded border border-light mt-4">
      <Card.Body className="d-flex justify-content-center py-3 bg-dark">
        <Pagination className="mb-0">
          <Pagination.Prev
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="border border-light"
          />
          {renderPaginationItems()}
          <Pagination.Next
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.lastPage}
            className="border border-light"
          />
        </Pagination>
      </Card.Body>
    </Card>
  );
});

// Componente individual de tomo memoizado
const TomoCard = memo(({ tomo, index, onShowInfo, onAddToCart, isInCart, isLoggedIn }) => {
  const handleAddToCart = useCallback(() => {
    if (Number(tomo.stock) === 0) return; // prevención extra en cliente
    onAddToCart(tomo);
  }, [onAddToCart, tomo]);

  const handleShowInfo = useCallback(() => {
    onShowInfo(tomo);
  }, [onShowInfo, tomo]);

  const isOutOfStock = Number(tomo.stock) === 0;

  // Botón de añadir al carrito — lo definimos pero lo mostramos sólo si hay stock y el usuario está logueado
  const AddButton = (
    <Button
      variant={isInCart ? 'success' : 'primary'}
      size="sm"
      onClick={handleAddToCart}
      disabled={isInCart}
      aria-label={isInCart ? 'En carrito' : 'Agregar al carrito'}
    >
      <ShoppingCartIcon /> {isInCart ? 'En Carrito' : 'Agregar'}
    </Button>
  );

  return (
    <div className="col-md-3 mb-4 d-flex">
      <Card
        className="w-100 h-100 shadow-sm text-white bg-secondary border border-light position-relative"
        style={{ minWidth: 0 }}
      >
        {/* Badge 'Agotado' si stock 0 (queda como indicador, no es botón) */}
        {isOutOfStock && (
          <Badge
            bg="danger"
            className="position-absolute"
            style={{ right: '0.75rem', top: '0.75rem', zIndex: 5 }}
          >
            Agotado
          </Badge>
        )}

        {/* IMAGEN OPTIMIZADA CON LCP - SOLO LA PRIMERA ES CRÍTICA */}
        <LCPImage
          src={tomo.portada}
          alt={`${tomo.manga?.titulo} Tomo ${tomo.numero_tomo}`}
          width={400}
          height={200}
          isLCP={index === 0} // SOLO la primera imagen es LCP candidate
          priority={index === 0} // SOLO la primera imagen carga con máxima prioridad
          className="card-img-top"
        />

        <Card.Body className="d-flex flex-column">
          <Card.Title className="h6">
            {tomo.manga?.titulo} Tomo {tomo.numero_tomo} — {tomo.idioma}
          </Card.Title>
          <Card.Text className="mb-1">Precio: ${parseFloat(tomo.precio).toFixed(0)}</Card.Text>
          <Card.Text className="mb-2">Stock: {tomo.stock}</Card.Text>
          <div className="mt-auto d-flex justify-content-center flex-wrap gap-2">
            {/* Mostrar el botón de añadir sólo si el usuario está logueado y hay stock */}
            {isLoggedIn && !isOutOfStock && AddButton}

            {/* El botón de Info siempre se muestra */}
            <Button variant="info" size="sm" onClick={handleShowInfo}>
              <InfoIcon /> Info
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
});

// Componente principal TomoList
const TomoList = ({ tomos, pagination, onPageChange, onShowInfo, isLoggedIn }) => {
  const { cart, addToCart } = useContext(CartContext);
  const data = tomos.data ? tomos.data : tomos;

  // Scroll suave al cambiar de página
  useEffect(() => {
    if (pagination?.currentPage) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [pagination?.currentPage]);

  const handleAddToCart = useCallback((tomo) => {
    // prev: no agregamos si stock 0
    if (Number(tomo.stock) === 0) return;
    addToCart(tomo);
  }, [addToCart]);

  if (!data.length) {
    return (
      <div className="text-center my-5">
        <p className="text-white">
          No se encontraron resultados para los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <Card className="shadow-sm rounded mb-4">
        <Card.Header className="bg-dark text-white">
          <div className="d-flex justify-content-between align-items-center">
            <span>Lista de Tomos</span>
            {pagination && (
              <small className="text-muted">
                Página {pagination.currentPage} de {pagination.lastPage} 
                ({pagination.total} total)
              </small>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-3 bg-dark">
          <div className="row">
            {data.map((tomo, index) => (
              <TomoCard
                key={tomo.id}
                tomo={tomo}
                index={index}
                onShowInfo={onShowInfo}
                onAddToCart={handleAddToCart}
                isInCart={cart.some(item => item.id === tomo.id)}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        </Card.Body>
      </Card>

      <PaginationComponent 
        pagination={pagination} 
        onPageChange={onPageChange} 
      />
    </div>
  );
};

export default memo(TomoList);
