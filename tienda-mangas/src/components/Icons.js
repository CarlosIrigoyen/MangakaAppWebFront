// src/components/Icons.js
import React from 'react';
import { FaShoppingCart, FaInfoCircle } from 'react-icons/fa';

// Componentes de íconos optimizados para LCP
export const ShoppingCartIcon = ({ size = 16, ...props }) => (
  <FaShoppingCart size={size} {...props} />
);

export const InfoIcon = ({ size = 16, ...props }) => (
  <FaInfoCircle size={size} {...props} />
);

// Exportar todos los íconos como un objeto
const Icons = {
  ShoppingCart: ShoppingCartIcon,
  Info: InfoIcon,
};

export default Icons;