'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CustomerServiceWhatsAppButton } from '@/components/site/CustomerServiceWhatsAppButton';
import {
  loadGiftCardCheckoutPayload,
} from '@/components/gift-card/GiftCardCheckoutForm';
import type { GiftCardCheckoutPayload } from '@/lib/gift-card/validation';
import { GiftCardFrontBackDisplay } from '@/components/gift-card/GiftCardFrontBackDisplay';

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
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <p className="eyebrow text-gold">Vista previa</p>
        <h1 className="mt-2 text-2xl font-light text-cream sm:text-3xl">Tu tarjeta VIP</h1>
        <p className="mt-1.5 text-sm text-muted">
          Vista previa del frente y reverso. La tarjeta oficial con QR se activará con el código que
          te entregue el salón tras validar el pago.
        </p>
      </div>

      <GiftCardFrontBackDisplay data={visualData} />

      <div className="rounded-xl border border-gold/25 bg-gold/5 px-4 py-3.5 sm:px-5">
        <p className="text-[0.75rem] font-light leading-relaxed text-cream/90">
          Para validar el monto y completar el pago con tarjeta, comunícate con servicio al
          cliente. Recibirás un código de activación para generar la tarjeta oficial con QR.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <CustomerServiceWhatsAppButton
            variant="phone"
            size="compact"
            className="w-full shrink-0 sm:w-auto"
          />
          <Link
            href="/tarjeta-regalo/activar"
            className="inline-flex w-full items-center justify-center rounded-lg bg-surface-2 px-4 py-2 text-[11px] font-semibold text-gold ring-1 ring-gold/30 transition-colors hover:ring-gold/50 sm:w-auto"
          >
            Ya tengo mi código
          </Link>
          <Link
            href="/#tarjeta-regalo"
            className="text-center text-[11px] text-muted transition-colors hover:text-gold sm:ml-auto sm:text-right"
          >
            Editar datos
          </Link>
        </div>
      </div>
    </div>
  );
}
