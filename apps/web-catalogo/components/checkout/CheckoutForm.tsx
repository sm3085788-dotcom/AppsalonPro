'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode } from 'lucide-react';
import { formatQ } from '@/lib/format';
import { saveLastWebOrderSession } from '@/lib/orders/lastOrderReceiptSession';
import { useTiendaCart } from '@/components/tienda/TiendaCartContext';

interface SummaryLine {
  label: string;
  qty?: number;
  amount: number;
}

interface Props {
  sucursalId: string;
  items: Array<{ inventarioId: string; cantidad: number }>;
  summary: {
    lines: SummaryLine[];
    subtotal: number;
    shippingFee: number;
    total: number;
  };
}

export function CheckoutForm({ sucursalId, items, summary }: Props) {
  const router = useRouter();
  const { clearCart } = useTiendaCart();
  const [cashBusy, setCashBusy] = useState(false);
  const [cashError, setCashError] = useState<string | null>(null);

  const total = summary.subtotal;

  const lines = useMemo(
    () => summary.lines.filter((l) => l.label !== 'Envío a domicilio'),
    [summary.lines],
  );

  async function handleCashCheckout() {
    setCashBusy(true);
    setCashError(null);
    try {
      const res = await fetch('/api/orders/cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursalId,
          items,
          fulfillment: 'retiro_salon',
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        trackingCode?: string;
        orderId?: string;
      };
      if (!res.ok) {
        setCashError(data.error ?? 'No se pudo registrar el pedido.');
        return;
      }
      clearCart();
      const params = new URLSearchParams({ cash: '1' });
      if (data.trackingCode) params.set('tracking', data.trackingCode);
      if (data.orderId) {
        params.set('orderId', data.orderId);
        saveLastWebOrderSession({
          orderId: data.orderId,
          trackingCode: data.trackingCode ?? null,
          cash: true,
        });
      }
      router.push(`/checkout/exito?${params.toString()}`);
    } catch {
      setCashError('Error de conexión. Intentá de nuevo.');
    } finally {
      setCashBusy(false);
    }
  }

  const formatLineAmount = (amount: number) =>
    amount <= 0 ? 'Gratis' : formatQ(amount);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="order-2 space-y-6 lg:order-1">
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-gold/50 bg-gold/5 p-4">
            <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <div>
              <p className="text-sm text-foreground">Pago en recepción</p>
              <p className="text-xs leading-relaxed text-muted">
                Al confirmar recibirás un código QR para mostrar en recepción. El salón lo
                escaneará y podés pagar en efectivo al retirar.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted">
            Guardá el QR que verás al finalizar; con él recepción valida y cierra tu pedido.
          </p>
          {cashError ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
              {cashError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleCashCheckout()}
            disabled={cashBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60"
          >
            {cashBusy ? 'Registrando pedido…' : `Confirmar pedido · ${formatQ(total)}`}
          </button>
        </div>
      </div>

      <OrderSummary lines={lines} total={total} formatLineAmount={formatLineAmount} />
    </div>
  );
}

function OrderSummary({
  lines,
  total,
  formatLineAmount,
}: {
  lines: SummaryLine[];
  total: number;
  formatLineAmount: (amount: number) => string;
}) {
  return (
    <aside className="order-1 h-fit rounded-2xl border border-border bg-surface p-6 lg:order-2">
      <h3 className="mb-4 text-lg font-light text-cream">Resumen</h3>
      <ul className="space-y-3">
        {lines.map((l, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span className="text-muted">
              {l.label}
              {l.qty ? ` × ${l.qty}` : ''}
            </span>
            <span className="text-foreground">{formatLineAmount(l.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between border-t border-border pt-4">
        <span className="text-cream">Total</span>
        <span className="text-lg font-medium text-gold">{formatQ(total)}</span>
      </div>
    </aside>
  );
}
