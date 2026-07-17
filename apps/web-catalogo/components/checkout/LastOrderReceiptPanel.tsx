'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOrderReceiptAction } from '@/app/checkout/actions';
import { OrderReceiptInvoice } from '@/components/checkout/OrderReceiptInvoice';
import {
  clearLastWebOrderSession,
  readLastWebOrderSession,
  type LastWebOrderSession,
} from '@/lib/orders/lastOrderReceiptSession';
import type { OrderReceipt } from '@/lib/orders/orderReceipt';

export function LastOrderReceiptPanel() {
  const [session, setSession] = useState<LastWebOrderSession | null>(null);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readLastWebOrderSession();
    setSession(stored);
    if (!stored?.orderId) {
      setLoading(false);
      return;
    }
    void (async () => {
      const res = await getOrderReceiptAction(stored.orderId);
      if (res.receipt) {
        setReceipt(res.receipt);
      } else {
        setError(res.error ?? 'No se pudo cargar el comprobante.');
      }
      setLoading(false);
    })();
  }, []);

  if (!session?.orderId) return null;

  if (loading) {
    return (
      <div className="mb-8 rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        Cargando comprobante de tu último pedido…
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          {error ?? 'No se pudo mostrar el comprobante de tu último pedido.'}
        </p>
        <Link
          href="/cuenta?tab=pedidos"
          className="mt-3 inline-flex text-sm text-gold hover:underline"
        >
          Ver en mis pedidos
        </Link>
      </div>
    );
  }

  const isCashPickup =
    Boolean(session.cash) && receipt.paymentMethod === 'efectivo';

  return (
    <div className="mb-5">
      <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted">
        Tu último pedido
      </p>
      <OrderReceiptInvoice receipt={receipt} showPickupQr={isCashPickup} compact />
      <button
        type="button"
        onClick={() => {
          clearLastWebOrderSession();
          setReceipt(null);
          setSession(null);
        }}
        className="mt-3 text-xs text-muted hover:text-gold"
      >
        Ocultar comprobante
      </button>
    </div>
  );
}
