'use client';

import { Gift } from 'lucide-react';
import {
  formatGiftCardDate,
  giftCardQrImageUrl,
  GIFT_CARD_SITE_URL,
} from '@/lib/gift-card/public';

export interface GiftCardDisplayData {
  codigo: string;
  monto: number;
  paraNombre: string;
  deNombre: string;
  mensaje?: string | null;
  emitidaEn?: string | null;
  venceEn?: string | null;
  showDates?: boolean;
}

export function GiftCardVisual({
  data,
  compact = false,
  className = '',
}: {
  data: GiftCardDisplayData;
  compact?: boolean;
  className?: string;
}) {
  const qrUrl = giftCardQrImageUrl(data.codigo, compact ? 120 : 160);

  return (
    <div
      className={`relative overflow-hidden border border-gold/60 bg-gradient-to-br from-charcoal via-charcoal/95 to-black shadow-2xl ${
        compact
          ? 'h-[20.4rem] max-w-[20.4rem] rounded-[20px] p-[1.7rem]'
          : 'mx-auto w-full max-w-md rounded-[24px] p-8'
      } ${className}`}
    >
      <div
        className={`pointer-events-none absolute border border-gold/20 ${
          compact ? 'inset-[0.85rem] rounded-[17px]' : 'inset-4 rounded-2xl'
        }`}
      />
      <div className="absolute top-0 left-0 h-28 w-28 bg-gradient-radial from-gold/15 to-transparent blur-2xl" />
      <div className="absolute bottom-0 right-0 h-36 w-36 bg-gradient-radial from-cream/10 to-transparent blur-2xl" />

      <div className="relative flex h-full flex-col justify-between gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1">
            <Gift className="h-3.5 w-3.5 text-gold" />
            <span className="text-[8.5px] font-semibold uppercase tracking-[0.26em] text-gold">
              VIP
            </span>
          </div>
          <div className="font-serif text-gold tracking-widest text-[1.275rem]">ANDREAS</div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />

        <div className="text-center">
          <p className="text-[10px] font-light uppercase tracking-widest text-cream/60">
            Valor de la tarjeta
          </p>
          <p className="mt-2 font-serif text-4xl font-bold text-gold">${data.monto}</p>
          <p className="mt-1 text-[10px] text-cream/40">Premium Experience</p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />

        <div className="space-y-1 text-center text-[10px] font-light text-cream/70">
          <p>
            <span className="font-semibold text-gold">PARA:</span>{' '}
            <span className="tracking-widest">{data.paraNombre}</span>
          </p>
          <p>
            <span className="font-semibold text-gold">DE:</span>{' '}
            <span className="tracking-widest">{data.deNombre}</span>
          </p>
          {data.mensaje ? (
            <p className="italic text-cream/50">&ldquo;{data.mensaje}&rdquo;</p>
          ) : null}
        </div>

        {qrUrl && data.codigo && !data.codigo.includes('PREVIEW') ? (
          <div className="flex flex-col items-center gap-2 pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`QR tarjeta ${data.codigo}`}
              className="rounded-lg border border-gold/20 bg-white p-1"
              width={compact ? 88 : 112}
              height={compact ? 88 : 112}
            />
            <p className="font-mono text-[10px] tracking-widest text-gold">{data.codigo}</p>
          </div>
        ) : null}

        {data.showDates && (data.emitidaEn || data.venceEn) ? (
          <div className="border-t border-gold/20 pt-3 text-center text-[9px] leading-relaxed text-cream/50">
            {data.emitidaEn ? (
              <p>Emisión: {formatGiftCardDate(data.emitidaEn)}</p>
            ) : null}
            {data.venceEn ? (
              <p>Canjeable hasta: {formatGiftCardDate(data.venceEn)}</p>
            ) : null}
            <p className="mt-1 text-gold/80">{GIFT_CARD_SITE_URL.replace(/^https:\/\//, '')}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
