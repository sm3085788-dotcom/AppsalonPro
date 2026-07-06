'use client';

import { PaymentCheckoutShell } from '@/components/payments/PaymentCheckoutShell';
import { formatQ } from '@/lib/format';
import type { GiftCardCheckoutPayload } from '@/lib/gift-card/validation';
import type { CreatePaymentSessionInput } from '@/lib/types/db';

export function GiftCardCheckoutForm({ payload }: { payload: GiftCardCheckoutPayload }) {
  const sessionInput: CreatePaymentSessionInput = {
    kind: 'gift_card',
    giftCard: {
      monto: payload.monto,
      paraNombre: payload.paraNombre,
      deNombre: payload.deNombre,
      mensaje: payload.mensaje ?? '',
      compradorEmail: payload.compradorEmail,
    },
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <PaymentCheckoutShell
        input={sessionInput}
        payLabel={`Pagar ${formatQ(payload.monto)}`}
        demoDescription={`QPayPro no está configurado. Simula el pago de ${formatQ(payload.monto)} para generar una tarjeta VIP de prueba.`}
        successPath="/tarjeta-regalo/exito"
        onDemoSuccess={() => clearGiftCardCheckoutPayload()}
      />

      <aside className="h-fit rounded-2xl border border-border bg-surface p-6">
        <h3 className="mb-4 text-lg font-light text-cream">Resumen</h3>
        <ul className="space-y-3 text-sm">
          <li className="flex justify-between">
            <span className="text-muted">Para</span>
            <span className="text-foreground">{payload.paraNombre}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted">De</span>
            <span className="text-foreground">{payload.deNombre}</span>
          </li>
          <li className="flex justify-between border-t border-border pt-4">
            <span className="text-cream">Total tarjeta</span>
            <span className="text-lg font-medium text-gold">{formatQ(payload.monto)}</span>
          </li>
        </ul>
      </aside>
    </div>
  );
}

const STORAGE_KEY = 'appsalon_gift_card_checkout';

export function loadGiftCardCheckoutPayload(): GiftCardCheckoutPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GiftCardCheckoutPayload;
  } catch {
    return null;
  }
}

export function saveGiftCardCheckoutPayload(payload: GiftCardCheckoutPayload) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearGiftCardCheckoutPayload() {
  sessionStorage.removeItem(STORAGE_KEY);
}
