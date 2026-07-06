'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function GiftCardSuccessByCodePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [card, setCard] = useState<CardRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void params.then((p) => setCodigo(decodeURIComponent(p.codigo)));
  }, [params]);

  useEffect(() => {
    if (!codigo) return;
    clearGiftCardCheckoutPayload();
    (async () => {
      try {
        const res = await fetch(`/api/gift-card/${encodeURIComponent(codigo)}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error ?? 'Tarjeta no encontrada.');
          return;
        }
        const c = data.card;
        setCard({
          codigo: c.codigo,
          monto_inicial: c.monto_inicial,
          para_nombre: c.para_nombre,
          de_nombre: c.de_nombre,
          mensaje: c.mensaje,
          emitida_en: c.emitida_en,
          vence_en: c.vence_en,
        });
      } catch {
        setError('Error al cargar la tarjeta.');
      } finally {
        setLoading(false);
      }
    })();
  }, [codigo]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-red-300">{error}</p>
        <Link href="/" className="mt-6 inline-block text-gold">
          Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <div>
        <p className="eyebrow text-gold">Tarjeta verificada</p>
        <h1 className="mt-3 text-3xl font-light text-cream">¡Lista para regalar!</h1>
        <p className="mt-2 text-sm text-muted">
          Canjeable en cualquier sucursal ANDREAS dentro de 30 días. Escaneá el QR en la app del
          salón.
        </p>
      </div>
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
  );
}
