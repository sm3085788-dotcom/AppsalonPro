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
  /** Sombra en pantalla (box-shadow en el inner shell). */
  shadow:
    'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -2px 10px rgba(140,100,30,0.1), 0 0 0 1px rgba(201,168,76,0.45), 0 3px 0 rgba(232,203,122,0.65)',
  /** Profundidad 3D para exportación y vista (drop-shadow en el wrapper). */
  depthShadow:
    'drop-shadow(0 30px 50px rgba(92,61,14,0.38)) drop-shadow(0 14px 22px rgba(0,0,0,0.18)) drop-shadow(0 4px 8px rgba(0,0,0,0.12)) drop-shadow(0 0 1px rgba(92,61,14,0.25))',
  font: "'Cormorant Garamond', Georgia, serif",
} as const;

/** Margen alrededor de la tarjeta para que el contorno y la sombra 3D no se recorten al exportar. */
export const GIFT_CARD_CAPTURE_PAD = 20;

/** Wrapper exterior: contorno 3D visible y espacio para captura PNG. */
export function giftCardExportShellClass(compact: boolean) {
  return compact
    ? 'mx-auto w-full max-w-[17.5rem] sm:max-w-[18rem]'
    : 'mx-auto w-full max-w-sm sm:max-w-md';
}

export function giftCardExportShellStyle(): CSSProperties {
  return {
    padding: GIFT_CARD_CAPTURE_PAD,
    overflow: 'visible',
    boxSizing: 'border-box',
    filter: GIFT_CARD_THEME.depthShadow,
  };
}

/** Grosor del borde dorado del inner shell (px). */
export const GIFT_CARD_BORDER_PX = 3;

export function giftCardShellRadius(compact: boolean): number {
  return compact ? 20 : 22;
}

/** Radio superior del header para coincidir con la curva interior del borde. */
export function giftCardHeaderTopRadius(compact: boolean): number {
  return Math.max(0, giftCardShellRadius(compact) - GIFT_CARD_BORDER_PX);
}

/** Mismas proporciones que la tarjeta VIP anterior en web (patrón de layout de main). */
export function giftCardShellClass(compact: boolean) {
  return compact
    ? 'relative flex w-full flex-col rounded-[20px]'
    : 'relative flex w-full flex-col rounded-[22px] sm:rounded-[26px]';
}

export function giftCardShellStyle(compact = false): CSSProperties {
  const radius = giftCardShellRadius(compact);
  return {
    background: `linear-gradient(168deg, #FFFEF9 0%, ${GIFT_CARD_THEME.bg} 38%, #F6EFE2 100%)`,
    border: `${GIFT_CARD_BORDER_PX}px solid ${GIFT_CARD_THEME.border}`,
    borderRadius: radius,
    boxShadow: GIFT_CARD_THEME.shadow,
    fontFamily: GIFT_CARD_THEME.font,
    overflow: 'hidden',
    boxSizing: 'border-box',
  };
}

export function giftCardSizes(compact: boolean) {
  return compact
    ? {
        title: 15,
        amount: 32,
        qr: 72,
        headerMb: 12,
        sectionMb: 10,
        padX: 16,
        footerPad: 16,
        cornerTop: 58,
      }
    : {
        title: 20,
        amount: 48,
        qr: 104,
        headerMb: 16,
        sectionMb: 14,
        padX: 24,
        footerPad: 24,
        cornerTop: 64,
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
  compact = false,
}: {
  left: ReactNode;
  right: ReactNode;
  compact?: boolean;
}) {
  const s = giftCardSizes(compact);
  const topRadius = giftCardHeaderTopRadius(compact);
  return (
    <div
      style={{
        width: '100%',
        background: `linear-gradient(135deg, ${GIFT_CARD_THEME.gold} 0%, ${GIFT_CARD_THEME.goldLight} 45%, ${GIFT_CARD_THEME.gold} 100%)`,
        padding: compact ? '10px 14px' : '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: s.headerMb,
        borderTopLeftRadius: topRadius,
        borderTopRightRadius: topRadius,
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
        overflowWrap: 'anywhere',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          alt="Andreas"
          crossOrigin="anonymous"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
            opacity: 0.92,
          }}
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
