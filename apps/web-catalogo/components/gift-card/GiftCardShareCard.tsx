'use client';

import { useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { GiftCardVisual, type GiftCardDisplayData } from './GiftCardVisual';
import { giftCardPublicPath, GIFT_CARD_SITE_URL } from '@/lib/gift-card/public';

export function GiftCardShareCard({ data }: { data: GiftCardDisplayData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const shareUrl = `${GIFT_CARD_SITE_URL}${giftCardPublicPath(data.codigo)}`;

  async function downloadImage() {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0a0a0b',
      });
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

  async function shareLink() {
    const text = `Te regalo una Tarjeta VIP ANDREAS por $${data.monto}. Código: ${data.codigo}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Tarjeta VIP ANDREAS', text, url: shareUrl });
        return;
      } catch {
        /* usuario canceló */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
      alert('Enlace copiado al portapapeles.');
    } catch {
      prompt('Copia este enlace:', shareUrl);
    }
  }

  return (
    <div className="space-y-6">
      <div ref={ref} className="inline-block w-full">
        <GiftCardVisual data={{ ...data, showDates: true }} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void downloadImage()}
          disabled={busy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gold to-gold-soft px-6 py-3 text-sm font-semibold uppercase tracking-wider text-charcoal transition hover:shadow-lg disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          Descargar imagen
        </button>
        <button
          type="button"
          onClick={() => void shareLink()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold/40 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/10"
        >
          <Share2 className="h-4 w-4" />
          Compartir
        </button>
      </div>
    </div>
  );
}
