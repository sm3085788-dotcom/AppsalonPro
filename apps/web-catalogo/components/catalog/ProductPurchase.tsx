'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, ShoppingCart, Store } from 'lucide-react';
import { BranchSelect } from '@/components/branch/BranchSelect';
import { ProductPrice } from '@/components/catalog/ProductPrice';
import { useTiendaCart } from '@/components/tienda/TiendaCartContext';
import { formatQ } from '@/lib/format';
import type { Product } from '@/lib/types/db';

export function ProductPurchase({ product }: { product: Product }) {
  const { addItem } = useTiendaCart();
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const canBuy = product.enStock && product.precio > 0 && !product.precioVariable;

  const onAdd = () => {
    if (!canBuy) return;
    const result = addItem(
      {
        id: product.id,
        title: product.nombre,
        priceAmount: product.precio,
        imageUri: product.imagenUrl,
        qty,
      },
      product.stock,
    );
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage('Agregado al carrito');
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3.5 sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <ProductPrice product={product} size="compact" />
        <span
          className={`shrink-0 text-xs ${product.enStock ? 'text-emerald-300' : 'text-red-300'}`}
        >
          {product.enStock ? `${product.stock} disponibles` : 'Agotado'}
        </span>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[11px] text-muted">Sucursal</label>
        <BranchSelect variant="field" compact />
      </div>

      {canBuy ? (
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] text-muted">Cantidad</label>
            <div className="inline-flex items-center rounded-lg border border-border">
              <button
                type="button"
                aria-label="Disminuir cantidad"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="rounded-l-lg px-2.5 py-1.5 text-muted hover:text-gold"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2rem] text-center text-xs text-cream">{qty}</span>
              <button
                type="button"
                aria-label="Aumentar cantidad"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                className="rounded-r-lg px-2.5 py-1.5 text-muted hover:text-gold"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-2.5 text-xs font-semibold text-charcoal hover:bg-gold-soft sm:text-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Agregar al carrito
          </button>
          {message ? <p className="text-xs text-emerald-300">{message}</p> : null}
          <Link
            href="/carrito"
            className="block text-center text-xs text-muted hover:text-gold"
          >
            Ver carrito
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-border bg-surface-2/50 p-3">
          <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
          <p className="text-xs font-light leading-relaxed text-muted">
            {product.enStock
              ? 'Consultá precio y disponibilidad en recepción para este artículo.'
              : 'Sin existencia en esta sucursal. Pregunta en recepción por otras opciones.'}
          </p>
        </div>
      )}
    </div>
  );
}
