'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import {
  loadGiftCardCheckoutPayload,
} from '@/components/gift-card/GiftCardCheckoutForm';
import type { GiftCardCheckoutPayload } from '@/lib/gift-card/validation';
import { GiftCardVisual } from '@/components/gift-card/GiftCardVisual';
import { SALON_CONTACT } from '@/lib/salonContact';

export function GiftCardPreviewPanel() {
  const [payload, setPayload] = useState<GiftCardCheckoutPayload | null>(null);

  useEffect(() => {
    setPayload(loadGiftCardCheckoutPayload());
  }, []);

  if (!payload) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-muted">No hay datos de tarjeta. Completa el formulario en inicio.</p>
        <Link href="/#tarjeta-regalo" className="mt-6 inline-block text-gold underline">
          Ir al formulario
        </Link>
      </div>
    );
  }

  const visualData = {
    codigo: 'GC-PREVIEW',
    monto: payload.monto,
    paraNombre: payload.paraNombre,
    deNombre: payload.deNombre,
    mensaje: payload.mensaje || null,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
      <div>
        <p className="eyebrow text-gold">Vista previa</p>
        <h1 className="mt-3 text-3xl font-light text-cream">Tu tarjeta VIP</h1>
        <p className="mt-2 text-sm text-muted">
          Esta es una vista previa. La tarjeta oficial se activará con el código que te entregue
          el salón tras validar el pago.
        </p>
      </div>

      <div className="inline-block w-full">
        <GiftCardVisual data={{ ...visualData, showDates: false }} />
      </div>

      <div className="rounded-2xl border border-gold/25 bg-gold/5 p-5">
        <p className="text-sm font-light leading-relaxed text-cream/90">
          Para validar el monto y completar el pago con tarjeta, comunícate con servicio al
          cliente. Recibirás un código de activación para generar la tarjeta oficial con QR.
        </p>
        <a
          href={SALON_CONTACT.telUrl}
          className="mt-4 inline-flex items-center gap-2 text-sm text-gold hover:underline"
        >
          <Phone className="h-4 w-4" />
          {SALON_CONTACT.telefonoLabel}
        </a>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-border pt-8">
        <Link
          href="/tarjeta-regalo/activar"
          className="rounded-xl bg-surface-2 px-6 py-3 text-sm font-semibold text-gold ring-1 ring-gold/30"
        >
          Ya tengo mi código de activación
        </Link>
        <Link href="/#tarjeta-regalo" className="text-sm text-muted hover:text-gold">
          Editar datos
        </Link>
      </div>
    </div>
  );
}
