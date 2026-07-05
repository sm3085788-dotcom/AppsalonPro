'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { GiftCardShareCard } from '@/components/gift-card/GiftCardShareCard';
import { clearGiftCardCheckoutPayload } from '@/components/gift-card/GiftCardCheckoutForm';

interface CardRow {
  codigo: string;
  monto_inicial: number;
  para_nombre: string;
  de_nombre: string;
  mensaje: string | null;
  emitida_en: string;
  vence_en: string;
}

export default function GiftCardSuccessQueryPage() {
  const searchParams = useSearchParams();
  const pi = searchParams.get('payment_intent_id');
  const [card, setCard] = useState<CardRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/gift-card/status?payment_intent_id=${encodeURIComponent(pi!)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.ready && data.card) {
          clearGiftCardCheckoutPayload();
          setCard(data.card);
          setLoading(false);
          return;
        }
        if (attempts < 12) {
          setTimeout(poll, 1500);
          return;
        }
        setError(
          'El pago se procesó pero la tarjeta aún no está lista. Revisa tu correo o contacta al salón.',
        );
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Error al verificar la tarjeta.');
          setLoading(false);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [pi]);

  if (!pi) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center text-muted">
        Falta referencia de pago.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p>Generando tu tarjeta VIP…</p>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-red-300">{error ?? 'No se encontró la tarjeta.'}</p>
        <Link href="/" className="mt-6 inline-block text-gold">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <p className="eyebrow text-gold">Tarjeta verificada</p>
      <h1 className="mt-3 text-3xl font-light text-cream">¡Lista para regalar!</h1>
      <p className="mt-3 text-sm text-muted">
        Canjeable en cualquier sucursal ANDREAS dentro de 30 días.
      </p>
      <div className="mt-10">
        <GiftCardShareCard
          data={{
            codigo: card.codigo,
            monto: Number(card.monto_inicial),
            paraNombre: card.para_nombre,
            deNombre: card.de_nombre,
            mensaje: card.mensaje,
            emitidaEn: card.emitida_en,
            venceEn: card.vence_en,
          }}
        />
      </div>
    </div>
  );
}
