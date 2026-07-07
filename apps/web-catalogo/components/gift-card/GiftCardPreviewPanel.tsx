'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerServiceWhatsAppButton } from '@/components/site/CustomerServiceWhatsAppButton';
import {
  loadGiftCardCheckoutPayload,
} from '@/components/gift-card/GiftCardCheckoutForm';
import type { GiftCardCheckoutPayload } from '@/lib/gift-card/validation';
import { GiftCardVisual } from '@/components/gift-card/GiftCardVisual';

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

      <div className="rounded-xl border border-gold/25 bg-gold/5 p-[1.125rem]">
        <p className="text-[0.7875rem] font-light leading-relaxed text-cream/90">
          Para validar el monto y completar el pago con tarjeta, comunícate con servicio al
          cliente. Recibirás un código de activación para generar la tarjeta oficial con QR.
        </p>
        <CustomerServiceWhatsAppButton
          variant="phone"
          className="mt-3.5 px-[1.125rem] py-2 text-[10px] [&_svg]:h-3.5 [&_svg]:w-3.5 [&_span:last-child]:text-[9px]"
        />
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
