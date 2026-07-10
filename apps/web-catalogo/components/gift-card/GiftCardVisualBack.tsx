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
  giftCardSizes,
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
  const s = giftCardSizes(compact);

  return (
    <div
      className={`relative flex flex-col ${giftCardShellClass(compact)} ${className}`}
      style={{ ...giftCardShellStyle(), padding: compact ? '0 0 12px 0' : '0 0 16px 0' }}
    >
      <GiftCardHeaderBand
        compact={compact}
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

      <GiftCardCornerOrnaments top={s.cornerTop} />

      <div
        style={{
          paddingInline: s.padX,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ marginBottom: s.sectionMb }}>
          <GiftCardParaDeBlock para={copy.para} de={copy.de} compact={compact} />
        </div>

        <div
          style={{
            fontSize: compact ? 8.5 : 10,
            fontWeight: 700,
            color: GIFT_CARD_THEME.gold,
            letterSpacing: '0.14em',
            marginBottom: compact ? 8 : 10,
            lineHeight: 1.35,
            textTransform: 'uppercase',
          }}
        >
          {copy.intro}
        </div>

        <p
          style={{
            fontSize: compact ? 8.5 : 10.5,
            color: GIFT_CARD_THEME.brownSoft,
            lineHeight: 1.65,
            textAlign: 'center',
            marginBottom: compact ? 10 : 12,
            fontWeight: 400,
          }}
        >
          {copy.body}
        </p>

        {copy.personal ? (
          <div style={{ position: 'relative', marginBottom: compact ? 10 : 12, paddingLeft: 12 }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                borderRadius: 2,
                background: `linear-gradient(to bottom, ${GIFT_CARD_THEME.gold}, ${GIFT_CARD_THEME.goldLight}, ${GIFT_CARD_THEME.gold})`,
              }}
            />
            <div
              style={{
                background: 'rgba(201,168,76,0.06)',
                border: `1px solid ${GIFT_CARD_THEME.quoteBorder}`,
                borderLeft: 'none',
                borderRadius: '0 8px 8px 0',
                padding: compact ? '8px 12px' : '10px 14px',
              }}
            >
              <p
                style={{
                  fontStyle: 'italic',
                  color: GIFT_CARD_THEME.brown,
                  fontSize: compact ? 9.5 : 11,
                  lineHeight: 1.55,
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
            fontSize: compact ? 8.5 : 10,
            color: GIFT_CARD_THEME.textMuted,
            textAlign: 'center',
            lineHeight: 1.55,
            marginBottom: compact ? 12 : 14,
          }}
        >
          Que este regalo te inspire a celebrarte, cuidarte y brillar.
          <br />
          <span style={{ color: '#7A5C1E', fontWeight: 600, letterSpacing: '0.06em' }}>— Salón Andreas</span>
        </p>

        <GiftCardGoldDivider style={{ marginBottom: 10 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: compact ? 6 : 8 }}>
          <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke={GIFT_CARD_THEME.gold} strokeWidth="1.6">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
          <span
            style={{
              letterSpacing: '0.2em',
              color: GIFT_CARD_THEME.goldMuted,
              fontSize: compact ? 6.5 : 8,
              fontWeight: 700,
            }}
          >
            SALUD · BELLEZA · BIENESTAR
          </span>
          <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke={GIFT_CARD_THEME.gold} strokeWidth="1.6">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
