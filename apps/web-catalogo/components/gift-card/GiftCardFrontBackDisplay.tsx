'use client';

import { GiftCardVisual, type GiftCardDisplayData } from './GiftCardVisual';
import { GiftCardVisualBack } from './GiftCardVisualBack';

/** Solo frente y reverso, sin captura ni compartir (seguro para vista previa). */
export function GiftCardFrontBackDisplay({
  data,
  showDates = false,
}: {
  data: GiftCardDisplayData;
  showDates?: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-2">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-gold/80">
          Frente
        </p>
        <div className="inline-block w-full">
          <GiftCardVisual data={{ ...data, showDates }} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-gold/80">
          Reverso
        </p>
        <div className="inline-block w-full">
          <GiftCardVisualBack data={data} />
        </div>
      </div>
    </div>
  );
}
