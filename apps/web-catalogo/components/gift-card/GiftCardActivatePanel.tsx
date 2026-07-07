'use client';

import { useState } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { GiftCardShareCard } from '@/components/gift-card/GiftCardShareCard';
import { clearGiftCardCheckoutPayload } from '@/components/gift-card/GiftCardCheckoutForm';
import { SALON_CONTACT } from '@/lib/salonContact';

interface ActivatedCard {
  codigo: string;
  monto_inicial: number;
  para_nombre: string;
  de_nombre: string;
  mensaje: string | null;
  emitida_en: string;
  vence_en: string;
}

export function GiftCardActivatePanel() {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activatedCard, setActivatedCard] = useState<ActivatedCard | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/gift-card/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo activar la tarjeta.');
        return;
      }

      clearGiftCardCheckoutPayload();

      const card = data.card as ActivatedCard | undefined;
      if (card?.codigo) {
        setActivatedCard(card);
        window.history.replaceState(
          null,
          '',
          `/tarjeta-regalo/exito/${encodeURIComponent(card.codigo)}`,
        );
        return;
      }

      setError('La tarjeta se activó pero no se pudieron cargar los datos.');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (activatedCard) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
        <div>
          <p className="eyebrow text-gold">Tarjeta activada</p>
          <h1 className="mt-3 text-3xl font-light text-cream">¡Lista para regalar!</h1>
          <p className="mt-2 text-sm text-muted">
            Tu tarjeta oficial incluye QR para escanear en la app del salón. Descargala o
            compartila con quien quieras sorprender.
          </p>
        </div>

        <GiftCardShareCard
          data={{
            codigo: activatedCard.codigo,
            monto: Number(activatedCard.monto_inicial),
            paraNombre: activatedCard.para_nombre,
            deNombre: activatedCard.de_nombre,
            mensaje: activatedCard.mensaje,
            emitidaEn: activatedCard.emitida_en,
            venceEn: activatedCard.vence_en,
          }}
        />

        <div className="flex flex-wrap gap-4 border-t border-border pt-8">
          <Link href="/#tarjeta-regalo" className="text-sm text-muted hover:text-gold">
            Crear otra tarjeta
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-gold">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow text-gold">Tarjeta VIP</p>
      <h1 className="mt-3 text-3xl font-light text-cream">Activar tarjeta</h1>
      <p className="mt-3 text-sm font-light leading-relaxed text-muted">
        Ingresa el código de 6 dígitos que te entregó el salón después de validar el monto y el pago
        ({SALON_CONTACT.telefonoLabel}). Formato: ACT-123456.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-muted">
            Código de activación
          </label>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="ACT-123456"
            maxLength={10}
            pattern="ACT-[0-9]{6}"
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm uppercase tracking-widest text-foreground outline-none focus:border-gold"
            required
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !codigo.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold py-3.5 text-sm font-semibold text-charcoal disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" />
          {busy ? 'Activando…' : 'Activar y generar tarjeta'}
        </button>
      </form>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/tarjeta-regalo/preview" className="text-muted hover:text-gold">
          Volver a vista previa
        </Link>
        <Link href="/#tarjeta-regalo" className="text-muted hover:text-gold">
          Nueva tarjeta
        </Link>
      </div>
    </div>
  );
}
