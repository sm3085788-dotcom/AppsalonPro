'use client';

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
  GiftCardHeaderLogo,
  GiftCardParaDeBlock,
  GIFT_CARD_THEME,
  giftCardShellClass,
  giftCardShellStyle,
  LOGO_SRC,
} from './giftCardVisualUi';

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

export function GiftCardVisual({
  data,
  compact = false,
  className = '',
  incompletePreview = false,
}: {
  data: GiftCardDisplayData;
  compact?: boolean;
  className?: string;
  incompletePreview?: boolean;
}) {
  const qrUrl = giftCardQrImageUrl(data.codigo, compact ? 96 : 108);
  const dimmed = incompletePreview || data.incompletePreview;
  const showQr = qrUrl && data.codigo && !data.codigo.includes('PREVIEW');
  const amountSize = compact ? 56 : 72;
  const titleSize = compact ? 22 : 28;

  return (
    <div
      className={`relative flex flex-col items-center ${giftCardShellClass(compact)} ${className}`}
      style={{ ...giftCardShellStyle(), padding: '0 0 24px 0', minHeight: compact ? 520 : 620 }}
    >
      <GiftCardHeaderBand
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: compact ? 28 : 32,
                height: compact ? 28 : 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_SRC}
                alt="Andreas"
                style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'brightness(1.1)' }}
              />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: compact ? 9 : 10, letterSpacing: '0.18em', fontWeight: 600 }}>
              SALÓN
            </div>
          </div>
        }
      />

      <GiftCardCornerOrnaments top={compact ? 62 : 68} />

      <div className="flex w-full flex-col items-center" style={{ marginBottom: compact ? 14 : 18, paddingInline: compact ? 20 : 28 }}>
        <div
          style={{
            letterSpacing: '0.42em',
            color: GIFT_CARD_THEME.brown,
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          ANDREAS
        </div>
        <div
          style={{
            letterSpacing: '0.32em',
            color: GIFT_CARD_THEME.goldMuted,
            fontSize: compact ? 8.5 : 9.5,
            fontWeight: 600,
            marginBottom: compact ? 10 : 14,
          }}
        >
          SALÓN DE LUJO
        </div>
        <GiftCardGoldDivider />
      </div>

      <div className="flex w-full flex-col items-center" style={{ marginBottom: compact ? 14 : 18, paddingInline: compact ? 20 : 28 }}>
        <div
          style={{
            letterSpacing: '0.22em',
            color: '#A08040',
            fontSize: compact ? 8 : 9,
            fontWeight: 700,
            marginBottom: 6,
            textTransform: 'uppercase',
          }}
        >
          Valor de la Tarjeta
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: compact ? 14 : 16,
              fontWeight: 600,
              color: GIFT_CARD_THEME.gold,
              lineHeight: 1,
              alignSelf: 'flex-start',
              marginTop: compact ? 8 : 10,
              marginRight: 2,
            }}
          >
            $
          </span>
          <span
            style={{
              fontSize: amountSize,
              fontWeight: 700,
              color: GIFT_CARD_THEME.brown,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {data.monto}
          </span>
        </div>
        <div
          style={{
            letterSpacing: '0.24em',
            color: GIFT_CARD_THEME.goldMuted,
            fontSize: compact ? 8 : 9,
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          PREMIUM EXPERIENCE
        </div>
      </div>

      <GiftCardGoldDivider style={{ marginBottom: compact ? 14 : 18, paddingInline: compact ? 20 : 28 }} />

      <div className="w-full" style={{ paddingInline: compact ? 20 : 28, marginBottom: compact ? 10 : 14 }}>
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
            paddingInline: compact ? 20 : 28,
            marginBottom: compact ? 14 : 20,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontStyle: 'italic',
              color: '#7A5420',
              fontSize: compact ? 12 : 13.5,
              lineHeight: 1.65,
              fontWeight: 400,
            }}
          >
            &ldquo;{data.mensaje}&rdquo;
          </span>
        </div>
      ) : null}

      {showQr ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E0CFA0',
            borderRadius: 14,
            padding: '10px 10px 6px',
            marginBottom: 8,
            boxShadow: '0 2px 12px rgba(180,140,40,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR tarjeta ${data.codigo}`}
            width={compact ? 88 : 108}
            height={compact ? 88 : 108}
          />
        </div>
      ) : null}

      {showQr ? (
        <div
          style={{
            letterSpacing: '0.28em',
            color: '#9A7530',
            fontSize: compact ? 10 : 11,
            fontWeight: 700,
            marginBottom: compact ? 14 : 18,
          }}
        >
          {data.codigo}
        </div>
      ) : null}

      {data.showDates && (data.emitidaEn || data.venceEn) ? (
        <>
          <GiftCardGoldDivider style={{ marginBottom: 14, paddingInline: compact ? 20 : 28 }} />
          <div
            style={{
              fontSize: compact ? 9.5 : 10.5,
              color: GIFT_CARD_THEME.textMuted,
              textAlign: 'center',
              lineHeight: 1.8,
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.03em',
              paddingInline: compact ? 20 : 28,
            }}
          >
            {data.emitidaEn ? <div>Emisión: {formatGiftCardDate(data.emitidaEn)}</div> : null}
            {data.venceEn ? <div>Canjeable hasta: {formatGiftCardDate(data.venceEn)}</div> : null}
            <div style={{ color: GIFT_CARD_THEME.gold, marginTop: 3, fontSize: compact ? 9 : 9.5, letterSpacing: '0.04em' }}>
              {GIFT_CARD_SITE_URL.replace(/^https:\/\//, '')}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
