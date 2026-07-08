'use client';

import { Heart, Sparkles } from 'lucide-react';
import { buildGiftCardBackCopy } from '@/lib/gift-card/backCopy';
import type { GiftCardDisplayData } from './GiftCardVisual';

const LOGO_SRC = '/images/logo-andreas-transparent.png';

export function GiftCardVisualBack({
  data,
  compact = false,
  className = '',
}: {
  data: GiftCardDisplayData;
  compact?: boolean;
  className?: string;
}) {
  const copy = buildGiftCardBackCopy(data);
  const shell = compact
    ? 'mx-auto w-full max-w-[17.5rem] rounded-[20px] p-4 sm:max-w-[18rem]'
    : 'mx-auto w-full max-w-sm rounded-[22px] p-6 sm:max-w-md sm:rounded-[26px] sm:p-8';
  const innerInset = compact ? 'inset-[0.72rem] rounded-[16px]' : 'inset-4 rounded-2xl';

  return (
    <div
      className={`relative overflow-hidden border border-gold/50 bg-gradient-to-br from-[#141416] via-charcoal to-black shadow-[0_24px_60px_-20px_rgba(212,175,55,0.35),0_0_0_1px_rgba(212,175,55,0.12)] ${shell} ${className}`}
    >
      <div className={`pointer-events-none absolute ${innerInset} border border-gold/25`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(212,175,55,0.14),transparent_55%),radial-gradient(ellipse_at_80%_100%,rgba(245,240,230,0.06),transparent_50%)]" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-cream/5 blur-3xl" />

      <span className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-gold/45" />
      <span className="pointer-events-none absolute right-3 top-3 h-4 w-4 border-r border-t border-gold/45" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 border-b border-l border-gold/45" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-gold/45" />

      <div className={`relative flex h-full flex-col ${compact ? 'justify-between gap-1.5' : 'gap-3.5'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/55 bg-gradient-to-r from-gold/15 to-gold/5 px-2 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Heart className="h-2.5 w-2.5 text-gold" strokeWidth={2.25} />
            <span className="text-[7px] font-semibold uppercase tracking-[0.28em] text-gold">
              Reverso
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <div className={compact ? 'h-5 w-5' : 'h-6 w-6'}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt=""
                className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.3)]"
              />
            </div>
            <p className="text-[7px] font-medium uppercase tracking-[0.22em] text-gradient-gold">
              Salón Andreas
            </p>
          </div>
        </div>

        <div className={`space-y-1 text-center ${compact ? 'text-[8.5px]' : 'text-[11px]'}`}>
          <p>
            <span className="font-semibold uppercase tracking-[0.12em] text-gold">Para:</span>{' '}
            <span className="font-medium tracking-[0.06em] text-cream/90">{copy.para}</span>
          </p>
          <p>
            <span className="font-semibold uppercase tracking-[0.12em] text-gold">De:</span>{' '}
            <span className="font-medium tracking-[0.06em] text-cream/90">{copy.de}</span>
          </p>
        </div>

        <div
          className={`flex-1 space-y-2 overflow-hidden text-center leading-[1.55] ${
            compact ? 'text-[8px]' : 'text-[10.5px]'
          }`}
        >
          <p className="font-semibold uppercase tracking-[0.12em] text-gradient-gold">{copy.intro}</p>
          <p className="font-normal text-cream/82">{copy.body}</p>
          {copy.personal ? (
            <p className="rounded-lg border border-gold/25 bg-gold/10 px-2.5 py-2 font-medium italic text-cream/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              &ldquo;{copy.personal}&rdquo;
            </p>
          ) : null}
          <p className="font-light text-cream/70">{copy.closing}</p>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-gold/20 pt-2">
          <Sparkles className="h-3 w-3 text-gold" strokeWidth={1.75} />
          <p
            className={`font-medium uppercase tracking-[0.2em] text-gold ${
              compact ? 'text-[6.5px]' : 'text-[8px]'
            }`}
          >
            Salud · Belleza · Bienestar
          </p>
          <Sparkles className="h-3 w-3 text-gold" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
