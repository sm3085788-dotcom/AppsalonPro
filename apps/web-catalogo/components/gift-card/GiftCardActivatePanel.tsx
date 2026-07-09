'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { GiftCardActivationCodeForm } from '@/components/gift-card/GiftCardActivationCodeForm';
import {
  GiftCardActivatedDashboard,
  GiftCardActivatedDashboardLinks,
} from '@/components/gift-card/GiftCardActivatedDashboard';
import type { RedeemedGiftCard } from '@/lib/gift-card/redeemActivationCode';
import {
  GIFT_CARD_COMPLETE_INTRO,
  GIFT_CARD_RECOVER_INTRO,
  type GiftCardActivationMode,
} from '@/lib/gift-card/previewCopy';

export type { GiftCardActivationMode };

const MODE_COPY: Record<
  GiftCardActivationMode,
  { title: string; intro: string; backHref: string; backLabel: string }
> = {
  recover: {
    title: 'Recuperar mi tarjeta de regalo',
    intro: GIFT_CARD_RECOVER_INTRO,
    backHref: '/#tarjeta-regalo',
    backLabel: 'Volver a tarjeta de regalo',
  },
  complete: {
    title: 'Completar mi tarjeta de regalo',
    intro: GIFT_CARD_COMPLETE_INTRO,
    backHref: '/tarjeta-regalo/preview',
    backLabel: 'Volver a vista previa',
  },
};

export function GiftCardActivatePanel({
  mode = 'recover',
}: {
  mode?: GiftCardActivationMode;
}) {
  const searchParams = useSearchParams();
  const initialCodigo = (searchParams.get('codigo') ?? '').trim().toUpperCase();
  const [activatedCard, setActivatedCard] = useState<RedeemedGiftCard | null>(null);
  const [shareViewKey, setShareViewKey] = useState(0);
  const copy = MODE_COPY[mode];

  function openCardView(card: RedeemedGiftCard) {
    setActivatedCard(card);
    setShareViewKey((key) => key + 1);
  }

  if (activatedCard) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
        <GiftCardActivatedDashboard
          card={activatedCard}
          shareViewKey={shareViewKey}
          onDismiss={() => setActivatedCard(null)}
        />
        <GiftCardActivatedDashboardLinks />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <p className="eyebrow text-gold">Tarjeta VIP</p>
      <h1 className="mt-3 text-3xl font-light text-cream">{copy.title}</h1>
      <p className="mt-3 text-sm font-light leading-relaxed text-muted">{copy.intro}</p>

      <GiftCardActivationCodeForm
        variant={mode}
        initialCodigo={initialCodigo}
        onActivated={(card) => openCardView(card)}
      />

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href={copy.backHref} className="text-muted hover:text-gold">
          {copy.backLabel}
        </Link>
        {mode === 'complete' ? (
          <Link href="/tarjeta-regalo/activar" className="text-muted hover:text-gold">
            Ya activé antes — recuperar tarjeta
          </Link>
        ) : null}
      </div>
    </div>
  );
}
