'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerServiceWhatsAppButton } from '@/components/site/CustomerServiceWhatsAppButton';
import {
  loadGiftCardCheckoutPayload,
} from '@/components/gift-card/GiftCardCheckoutForm';
import type { GiftCardCheckoutPayload } from '@/lib/gift-card/validation';
import { GiftCardFrontBackDisplay } from '@/components/gift-card/GiftCardFrontBackDisplay';
import {
  GIFT_CARD_PREVIEW_INCOMPLETE,
  GIFT_CARD_PREVIEW_PAYMENT_NOTE,
  GIFT_CARD_PREVIEW_SUBTITLE,
} from '@/lib/gift-card/previewCopy';

export function GiftCardPreviewPanel() {
  const [payload, setPayload] = useState<GiftCardCheckoutPayload | null>(null);

  useEffect(() => {
    setPayload(loadGiftCardCheckoutPayload());
  }, []);

  if (!payload) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-muted">No hay datos de tarjeta. Elegí un monto en inicio.</p>
        <Link href="/#tarjeta-regalo" className="mt-6 inline-block text-gold underline">
          Ir al formulario
        </Link>
      </div>
    );
  }

  const visualData = {
    codigo: 'GC-PREVIEW',
    monto: payload.monto,
    paraNombre: GIFT_CARD_PREVIEW_INCOMPLETE.paraNombre,
    deNombre: GIFT_CARD_PREVIEW_INCOMPLETE.deNombre,
    mensaje: null,
    incompletePreview: true as const,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="eyebrow text-gold">Vista previa</p>
        <h1 className="mt-2 text-2xl font-light text-cream sm:text-3xl">Tu tarjeta VIP</h1>
        <p className="mt-1.5 text-sm text-muted">{GIFT_CARD_PREVIEW_SUBTITLE}</p>
      </div>

      <GiftCardFrontBackDisplay data={visualData} />

      <div className="rounded-xl border border-gold/25 bg-gold/5 px-4 py-3.5 sm:px-5">
        <p className="text-[0.75rem] font-light leading-relaxed text-cream/90">
          {GIFT_CARD_PREVIEW_PAYMENT_NOTE}
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <CustomerServiceWhatsAppButton
            variant="phone"
            size="compact"
            className="w-full shrink-0 sm:w-auto"
          />
          <Link
            href="/tarjeta-regalo/completar"
            className="inline-flex w-full items-center justify-center rounded-lg bg-surface-2 px-4 py-2 text-[11px] font-semibold text-gold ring-1 ring-gold/30 transition-colors hover:ring-gold/50 sm:w-auto"
          >
            Ya tengo mi código
          </Link>
          <Link
            href="/#tarjeta-regalo"
            className="text-center text-[11px] text-muted transition-colors hover:text-gold sm:ml-auto sm:text-right"
          >
            Cambiar monto
          </Link>
        </div>
      </div>
    </div>
  );
}
