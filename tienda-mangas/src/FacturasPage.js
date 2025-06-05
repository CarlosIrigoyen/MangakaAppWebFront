// src/FacturasPage.js
import React, { useEffect, useState } from 'react';
import { Table, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const FacturasPage = () => {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const obtenerFacturas = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:8000/api/mis-facturas', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al obtener facturas');
        const datos = await res.json();
        setFacturas(datos);
      } catch (e) {
        setError(e.message);
      } finally {
        setCargando(false);
      }
    };
    obtenerFacturas();
  }, []);

  const verDetalle = (id) => navigate(`/facturas/${id}`);

  if (cargando) return <Spinner animation="border" />;
  if (error)    return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="p-4 bg-dark text-white">
      <h2>Mis Facturas</h2>
      <Table striped bordered hover variant="dark" className="mt-3">
        <thead>
          <tr>
            <th>Identificador</th>
            <th>Total</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map(f => (
            <tr key={f.id}>
              <td>{f.id}</td>
              {/* Forzamos a número antes de toFixed */}
              <td>${Number(f.total).toFixed(2)}</td>
              <td>{new Date(f.created_at).toLocaleString()}</td>
              <td>
                <Button size="sm" onClick={() => verDetalle(f.id)}>
                  Ver
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default FacturasPage;