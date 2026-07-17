'use client';

import { useEffect } from 'react';
import { useTiendaCart } from '@/components/tienda/TiendaCartContext';

/** Limpia el carrito al llegar a la página de éxito (tarjeta o efectivo). */
export function ClearCartOnSuccess() {
  const { clearCart } = useTiendaCart();
  useEffect(() => {
    clearCart();
  }, [clearCart]);
  return null;
}
