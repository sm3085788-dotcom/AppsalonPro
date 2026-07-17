'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTiendaCart } from '@/components/tienda/TiendaCartContext';
import type { Product } from '@/lib/types/db';

export function ProductQuickAddButton({ product }: { product: Product }) {
  const { addItem } = useTiendaCart();
  const [added, setAdded] = useState(false);

  const canAdd = product.enStock && product.precio > 0 && !product.precioVariable;
  if (!canAdd) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const result = addItem(
          {
            id: product.id,
            title: product.nombre,
            priceAmount: product.precio,
            imageUri: product.imagenUrl,
            qty: 1,
          },
          product.stock,
        );
        if (result.ok) {
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1400);
        }
      }}
      className={`absolute right-2 bottom-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
        added
          ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
          : 'border-gold/40 bg-gold/10 text-gold hover:border-gold/60 hover:bg-gold/20'
      }`}
      aria-label={`Agregar ${product.nombre} al carrito`}
      title="Agregar al carrito"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
    </button>
  );
}
