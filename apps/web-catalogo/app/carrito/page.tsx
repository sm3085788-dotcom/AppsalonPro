'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { LastOrderReceiptPanel } from '@/components/checkout/LastOrderReceiptPanel';
import { useTiendaCart } from '@/components/tienda/TiendaCartContext';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatQ } from '@/lib/format';

export default function CarritoPage() {
  const { cartItems, cartSubtotal, cartHydrated, updateQty, removeItem } = useTiendaCart();

  if (!cartHydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Tienda" title="Tu carrito" subtitle="Cargando…" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Tienda" title="Tu carrito" subtitle="Aún no has agregado productos." />
        <LastOrderReceiptPanel />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/productos"
            className="inline-flex rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal hover:bg-gold-soft"
          >
            Ver productos
          </Link>
          <Link
            href="/cuenta?tab=pedidos"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm text-foreground transition-colors hover:border-gold hover:text-gold"
          >
            <Package className="h-4 w-4" />
            Mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Tienda"
        title="Tu carrito"
        subtitle={`${cartItems.length} producto${cartItems.length === 1 ? '' : 's'}`}
      />

      <ul className="mt-8 space-y-4">
        {cartItems.map((item) => (
          <li
            key={item.id}
            className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
              {item.imageUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUri} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-cream">{item.title}</p>
                  <p className="text-sm text-muted">{formatQ(item.priceAmount)} c/u</p>
                </div>
                <button
                  type="button"
                  aria-label="Quitar del carrito"
                  onClick={() => removeItem(item.id)}
                  className="text-muted hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center rounded-lg border border-border">
                  <button
                    type="button"
                    aria-label="Disminuir"
                    onClick={() => updateQty(item.id, item.qty - 1, 99)}
                    className="px-2 py-1 text-muted hover:text-gold"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[2rem] text-center text-sm">{item.qty}</span>
                  <button
                    type="button"
                    aria-label="Aumentar"
                    onClick={() => updateQty(item.id, item.qty + 1, 99)}
                    className="px-2 py-1 text-muted hover:text-gold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-sm font-medium text-gold">
                  {formatQ(item.priceAmount * item.qty)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <span className="text-cream">Subtotal</span>
          <span className="text-xl font-light text-gold">{formatQ(cartSubtotal)}</span>
        </div>
        <Link
          href="/checkout"
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-gold py-3.5 text-sm font-semibold text-charcoal hover:bg-gold-soft"
        >
          Ir a checkout
        </Link>
        <Link href="/productos" className="mt-3 block text-center text-sm text-muted hover:text-gold">
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
