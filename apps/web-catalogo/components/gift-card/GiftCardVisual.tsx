'use client';

import { forwardRef } from 'react';
import {
  formatGiftCardDate,
  giftCardQrImageUrl,
  GIFT_CARD_SITE_URL,
} from '@/lib/gift-card/public';
import {
  GiftCardBadge,
  GiftCardCornerOrnaments,
  GiftCardGoldDivider,
  GiftCardHeaderBand,
  GiftCardParaDeBlock,
  GIFT_CARD_THEME,
  giftCardExportShellClass,
  giftCardExportShellStyle,
  giftCardShellClass,
  giftCardShellStyle,
  giftCardSizes,
  LOGO_SRC,
} from './giftCardVisualUi';

function splitGiftCardAmount(monto: number) {
  const safe = Number.isFinite(Number(monto)) ? Number(monto) : 0;
  const whole = Math.trunc(safe).toLocaleString('es-GT', { maximumFractionDigits: 0 });
  const cents = String(Math.round(Math.abs(safe) * 100) % 100).padStart(2, '0');
  return { whole, cents };
}

export interface GiftCardDisplayData {
  codigo: string;
  monto: number;
  paraNombre: string;
  deNombre: string;
  mensaje?: string | null;
  emitidaEn?: string | null;
  venceEn?: string | null;
  showDates?: boolean;
  /** Vista previa sin nombres reales (monto + diseño). */
  incompletePreview?: boolean;
}

export const GiftCardVisual = forwardRef<
  HTMLDivElement,
  {
    data: GiftCardDisplayData;
    compact?: boolean;
    className?: string;
    incompletePreview?: boolean;
  }
