'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
  GiftCardActivatedDashboard,
  GiftCardActivatedDashboardLinks,
} from '@/components/gift-card/GiftCardActivatedDashboard';
import { loadActiveGiftCard } from '@/lib/gift-card/activeGiftCardStorage';
import { clearGiftCardCheckoutPayload } from '@/components/gift-card/GiftCardCheckoutForm';
import type { RedeemedGiftCard } from '@/lib/gift-card/redeemActivationCode';

export default function GiftCardSuccessByCodePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [card, setCard] = useState<RedeemedGiftCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void params.then((p) => setCodigo(decodeURIComponent(p.codigo)));
  }, [params]);

  useEffect(() => {
    if (!codigo) return;
    clearGiftCardCheckoutPayload();

    const cached = loadActiveGiftCard();
    if (cached && cached.codigo.toUpperCase() === codigo.toUpperCase()) {
      setCard(cached);
      setLoading(false);
      return;
    }

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
        <p className="mt-3 text-sm text-muted">
          Volvé a recuperar tu tarjeta con tu código ACT.
        </p>
        <Link href="/tarjeta-regalo/activar" className="mt-6 inline-block text-gold">
          Recuperar mi tarjeta de regalo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <GiftCardActivatedDashboard card={card} />
      <GiftCardActivatedDashboardLinks />
    </div>
  );
}
