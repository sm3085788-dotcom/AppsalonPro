'use client';

import { useMemo, useState } from 'react';
import { Store, Truck } from 'lucide-react';
import { formatQ } from '@/lib/format';
import { PaymentCheckoutShell } from '@/components/payments/PaymentCheckoutShell';
import type { CreatePaymentSessionInput, ProductFulfillmentChoice } from '@/lib/types/db';

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
  const [fulfillment, setFulfillment] = useState<ProductFulfillmentChoice>('retiro_salon');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  const total = useMemo(() => {
    if (fulfillment === 'domicilio') return summary.subtotal + summary.shippingFee;
    return summary.subtotal;
  }, [fulfillment, summary]);

  const lines = useMemo(() => {
    const base = summary.lines.filter((l) => l.label !== 'Envío a domicilio');
    if (fulfillment === 'domicilio') {
      return [...base, { label: 'Envío a domicilio', amount: summary.shippingFee }];
    }
    return base;
  }, [fulfillment, summary]);

  const paymentInput: CreatePaymentSessionInput = {
    kind: 'product',
    sucursalId,
    items,
    fulfillment,
    customer: {
      nombre,
      telefono,
      direccion: fulfillment === 'domicilio' ? direccion : null,
    },
  };

  const formValid =
    nombre.trim().length >= 2 &&
    telefono.trim().length >= 6 &&
    (fulfillment === 'retiro_salon' || direccion.trim().length >= 10);

  const formatLineAmount = (amount: number) =>
    amount <= 0 ? 'Gratis' : formatQ(amount);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="order-2 space-y-6 lg:order-1">
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h3 className="text-lg font-light text-cream">Modalidad</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFulfillment('retiro_salon')}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                fulfillment === 'retiro_salon'
                  ? 'border-gold/50 bg-gold/5'
                  : 'border-border hover:border-border-strong'
              }`}
            >
              <Store className="mt-0.5 h-4 w-4 text-gold" />
              <div>
                <p className="text-sm text-foreground">Recoger en salón</p>
                <p className="text-xs text-muted">Sin costo de envío</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFulfillment('domicilio')}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                fulfillment === 'domicilio'
                  ? 'border-gold/50 bg-gold/5'
                  : 'border-border hover:border-border-strong'
              }`}
            >
              <Truck className="mt-0.5 h-4 w-4 text-gold" />
              <div>
                <p className="text-sm text-foreground">Envío a domicilio</p>
                <p className="text-xs text-muted">Envío gratis</p>
              </div>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h3 className="text-lg font-light text-cream">Tus datos</h3>
          <Field label="Nombre completo" value={nombre} onChange={setNombre} />
          <Field label="Teléfono" value={telefono} onChange={setTelefono} />
          {fulfillment === 'domicilio' && (
            <div>
              <label className="mb-2 block text-sm text-muted">Dirección de entrega</label>
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-gold"
                placeholder="Calle, zona, ciudad, referencias"
              />
            </div>
          )}
        </div>

        {formValid ? (
          <PaymentCheckoutShell
            input={paymentInput}
            payLabel={`Pagar ${formatQ(total)}`}
            demoDescription={`QPayPro no está configurado. Simula el pago de ${formatQ(total)} para registrar el pedido.`}
            successPath="/checkout/exito"
          />
        ) : (
          <p className="text-sm text-muted">Completa tus datos para continuar al pago.</p>
        )}
      </div>

      <OrderSummary lines={lines} total={total} formatLineAmount={formatLineAmount} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-gold"
      />
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
