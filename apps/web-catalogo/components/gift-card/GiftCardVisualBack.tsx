'use client';

import { buildGiftCardBackCopy } from '@/lib/gift-card/backCopy';
import type { GiftCardDisplayData } from './GiftCardVisual';
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
} from './giftCardVisualUi';

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

  return (
    <div
      className={`relative flex flex-col ${giftCardShellClass(compact)} ${className}`}
      style={{ ...giftCardShellStyle(), padding: '0 0 24px 0', minHeight: compact ? 520 : 620 }}
    >
      <GiftCardHeaderBand
        left={
          <GiftCardBadge compact={compact}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            REVERSO
          </GiftCardBadge>
        }
        right={<GiftCardHeaderLogo compact={compact} />}
      />

      <GiftCardCornerOrnaments top={compact ? 62 : 68} />

      <div
        style={{
          paddingInline: compact ? 20 : 26,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ marginBottom: compact ? 14 : 18 }}>
          <GiftCardParaDeBlock para={copy.para} de={copy.de} compact={compact} />
        </div>

        <div
          style={{
            fontSize: compact ? 10 : 11,
            fontWeight: 700,
            color: GIFT_CARD_THEME.gold,
            letterSpacing: '0.16em',
            marginBottom: compact ? 10 : 12,
            lineHeight: 1.4,
            textTransform: 'uppercase',
          }}
        >
          {copy.intro}
        </div>

        <p
          style={{
            fontSize: compact ? 12 : 13.5,
            color: GIFT_CARD_THEME.brownSoft,
            lineHeight: 1.8,
            textAlign: 'center',
            marginBottom: compact ? 12 : 16,
            fontWeight: 400,
          }}
        >
          {copy.body}
        </p>

        {copy.personal ? (
          <div style={{ position: 'relative', marginBottom: compact ? 14 : 18, paddingLeft: 16 }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                borderRadius: 2,
                background: `linear-gradient(to bottom, ${GIFT_CARD_THEME.gold}, ${GIFT_CARD_THEME.goldLight}, ${GIFT_CARD_THEME.gold})`,
              }}
            />
            <div
              style={{
                background: 'rgba(201,168,76,0.06)',
                border: `1px solid ${GIFT_CARD_THEME.quoteBorder}`,
                borderLeft: 'none',
                borderRadius: '0 10px 10px 0',
                padding: compact ? '10px 14px' : '12px 16px',
              }}
            >
              <p
                style={{
                  fontStyle: 'italic',
                  color: GIFT_CARD_THEME.brown,
                  fontSize: compact ? 12.5 : 14,
                  lineHeight: 1.65,
                  fontWeight: 500,
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                &ldquo;{copy.personal}&rdquo;
              </p>
            </div>
          </div>
        ) : null}

        <p
          style={{
            fontSize: compact ? 11.5 : 12.5,
            color: GIFT_CARD_THEME.textMuted,
            textAlign: 'center',
            lineHeight: 1.6,
            marginBottom: compact ? 16 : 20,
          }}
        >
          Que este regalo te inspire a celebrarte, cuidarte y brillar.
          <br />
          <span style={{ color: '#7A5C1E', fontWeight: 600, letterSpacing: '0.06em' }}>— Salón Andreas</span>
        </p>

        <GiftCardGoldDivider style={{ marginBottom: 14 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GIFT_CARD_THEME.gold} strokeWidth="1.6">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
          <span
            style={{
              letterSpacing: '0.24em',
              color: GIFT_CARD_THEME.goldMuted,
              fontSize: compact ? 9 : 10,
              fontWeight: 700,
            }}
          >
            SALUD · BELLEZA · BIENESTAR
          </span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GIFT_CARD_THEME.gold} strokeWidth="1.6">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
