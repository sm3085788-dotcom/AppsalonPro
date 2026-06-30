'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useBranch } from '@/components/branch/BranchContext';
import { formatQ } from '@/lib/format';
import type { Product } from '@/lib/types/db';

export function ProductPurchase({ product }: { product: Product }) {
  const router = useRouter();
  const { selectedBranchId, selectedBranch } = useBranch();
  const [qty, setQty] = useState(1);

  const max = Math.max(product.stock, 0);
  const canBuy = product.enStock && max > 0;

  function goToCheckout() {
    const params = new URLSearchParams({
      type: 'product',
      item: product.id,
      qty: String(qty),
    });
    if (selectedBranchId) params.set('branch', selectedBranchId);
    router.push(`/checkout?${params.toString()}`);
  }

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

      {selectedBranch && (
        <p className="mt-1 text-xs text-muted">
          Sucursal: {selectedBranch.nombre}
        </p>
      )}

      {canBuy && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-muted">Cantidad</span>
          <div className="flex items-center gap-2 rounded-full border border-border">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="p-2 text-muted hover:text-gold"
              aria-label="Disminuir"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm text-foreground">
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(max, q + 1))}
              className="p-2 text-muted hover:text-gold"
              aria-label="Aumentar"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={goToCheckout}
        disabled={!canBuy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ShoppingBag className="h-4 w-4" />
        {canBuy ? 'Comprar ahora' : 'Sin stock'}
      </button>
    </div>
  );
}
