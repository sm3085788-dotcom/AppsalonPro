'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearLastWebOrderSession,
  readLastWebOrderSession,
} from '@/lib/orders/lastOrderReceiptSession';

export function PedidoCancelButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!window.confirm('¿Cancelar este pedido? El salón verá la cancelación en Pedidos.')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          reason: 'Cancelado por el cliente (web)',
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'No se pudo cancelar.');
        return;
      }
      const stored = readLastWebOrderSession();
      if (stored?.orderId === orderId) clearLastWebOrderSession();
      router.refresh();
    } catch {
      setError('Error de red. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void handleCancel()}
        disabled={loading}
        className="inline-flex rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-500/15 disabled:opacity-60"
      >
        {loading ? 'Cancelando…' : 'Cancelar pedido'}
      </button>
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}
