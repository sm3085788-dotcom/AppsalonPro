'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GiftCardCheckoutForm,
  loadGiftCardCheckoutPayload,
} from '@/components/gift-card/GiftCardCheckoutForm';

export default function GiftCardCheckoutPage() {
  const router = useRouter();
  const [payload, setPayload] = useState(loadGiftCardCheckoutPayload());

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-8 text-sm text-muted hover:text-cream"
      >
        ← Volver
      </button>
      <p className="eyebrow text-gold">Tarjeta VIP</p>
      <h1 className="mt-3 text-3xl font-light text-cream">Pago seguro</h1>
      <p className="mt-2 text-sm text-muted">
        Correo de recibo: {payload.compradorEmail}
      </p>
      <div className="mt-10">
        <GiftCardCheckoutForm payload={payload} />
      </div>
    </div>
  );
}
