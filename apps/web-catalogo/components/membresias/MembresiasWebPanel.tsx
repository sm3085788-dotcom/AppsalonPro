'use client';

import { useState } from 'react';
import { PaymentCheckoutShell } from '@/components/payments/PaymentCheckoutShell';
import { formatQ } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';

export function MembresiasWebPanel() {
  const [codigo, setCodigo] = useState('');
  const [preview, setPreview] = useState<{
    ok: boolean;
    nivel?: string;
    price_gtq?: number;
    error?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [paySession, setPaySession] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onPreview() {
    setBusy(true);
    setMessage(null);
    setPaySession(false);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('preview_membresia_codigo', {
      p_codigo: codigo.trim(),
    });
    setBusy(false);
    if (error || !data?.ok) {
      setPreview({ ok: false, error: data?.error || error?.message || 'Código inválido.' });
      return;
    }
    setPreview({ ok: true, nivel: data.nivel, price_gtq: data.price_gtq });
  }

  async function onRedeemAfterPay() {
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('redeem_membresia_codigo', {
      p_codigo: codigo.trim(),
    });
    setBusy(false);
    if (error || !data?.ok) {
      setMessage(data?.error || error?.message || 'No se pudo activar la membresía.');
      return;
    }
    setMessage('Membresía activada correctamente.');
    setPaySession(false);
    setPreview(null);
    setCodigo('');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <h2 className="text-lg font-light text-cream">Activar membresía</h2>
        <p className="text-sm text-muted">
          Ingresa el código que te entregó el salón. Si QPayPro está configurado, pagarás la
          cuota mensual antes de activar.
        </p>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Ej: AURA-BRON-XXXX"
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm uppercase tracking-widest text-foreground outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={() => void onPreview()}
          disabled={busy || !codigo.trim()}
          className="rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal disabled:opacity-60"
        >
          Validar código
        </button>
      </div>

      {preview && !preview.ok && (
        <p className="text-sm text-red-300">{preview.error}</p>
      )}

      {preview?.ok && !paySession && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6">
          <p className="text-sm text-cream">
            Nivel: <span className="uppercase text-gold">{preview.nivel}</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            Monto: {formatQ(Number(preview.price_gtq) || 0)}
          </p>
          <button
            type="button"
            onClick={() => setPaySession(true)}
            className="mt-4 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-charcoal"
          >
            Continuar al pago
          </button>
        </div>
      )}

      {preview?.ok && paySession && (
        <div className="space-y-4">
          <PaymentCheckoutShell
            input={{
              kind: 'membership',
              membership: { codigo: codigo.trim(), nivel: preview.nivel },
            }}
            payLabel={`Pagar membresía ${formatQ(Number(preview.price_gtq) || 0)}`}
            demoDescription="Modo demo: simula el pago de membresía sin QPayPro."
            successPath="/cuenta/membresias"
          />
          <button
            type="button"
            onClick={() => void onRedeemAfterPay()}
            disabled={busy}
            className="text-sm text-gold underline"
          >
            Ya pagué — activar código
          </button>
        </div>
      )}

      {message && <p className="text-sm text-emerald-300">{message}</p>}
    </div>
  );
}
