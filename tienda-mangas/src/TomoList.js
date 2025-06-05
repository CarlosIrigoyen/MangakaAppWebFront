import React, { useContext } from 'react';
import { Card, Button, Pagination } from 'react-bootstrap';
import { FaShoppingCart, FaInfoCircle } from 'react-icons/fa';
import { CartContext } from './CartContext';

const TomoList = ({ tomos, pagination, onPageChange, onShowInfo, isLoggedIn }) => {
  const { cart, addToCart } = useContext(CartContext);
  const data = tomos.data ? tomos.data : tomos;

  if (!data.length) {
    return (
      <p className="text-white text-center my-4">
        No se encontraron resultados para los filtros seleccionados.
      </p>
    );
  }

  return (
    <div className="container my-4">
      <Card className="shadow-sm rounded mb-4">
        <Card.Header className="bg-dark text-white">Lista de Tomos</Card.Header>
        <Card.Body className="p-3 bg-dark">
          <div className="row">
            {data.map((tomo) => {
              const isInCart = cart.some((item) => item.id === tomo.id);
              return (
                // añadimos style minWidth: 0 para que este flex-item pueda encoger
                <div
                  key={tomo.id}
                  className="col-md-3 mb-4 d-flex"
                  style={{ minWidth: 0 }}
                >
                  <Card
                    className="w-100 h-100 shadow-sm text-white bg-secondary border border-light"
                    // también puede ir aquí el minWidth si prefieres
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
                      <Card.Text>
                        Precio: ${parseFloat(tomo.precio).toFixed(0)}
                      </Card.Text>
                      {/* aquí permitimos wrap y un pequeño gap para que los botones bajen de línea */}
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
              {[...Array(pagination.lastPage)].map((_, i) => (
                <Pagination.Item
                  key={i + 1}
                  active={i + 1 === pagination.currentPage}
                  onClick={() => onPageChange(i + 1)}
                  className="border border-light"
                >
                  {i + 1}
                </Pagination.Item>
              ))}
            </Pagination>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default TomoList;