'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { GiftCardVisual, type GiftCardDisplayData } from './GiftCardVisual';
import { GiftCardImageActions } from './GiftCardImageActions';
import { giftCardPublicPath, GIFT_CARD_SITE_URL } from '@/lib/gift-card/public';

export function GiftCardShareCard({ data }: { data: GiftCardDisplayData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const shareUrl = `${GIFT_CARD_SITE_URL}${giftCardPublicPath(data.codigo)}`;

  async function captureImage() {
    if (!ref.current) throw new Error('missing ref');
    return toPng(ref.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#0a0a0b',
    });
  }

  async function downloadImage() {
    if (busy) return;
    setBusy(true);
    try {
      const dataUrl = await captureImage();
      const link = document.createElement('a');
      link.download = `tarjeta-vip-${data.codigo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[GiftCardShareCard] download', err);
      alert('No se pudo generar la imagen. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function shareImage() {
    if (busy) return;
    setBusy(true);
    try {
      const dataUrl = await captureImage();
      const text = `Te regalo una Tarjeta VIP ANDREAS por $${data.monto}. Código: ${data.codigo}`;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `tarjeta-vip-${data.codigo}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Tarjeta VIP ANDREAS',
          text,
          files: [file],
        });
        return;
      }

      if (navigator.share) {
        try {
          await navigator.share({ title: 'Tarjeta VIP ANDREAS', text, url: shareUrl });
          return;
        } catch {
          /* usuario canceló */
        }
      }

      const link = document.createElement('a');
      link.download = `tarjeta-vip-${data.codigo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[GiftCardShareCard] share', err);
      alert('No se pudo preparar la imagen. Intenta descargarla.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div ref={ref} className="inline-block w-full">
        <GiftCardVisual data={{ ...data, showDates: true }} />
      </div>
      <p className="text-center text-xs font-light text-muted">
        Escaneá el QR en la app del salón para validar y usar el saldo de la tarjeta.
      </p>
      <GiftCardImageActions
        busy={busy}
        onDownload={downloadImage}
        onShare={shareImage}
      />
    </div>
  );
}

