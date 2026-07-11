'use client';

import { useRef, useState } from 'react';
import { GiftCardVisual, type GiftCardDisplayData } from './GiftCardVisual';
import { GiftCardVisualBack } from './GiftCardVisualBack';
import { GiftCardDualImageActions } from './GiftCardDualImageActions';
import { shareGiftCardAssets } from '@/lib/gift-card/shareGiftCardAssets';

export function GiftCardFrontBackPair({
  data,
  showDates = false,
  fileSlug,
  hint,
  compact = true,
}: {
  data: GiftCardDisplayData;
  showDates?: boolean;
  fileSlug: string;
  hint?: string;
  compact?: boolean;
}) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function captureFront() {
    if (!frontRef.current) throw new Error('missing front ref');
    const { captureElementPng } = await import('@/lib/gift-card/captureCardImage');
    return captureElementPng(frontRef.current);
  }

  async function captureBack() {
    if (!backRef.current) throw new Error('missing back ref');
    const { captureElementPng } = await import('@/lib/gift-card/captureCardImage');
    return captureElementPng(backRef.current);
  }

  async function runBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-6'}>
      <div className={`grid md:grid-cols-2 md:items-start ${compact ? 'gap-3' : 'gap-6'}`}>
        <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-gold/80">
            Frente
          </p>
          <div className="inline-block w-full">
            <GiftCardVisual ref={frontRef} compact={compact} data={{ ...data, showDates }} />
          </div>
        </div>
        <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-gold/80">
            Reverso
          </p>
          <div className="inline-block w-full">
            <GiftCardVisualBack ref={backRef} compact={compact} data={data} />
          </div>
        </div>
      </div>

      {hint ? (
        <p className="text-center text-[11px] font-light leading-snug text-muted">{hint}</p>
      ) : null}

      <GiftCardDualImageActions
        busy={busy}
        onShare={() =>
          runBusy(async () => {
            try {
              await shareGiftCardAssets({
                codigo: data.codigo,
                monto: data.monto,
                paraNombre: data.paraNombre,
                fileSlug,
                captureFront,
                captureBack,
              });
            } catch (err) {
              console.error('[gift-card share]', err);
              window.alert(
                'No se pudo generar la tarjeta para compartir. Recargá la página e intentá de nuevo.',
              );
            }
          })
        }
      />
    </div>
  );
}
