'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import { getStripePromise } from '@/lib/stripe/client';
import { formatQ } from '@/lib/format';
import type { CreatePaymentIntentInput } from '@/lib/types/db';

interface SummaryLine {
  label: string;
  qty?: number;
  amount: number;
}

interface Props {
  input: CreatePaymentIntentInput;
  summary: { lines: SummaryLine[]; total: number };
}

export function CheckoutForm({ input, summary }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const stripePromise = useMemo(() => getStripePromise(), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.error ?? 'No se pudo iniciar el pago.');
          return;
        }
        if (data.demo || !data.clientSecret || !stripePromise) {
          setDemo(true);
          return;
        }
        setClientSecret(data.clientSecret);
      } catch {
        if (active) setError('Error de red al iniciar el pago.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="order-2 lg:order-1">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparando el pago
            seguro…
          </div>
        )}
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
            {error}
          </p>
        )}
        {demo && !error && <DemoCheckout total={summary.total} />}
        {clientSecret && stripePromise && !error && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: {
                  colorPrimary: '#D4AF37',
                  colorBackground: '#161617',
                  colorText: '#F5F0E6',
                  borderRadius: '12px',
                },
              },
            }}
          >
            <PaymentInner total={summary.total} />
          </Elements>
        )}
      </div>

      <OrderSummary summary={summary} />
    </div>
  );
}

function PaymentInner({ total }: { total: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/exito`,
      },
    });
    if (error) {
      setError(error.message ?? 'No se pudo completar el pago.');
      setSubmitting(false);
    } else {
      router.push('/checkout/exito');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PaymentElement />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        Pagar {formatQ(total)}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Pago cifrado
        procesado por Stripe
      </p>
    </form>
  );
}

function DemoCheckout({ total }: { total: number }) {
  const router = useRouter();
  return (
    <div className="space-y-4 rounded-2xl border border-gold/30 bg-gold/5 p-6">
      <h3 className="font-medium text-cream">Checkout en modo demo</h3>
      <p className="text-sm text-muted">
        Stripe no está configurado. En producción aquí se mostraría el Payment
        Element para pagar {formatQ(total)} con tarjeta de forma segura.
      </p>
      <button
        onClick={() => router.push('/checkout/exito')}
        className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold-soft"
      >
        Simular pago exitoso
      </button>
    </div>
  );
}

function OrderSummary({ summary }: { summary: Props['summary'] }) {
  return (
    <aside className="order-1 h-fit rounded-2xl border border-border bg-surface p-6 lg:order-2">
      <h3 className="mb-4 text-lg font-light text-cream">Resumen</h3>
      <ul className="space-y-3">
        {summary.lines.map((l, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span className="text-muted">
              {l.label}
              {l.qty ? ` × ${l.qty}` : ''}
            </span>
            <span className="text-foreground">{formatQ(l.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between border-t border-border pt-4">
        <span className="text-cream">Total</span>
        <span className="text-lg font-medium text-gold">
          {formatQ(summary.total)}
        </span>
      </div>
    </aside>
  );
}
