'use client';

import { Gift } from 'lucide-react';
import {
  formatGiftCardDate,
  giftCardQrImageUrl,
  GIFT_CARD_SITE_URL,
} from '@/lib/gift-card/public';

const LOGO_SRC = '/images/logo-andreas-transparent.png';

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
  const shell = compact
    ? 'mx-auto w-full max-w-[17.5rem] rounded-[20px] p-4 sm:max-w-[18rem]'
    : 'mx-auto w-full max-w-sm rounded-[22px] p-6 sm:max-w-md sm:rounded-[26px] sm:p-8';
  const innerInset = compact ? 'inset-[0.72rem] rounded-[16px]' : 'inset-4 rounded-2xl';

  return (
    <div
      className={`relative overflow-hidden border border-gold/50 bg-gradient-to-br from-[#141416] via-charcoal to-black shadow-[0_24px_60px_-20px_rgba(212,175,55,0.35),0_0_0_1px_rgba(212,175,55,0.12)] ${shell} ${className}`}
    >
      {/* Marco interior y brillo de lujo */}
      <div className={`pointer-events-none absolute ${innerInset} border border-gold/25`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,55,0.14),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(245,240,230,0.06),transparent_50%)]" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-cream/5 blur-3xl" />

      {/* Esquinas decorativas */}
      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gold/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gold/45" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gold/45" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gold/45" />

      <div className={`relative flex h-full flex-col ${compact ? 'justify-between gap-1' : 'gap-4'}`}>
        {/* VIP separado del wordmark */}
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/55 bg-gradient-to-r from-gold/15 to-gold/5 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Gift className="h-3 w-3 text-gold" strokeWidth={1.75} />
            <span className="text-[8px] font-semibold uppercase tracking-[0.32em] text-gold">
              VIP
            </span>
          </span>
        </div>

        {/* Logo + marca centrados */}
        <div className={`flex flex-col items-center text-center ${compact ? 'gap-1 -mt-1' : 'gap-1.5'}`}>
          <div className={compact ? 'h-[3.45rem] w-[3.45rem]' : 'h-[4.15rem] w-[4.15rem]'}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="Andreas"
              className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.3)]"
            />
          </div>
          <div>
            <p
              className={`font-serif font-light uppercase tracking-[0.38em] text-gold ${
                compact ? 'text-[0.95rem]' : 'text-xl'
              }`}
            >
              Andreas
            </p>
            <p className="mt-0.5 text-[7.5px] font-light uppercase tracking-[0.42em] text-cream/45">
              Salón de lujo
            </p>
          </div>
        </div>

        <LuxuryDivider compact={compact} />

        <div className="text-center">
          <p className="text-[9px] font-light uppercase tracking-[0.28em] text-cream/55">
            Valor de la tarjeta
          </p>
          <p
            className={`mt-1.5 font-serif font-semibold tabular-nums text-gold drop-shadow-[0_0_18px_rgba(212,175,55,0.25)] ${
              compact ? 'text-[2rem]' : 'text-5xl'
            }`}
          >
            ${data.monto}
          </p>
          <p className="mt-0.5 text-[8.5px] uppercase tracking-[0.22em] text-cream/35">
            Premium Experience
          </p>
        </div>

        <LuxuryDivider compact={compact} />

        <div className={`space-y-0.5 text-center text-cream/75 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          <p>
            <span className="font-semibold uppercase tracking-[0.12em] text-gold/90">Para:</span>{' '}
            <span className="tracking-[0.18em]">{data.paraNombre}</span>
          </p>
          <p>
            <span className="font-semibold uppercase tracking-[0.12em] text-gold/90">De:</span>{' '}
            <span className="tracking-[0.18em]">{data.deNombre}</span>
          </p>
          {data.mensaje ? (
            <p className="mt-1.5 italic leading-relaxed text-cream/45">&ldquo;{data.mensaje}&rdquo;</p>
          ) : null}
        </div>

        {qrUrl && data.codigo && !data.codigo.includes('PREVIEW') ? (
          <div className="flex flex-col items-center gap-1.5 pt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`QR tarjeta ${data.codigo}`}
              className="rounded-md border border-gold/25 bg-white p-1 shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
              width={compact ? 72 : 104}
              height={compact ? 72 : 104}
            />
            <p className="font-mono text-[8.5px] tracking-[0.2em] text-gold/85">{data.codigo}</p>
          </div>
        ) : null}

        {data.showDates && (data.emitidaEn || data.venceEn) ? (
          <div className="border-t border-gold/15 pt-2 text-center text-[8px] leading-relaxed text-cream/45">
            {data.emitidaEn ? <p>Emisión: {formatGiftCardDate(data.emitidaEn)}</p> : null}
            {data.venceEn ? <p>Canjeable hasta: {formatGiftCardDate(data.venceEn)}</p> : null}
            <p className="mt-1 text-gold/70">{GIFT_CARD_SITE_URL.replace(/^https:\/\//, '')}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LuxuryDivider({ compact }: { compact: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? 'py-0' : 'py-0.5'}`}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <span className="h-1 w-1 rotate-45 border border-gold/60 bg-gold/20" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
    </div>
  );
}