>(function GiftCardVisual(
  { data, compact = false, className = '', incompletePreview = false },
  ref,
) {
  const s = giftCardSizes(compact);
  const { whole, cents } = splitGiftCardAmount(data.monto);
  const qrFetchSize = Math.ceil(s.qr * 4);
  const qrUrl = giftCardQrImageUrl(data.codigo, qrFetchSize);
  const dimmed = incompletePreview || data.incompletePreview;
  const showQr = qrUrl && data.codigo && !data.codigo.includes('PREVIEW');

  return (
    <div
      ref={ref}
      className={`${giftCardExportShellClass(compact)} ${className}`}
      style={giftCardExportShellStyle()}
    >
      <div
        className={giftCardShellClass(compact)}
        style={{ ...giftCardShellStyle(compact), paddingBottom: compact ? 12 : 16 }}
      >
      <GiftCardHeaderBand
        compact={compact}
        left={
          <GiftCardBadge compact={compact}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <line x1="12" y1="12" x2="12" y2="16" />
              <line x1="10" y1="14" x2="14" y2="14" />
            </svg>
            VIP
          </GiftCardBadge>
        }
        right={
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: compact ? 8 : 9, letterSpacing: '0.18em', fontWeight: 600 }}>
            SALÓN
          </div>
        }
      />

      <GiftCardCornerOrnaments top={s.cornerTop} />

      <div
        className="flex w-full flex-col items-center"
        style={{ marginBottom: s.sectionMb, paddingInline: s.padX }}
      >
        <div style={{ width: compact ? 55 : 66, height: compact ? 55 : 66, marginBottom: compact ? 4 : 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="Andreas"
            crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <div
          style={{
            letterSpacing: '0.38em',
            color: GIFT_CARD_THEME.brown,
            fontSize: s.title,
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 3,
          }}
        >
          ANDREAS
        </div>
        <div
          style={{
            letterSpacing: '0.32em',
            color: GIFT_CARD_THEME.goldMuted,
            fontSize: compact ? 7.5 : 8.5,
            fontWeight: 600,
            marginBottom: compact ? 8 : 10,
          }}
        >
          SALÓN DE LUJO
        </div>
        <GiftCardGoldDivider />
      </div>

      <div
        className="flex w-full flex-col items-center"
        style={{ marginBottom: s.sectionMb, paddingInline: s.padX }}
      >
        <div
          style={{
            letterSpacing: '0.22em',
            color: '#A08040',
            fontSize: compact ? 8 : 9,
            fontWeight: 700,
            marginBottom: 4,
            textTransform: 'uppercase',
          }}
        >
          Valor de la Tarjeta
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
          <span
            style={{
              fontSize: compact ? 14 : 18,
              fontWeight: 600,
              color: GIFT_CARD_THEME.gold,
              lineHeight: 1,
              marginRight: compact ? 3 : 4,
            }}
          >
            Q
          </span>
          <span
            style={{
              fontSize: s.amount,
              fontWeight: 700,
              color: GIFT_CARD_THEME.brown,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {whole}
          </span>
          <span
            style={{
              fontSize: compact ? 13 : 18,
              fontWeight: 700,
              color: GIFT_CARD_THEME.brown,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            .{cents}
          </span>
        </div>
        <div
          style={{
            letterSpacing: '0.22em',
            color: GIFT_CARD_THEME.goldMuted,
            fontSize: compact ? 7.5 : 8.5,
            fontWeight: 600,
            marginTop: 3,
          }}
        >
          PREMIUM EXPERIENCE
        </div>
      </div>

      <GiftCardGoldDivider style={{ marginBottom: s.sectionMb, paddingInline: s.padX }} />

      <div className="w-full" style={{ paddingInline: s.padX, marginBottom: compact ? 8 : 10 }}>
        <GiftCardParaDeBlock
          para={data.paraNombre}
          de={data.deNombre}
          compact={compact}
          dimmed={dimmed}
        />
      </div>

      {data.mensaje ? (
        <div
          style={{
            paddingInline: s.padX,
            marginBottom: compact ? 10 : 12,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontStyle: 'italic',
              color: '#7A5420',
              fontSize: compact ? 9 : 10.5,
              lineHeight: 1.55,
              fontWeight: 400,
            }}
          >
            &ldquo;{data.mensaje}&rdquo;
          </span>
        </div>
      ) : null}

      {showQr ? (
        <div className="flex w-full flex-col items-center gap-1.5 pt-1">
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E0CFA0',
              borderRadius: compact ? 10 : 12,
              padding: compact ? '6px 6px 4px' : '8px 8px 5px',
              boxShadow: '0 2px 12px rgba(180,140,40,0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt={`QR tarjeta ${data.codigo}`}
              width={s.qr}
              height={s.qr}
              crossOrigin="anonymous"
            />
          </div>
          <p
            style={{
              letterSpacing: '0.2em',
              color: '#9A7530',
              fontSize: compact ? 8.5 : 9.5,
              fontWeight: 700,
            }}
          >
            {data.codigo}
          </p>
        </div>
      ) : null}

      {data.showDates && (data.emitidaEn || data.venceEn) ? (
        <>
          <GiftCardGoldDivider style={{ marginBottom: 10, paddingInline: s.padX }} />
          <div
            style={{
              fontSize: compact ? 8 : 9,
              color: GIFT_CARD_THEME.textMuted,
              textAlign: 'center',
              lineHeight: 1.7,
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.03em',
              paddingInline: s.footerPad,
            }}
          >
            {data.emitidaEn ? <div>Emisión: {formatGiftCardDate(data.emitidaEn)}</div> : null}
            {data.venceEn ? <div>Canjeable hasta: {formatGiftCardDate(data.venceEn)}</div> : null}
            <div style={{ color: GIFT_CARD_THEME.gold, marginTop: 2, fontSize: compact ? 8 : 8.5, letterSpacing: '0.04em' }}>
              {GIFT_CARD_SITE_URL.replace(/^https:\/\//, '')}
            </div>
          </div>
        </>
      ) : null}
      </div>
    </div>
  );
});
