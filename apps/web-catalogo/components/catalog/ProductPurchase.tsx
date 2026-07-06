'use client';

import { Store } from 'lucide-react';
import { BranchSelect } from '@/components/branch/BranchSelect';
import { formatQ } from '@/lib/format';
import type { Product } from '@/lib/types/db';

export function ProductPurchase({ product }: { product: Product }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-light text-gold">
          {formatQ(product.precio)}
        </span>
        <span
          className={`text-sm ${product.enStock ? 'text-emerald-300' : 'text-red-300'}`}
        >
          {product.enStock ? `${product.stock} disponibles` : 'Agotado'}
        </span>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-xs text-muted">Sucursal</label>
        <BranchSelect variant="field" />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-surface-2/50 p-4">
        <Store className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <p className="text-sm font-light leading-relaxed text-muted">
          {product.enStock
            ? 'Disponible en salón · consulta en recepción. La compra en línea estará disponible pronto.'
            : 'Sin existencia en esta sucursal. Pregunta en recepción por otras opciones.'}
        </p>
      </div>
    </div>
  );
}
