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
import type { GiftCardCheckoutPayload } from '@/lib/gift-card/validation';

const STORAGE_KEY = 'appsalon_gift_card_checkout';

export function loadGiftCardCheckoutPayload(): GiftCardCheckoutPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GiftCardCheckoutPayload;
  } catch {
    return null;
  }
}

export function saveGiftCardCheckoutPayload(payload: GiftCardCheckoutPayload) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearGiftCardCheckoutPayload() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function GiftCardCheckoutForm({ payload }: { payload: GiftCardCheckoutPayload }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const stripePromise = useMemo(() => getStripePromise(), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/gift-card/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: String(payload.monto),
            forName: payload.paraNombre,
            fromName: payload.deNombre,
            message: payload.mensaje,
            buyerEmail: payload.compradorEmail,
          }),
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.error ?? 'No se pudo iniciar el pago.');
          return;
        }
        setDraftId(data.draftId ?? null);
        setPaymentIntentId(data.paymentIntentId ?? null);
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
  }, [payload, stripePromise]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparando pago seguro…
          </div>
        )}
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
            {error}
          </p>
        )}
        {demo && !error && draftId && (
          <DemoGiftCheckout draftId={draftId} total={payload.monto} />
        )}
        {clientSecret && stripePromise && !error && paymentIntentId && (
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
            <GiftPaymentInner total={payload.monto} paymentIntentId={paymentIntentId} />
          </Elements>
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-border bg-surface p-6">
        <h3 className="mb-4 text-lg font-light text-cream">Resumen</h3>
        <ul className="space-y-3 text-sm">
          <li className="flex justify-between">
            <span className="text-muted">Para</span>
            <span className="text-foreground">{payload.paraNombre}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">De</span>
            <span className="text-foreground">{payload.deNombre}</span>
          </li>
          <li className="flex justify-between border-t border-border pt-4">
            <span className="text-cream">Total tarjeta</span>
            <span className="text-lg font-medium text-gold">{formatQ(payload.monto)}</span>
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Válida por 30 días para activar en cualquier sucursal ANDREAS. Sin cuenta
          requerida.
        </p>
      </aside>
    </div>
  );
}

function GiftPaymentInner({
  total,
  paymentIntentId,
}: {
  total: number;
  paymentIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const returnUrl = `${window.location.origin}/tarjeta-regalo/exito?payment_intent_id=${encodeURIComponent(paymentIntentId)}`;
    const { error: payError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (payError) {
      setError(payError.message ?? 'No se pudo completar el pago.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <PaymentElement />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-charcoal hover:bg-gold-soft disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Pagar {formatQ(total)}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Pago cifrado por Stripe
      </p>
    </form>
  );
}

function DemoGiftCheckout({ draftId, total }: { draftId: string; total: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function simulate() {
    setBusy(true);
    try {
      const res = await fetch('/api/gift-card/complete-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'No se pudo generar la tarjeta demo.');
        return;
      }
      clearGiftCardCheckoutPayload();
      router.push(`/tarjeta-regalo/exito/${encodeURIComponent(data.codigo)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gold/30 bg-gold/5 p-6">
      <h3 className="font-medium text-cream">Checkout en modo demo</h3>
      <p className="text-sm text-muted">
        Stripe no está configurado. Simula el pago de {formatQ(total)} para generar una
        tarjeta VIP de prueba.
      </p>
      <button
        type="button"
        onClick={() => void simulate()}
        disabled={busy}
        className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal hover:bg-gold-soft disabled:opacity-60"
      >
        {busy ? 'Generando…' : 'Simular pago exitoso'}
      </button>
    </div>
  );
}
