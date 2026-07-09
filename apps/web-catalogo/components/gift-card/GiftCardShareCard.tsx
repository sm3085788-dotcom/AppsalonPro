'use client';

import { GiftCardFrontBackPair } from './GiftCardFrontBackPair';
import type { GiftCardDisplayData } from './GiftCardVisual';

export function GiftCardShareCard({
  data,
  compact = true,
}: {
  data: GiftCardDisplayData;
  compact?: boolean;
}) {
  return (
    <GiftCardFrontBackPair
      data={data}
      showDates
      compact={compact}
      fileSlug={data.codigo}
      hint="Escaneá el QR del frente en la app del salón. Compartí la tarjeta por WhatsApp: el mensaje incluye nuestras redes sociales."
    />
  );
}
