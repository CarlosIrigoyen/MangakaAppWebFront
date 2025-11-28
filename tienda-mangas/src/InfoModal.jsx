import React from 'react';
import { Modal, Card, Button } from 'react-bootstrap';

function InfoModal({ show, onClose, tomo }) {
  return (
    <Modal
      show={show}
      onHide={onClose}
      aria-labelledby="infoTomoTitle"
      aria-describedby="infoTomoDescripcion"
      centered
    >
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title id="infoTomoTitle">
          Información del Tomo
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-dark text-white" id="infoTomoDescripcion">
        {tomo && (
          <Card bg="dark" text="white">
            <Card.Img
              variant="top"
              src={tomo.portada}
              alt={`Portada del tomo ${tomo.nombre}`}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '300px',
                objectFit: 'contain'
              }}
            />

            <Card.Body>
              <Card.Title>{tomo.nombre}</Card.Title>
              <Card.Text as="div">
                <p><strong>Título:</strong> {tomo.manga.titulo}</p>
                <p><strong>Número de Tomo:</strong> {tomo.numero_tomo || 'No disponible'}</p>
                <p><strong>Editorial:</strong> {tomo.editorial?.nombre || 'No disponible'}</p>
                <p><strong>Formato:</strong> {tomo.formato || 'Tankōbon'}</p>
                <p><strong>Idioma:</strong> {tomo.idioma || 'No disponible'}</p>
                <p><strong>Precio:</strong> ${Number(tomo.precio).toFixed(0)}</p>
                <p>
                  <strong>Autor:</strong>{' '}
                  {tomo.manga?.autor
                    ? `${tomo.manga.autor.nombre} ${tomo.manga.autor.apellido}`
                    : 'No disponible'}
                </p>
                <p>
                  <strong>Dibujante:</strong>{' '}
                  {tomo.manga?.dibujante
                    ? `${tomo.manga.dibujante.nombre} ${tomo.manga.dibujante.apellido}`
                    : tomo.manga?.autor
                    ? `${tomo.manga.autor.nombre} ${tomo.manga.autor.apellido}`
                    : 'No disponible'}
                </p>
                <p>
                  <strong>Géneros:</strong>{' '}
                  {tomo.manga?.generos?.length
                    ? tomo.manga.generos.map(g => g.nombre).join(', ')
                    : 'No disponible'}
                </p>
              </Card.Text>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-dark text-white">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default InfoModal;

