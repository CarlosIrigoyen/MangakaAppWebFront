import React from 'react';
import { Modal, Card, Button } from 'react-bootstrap';

function InfoModal({ show, onClose, tomo }) {
  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton className="bg-dark text-white">
        <Modal.Title>Información del Tomo</Modal.Title>
      </Modal.Header>

      <Modal.Body className="bg-dark text-white">
        {tomo && (
          <Card bg="dark" text="white">
            <Card.Img
              variant="top"
              src={tomo.portada} // URL completa de Cloudinary
              alt={tomo.nombre}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '300px',
                objectFit: 'contain',
              }}
            />

            <Card.Body>
              <Card.Title>{tomo.nombre}</Card.Title>
              <Card.Text>
                <strong>Número de Tomo:</strong> {tomo.numero_tomo || 'No disponible'}<br />
                <strong>Editorial:</strong> {tomo.editorial?.nombre || 'No disponible'}<br />
                <strong>Formato:</strong> {tomo.formato || 'Tankōbon'}<br />
                <strong>Idioma:</strong> {tomo.idioma || 'No disponible'}<br />
                <strong>Precio:</strong> ${Number(tomo.precio).toFixed(0)}<br />
                <strong>Autor:</strong>{' '}
                {tomo.manga?.autor
                  ? `${tomo.manga.autor.nombre} ${tomo.manga.autor.apellido}`
                  : 'No disponible'}<br />
                <strong>Dibujante:</strong>{' '}
                {tomo.manga?.dibujante
                  ? `${tomo.manga.dibujante.nombre} ${tomo.manga.dibujante.apellido}`
                  : tomo.manga?.autor
                  ? `${tomo.manga.autor.nombre} ${tomo.manga.autor.apellido}`
                  : 'No disponible'}<br />
                <strong>Géneros:</strong>{' '}
                {tomo.manga?.generos && tomo.manga.generos.length
                  ? tomo.manga.generos.map(g => g.nombre).join(', ')
                  : 'No disponible'}
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
