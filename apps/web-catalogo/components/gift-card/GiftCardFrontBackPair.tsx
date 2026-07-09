'use client';

import { useRef, useState } from 'react';
import { GiftCardVisual, type GiftCardDisplayData } from './GiftCardVisual';
import { GiftCardVisualBack } from './GiftCardVisualBack';
import { GiftCardDualImageActions } from './GiftCardDualImageActions';
import { buildGiftCardShareText, buildGiftCardShareUrl } from '@/lib/gift-card/shareMessage';

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

  const shareUrl = buildGiftCardShareUrl(data.codigo);

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
          <div ref={frontRef} className="inline-block w-full">
            <GiftCardVisual compact={compact} data={{ ...data, showDates }} />
          </div>
        </div>
        <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-gold/80">
            Reverso
          </p>
          <div ref={backRef} className="inline-block w-full">
            <GiftCardVisualBack compact={compact} data={data} />
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
            const { dataUrlToPngFile, triggerPngDownload } = await import(
              '@/lib/gift-card/captureCardImage'
            );
            await new Promise<void>((resolve) => {
              window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
            });
            const [frontUrl, backUrl] = await Promise.all([captureFront(), captureBack()]);
            const text = buildGiftCardShareText({
              codigo: data.codigo,
              monto: data.monto,
              paraNombre: data.paraNombre,
            });
            const frontFile = await dataUrlToPngFile(
              frontUrl,
              `tarjeta-vip-frente-${fileSlug}.png`,
            );
            const backFile = await dataUrlToPngFile(
              backUrl,
              `tarjeta-vip-reverso-${fileSlug}.png`,
            );

            if (navigator.share && navigator.canShare?.({ files: [frontFile, backFile] })) {
              try {
                await navigator.share({
                  title: 'Tarjeta VIP ANDREAS',
                  text,
                  files: [frontFile, backFile],
                });
              } catch (err) {
                if ((err as Error)?.name === 'AbortError') return;
                throw err;
              }
              return;
            }

            if (navigator.share && navigator.canShare?.({ files: [frontFile] })) {
              try {
                await navigator.share({
                  title: 'Tarjeta VIP ANDREAS — Frente',
                  text,
                  files: [frontFile],
                });
              } catch (err) {
                if ((err as Error)?.name === 'AbortError') return;
                throw err;
              }
              return;
            }

            if (navigator.share) {
              try {
                await navigator.share({ title: 'Tarjeta VIP ANDREAS', text, url: shareUrl });
                return;
              } catch (err) {
                if ((err as Error)?.name === 'AbortError') return;
              }
            }

            triggerPngDownload(frontUrl, `tarjeta-vip-frente-${fileSlug}.png`);
            window.setTimeout(() => {
              triggerPngDownload(backUrl, `tarjeta-vip-reverso-${fileSlug}.png`);
            }, 350);
          })
        }
      />
    </div>
  );
}
