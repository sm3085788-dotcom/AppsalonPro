'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { GiftCardActivationCodeForm } from '@/components/gift-card/GiftCardActivationCodeForm';
import {
  GiftCardActivatedDashboard,
  GiftCardActivatedDashboardLinks,
} from '@/components/gift-card/GiftCardActivatedDashboard';
import { clearActiveGiftCard } from '@/lib/gift-card/activeGiftCardStorage';
import { SALON_CONTACT } from '@/lib/salonContact';
import type { RedeemedGiftCard } from '@/lib/gift-card/redeemActivationCode';

export function GiftCardActivatePanel() {
  const searchParams = useSearchParams();
  const initialCodigo = searchParams.get('codigo') ?? '';
  const [activatedCard, setActivatedCard] = useState<RedeemedGiftCard | null>(null);

  if (activatedCard) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
        <GiftCardActivatedDashboard
          card={activatedCard}
          onDismiss={() => {
            clearActiveGiftCard();
            setActivatedCard(null);
          }}
        />
        <GiftCardActivatedDashboardLinks />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow text-gold">Tarjeta VIP</p>
      <h1 className="mt-3 text-3xl font-light text-cream">Activar tarjeta</h1>
      <p className="mt-3 text-sm font-light leading-relaxed text-muted">
        Ingresá el código que te entregó el salón después de validar el monto y el pago (
        {SALON_CONTACT.telefonoLabel}). Formato: ACT-123456. Si ya activaste, el mismo código te
        devuelve a tu tarjeta para descargarla o compartirla. La tarjeta deja de funcionar una vez
        agotado su saldo.
      </p>

      <GiftCardActivationCodeForm
        variant="page"
        initialCodigo={initialCodigo}
        onActivated={(card) => setActivatedCard(card)}
      />

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/tarjeta-regalo/preview" className="text-muted hover:text-gold">
          Volver a vista previa
        </Link>
        <Link href="/#tarjeta-regalo-activar" className="text-muted hover:text-gold">
          Activar desde inicio
        </Link>
      </div>
    </div>
  );
}
