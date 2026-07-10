import type { CSSProperties, ReactNode } from 'react';

export const LOGO_SRC = '/images/logo-andreas-transparent.png';

export const GIFT_CARD_THEME = {
  bg: '#FDFAF4',
  border: '#D4AF60',
  gold: '#C9A84C',
  goldLight: '#E8CB7A',
  goldMuted: '#B8964E',
  brown: '#5C3D0E',
  brownDark: '#2A1A00',
  brownSoft: '#3D2500',
  textMuted: '#A08050',
  label: '#9A6E20',
  blockBg: 'rgba(201,168,76,0.07)',
  blockBorder: '#E8D9A8',
  quoteBorder: '#EBD98C',
  shadow:
    '0 20px 60px rgba(180,140,40,0.18), 0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
  font: "'Cormorant Garamond', Georgia, serif",
} as const;

export function giftCardShellClass(compact: boolean) {
  return compact
    ? 'mx-auto w-full max-w-[17.5rem] sm:max-w-[18rem]'
    : 'mx-auto w-full max-w-[340px]';
}

export function giftCardShellStyle(): CSSProperties {
  return {
    background: GIFT_CARD_THEME.bg,
    border: `1.5px solid ${GIFT_CARD_THEME.border}`,
    borderRadius: 20,
    boxShadow: GIFT_CARD_THEME.shadow,
    fontFamily: GIFT_CARD_THEME.font,
    overflow: 'hidden',
  };
}

export function GiftCardCornerOrnaments({ top = 68 }: { top?: number }) {
  const corner = (style: CSSProperties) => (
    <svg className="absolute" style={style} width="28" height="28" viewBox="0 0 32 32" fill="none">
      <path d="M2 2 L14 2 M2 2 L2 14" stroke={GIFT_CARD_THEME.gold} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <>
      {corner({ top, left: 10, opacity: 0.35 })}
      {corner({ top, right: 10, opacity: 0.35, transform: 'scaleX(-1)', transformOrigin: 'center' })}
      {corner({ bottom: 10, left: 10, opacity: 0.35, transform: 'scaleY(-1)', transformOrigin: 'center' })}
      {corner({
        bottom: 10,
        right: 10,
        opacity: 0.35,
        transform: 'scale(-1)',
        transformOrigin: 'center',
      })}
    </>
  );
}

export function GiftCardGoldDivider({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={`flex w-full items-center gap-2 ${className}`} style={style}>
      <div
        style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #C9A84C88)' }}
      />
      <svg width="7" height="7" viewBox="0 0 8 8">
        <polygon points="4,0 8,4 4,8 0,4" fill={GIFT_CARD_THEME.gold} opacity="0.8" />
      </svg>
      <div
        style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #C9A84C88)' }}
      />
    </div>
  );
}

export function GiftCardHeaderBand({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div
      style={{
        width: '100%',
        background: `linear-gradient(135deg, ${GIFT_CARD_THEME.gold} 0%, ${GIFT_CARD_THEME.goldLight} 45%, ${GIFT_CARD_THEME.gold} 100%)`,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}
    >
      {left}
      {right}
    </div>
  );
}

export function GiftCardBadge({
  children,
  compact,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: 20,
        padding: compact ? '2px 10px' : '3px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        color: '#fff',
        fontSize: compact ? 9 : 10,
        letterSpacing: '0.22em',
        fontWeight: 700,
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {children}
    </div>
  );
}

export function GiftCardParaDeBlock({
  para,
  de,
  compact,
  dimmed = false,
}: {
  para: string;
  de: string;
  compact?: boolean;
  dimmed?: boolean;
}) {
  const nameStyle: CSSProperties = {
    fontWeight: 500,
    letterSpacing: '0.05em',
    fontStyle: dimmed ? 'italic' : 'normal',
    color: dimmed ? '#A08050' : GIFT_CARD_THEME.brownDark,
  };

  return (
    <div
      style={{
        background: GIFT_CARD_THEME.blockBg,
        border: `1px solid ${GIFT_CARD_THEME.blockBorder}`,
        borderRadius: 10,
        padding: compact ? '10px 14px' : '12px 16px',
        lineHeight: 1.9,
      }}
    >
      <div style={{ fontSize: compact ? 12.5 : 13.5, color: GIFT_CARD_THEME.brownDark }}>
        <span style={{ fontWeight: 800, color: GIFT_CARD_THEME.label, letterSpacing: '0.12em', fontSize: compact ? 10 : 11 }}>
          PARA
        </span>
        <span style={{ color: GIFT_CARD_THEME.gold, fontWeight: 400 }}> · </span>
        <span style={nameStyle}>{para}</span>
      </div>
      <div style={{ fontSize: compact ? 12.5 : 13.5, color: GIFT_CARD_THEME.brownDark }}>
        <span style={{ fontWeight: 800, color: GIFT_CARD_THEME.label, letterSpacing: '0.12em', fontSize: compact ? 10 : 11 }}>
          DE
        </span>
        <span style={{ color: GIFT_CARD_THEME.gold, fontWeight: 400 }}> · </span>
        <span style={nameStyle}>{de}</span>
      </div>
    </div>
  );
}

export function GiftCardHeaderLogo({ compact }: { compact?: boolean }) {
  const size = compact ? 28 : 34;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          alt="Andreas"
          style={{ width: '78%', height: '78%', objectFit: 'contain' }}
        />
      </div>
      <span
        style={{
          letterSpacing: '0.18em',
          color: 'rgba(255,255,255,0.92)',
          fontSize: compact ? 9 : 10,
          fontWeight: 600,
        }}
      >
        SALÓN ANDREAS
      </span>
    </div>
  );
}
