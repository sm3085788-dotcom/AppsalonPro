'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, ShieldCheck, ExternalLink } from 'lucide-react';
import { completeDemoPayment, startPaymentSession } from '@/lib/payments/client';
import type { CreatePaymentSessionInput, PaymentSessionResult } from '@/lib/types/db';

interface Props {
  input: CreatePaymentSessionInput;
  payLabel: string;
  demoDescription: string;
  successPath: string;
  onDemoSuccess?: (result: { codigo?: string }) => void;
}

export function PaymentCheckoutShell({
  input,
  payLabel,
  demoDescription,
  successPath,
  onDemoSuccess,
}: Props) {
  const router = useRouter();
  const [session, setSession] = useState<PaymentSessionResult | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await startPaymentSession(input);
      if (!active) return;
      if (data.error) setError(data.error);
      else {
        setSession(data);
        setDraftId(data.draftId ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [input]);

  async function handlePay() {
    if (!session) return;
    if (session.demo && draftId) {
      setSubmitting(true);
      const result = await completeDemoPayment({ draftId, kind: input.kind });
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error ?? 'Error en modo demo.');
        return;
      }
      if (result.codigo) onDemoSuccess?.({ codigo: result.codigo });
      router.push(result.redirectTo || successPath);
      return;
    }
    if (session.redirectUrl) {
      window.location.href = session.redirectUrl;
      return;
    }
    setError('Pasarela no configurada. Usa modo demo o agrega credenciales QPayPro.');
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Preparando pago seguro…
      </div>
    );
  }

  if (error && !session) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {session?.demo ? (
        <div className="space-y-4 rounded-2xl border border-gold/30 bg-gold/5 p-6">
          <h3 className="font-medium text-cream">Checkout en modo demo</h3>
          <p className="text-sm text-muted">{demoDescription}</p>
        </div>
      ) : session?.redirectUrl ? (
        <p className="text-sm text-muted">
          Serás redirigido a QPayPro para completar el pago de forma segura.
        </p>
      ) : null}

      {error && <p className="text-sm text-red-300">{error}</p>}

      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={submitting || !session}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : session?.redirectUrl ? (
          <ExternalLink className="h-4 w-4" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        {session?.demo ? 'Simular pago exitoso' : payLabel}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        Pago procesado por QPayPro · datos de tarjeta no pasan por nuestro servidor
      </p>
    </div>
  );
}
