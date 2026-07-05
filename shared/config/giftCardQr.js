/** Código QR de tarjeta de regalo VIP (web → App Salón). */

export const GIFT_CARD_QR_PREFIX = 'APSGIFT:';

export const GIFT_CARD_WEB_BASE =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
    : 'https://appsalon-pro-web-catalogo.vercel.app';

export function normalizeGiftCardCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^APSGIFT:/i, '');
}

export function buildGiftCardQrPayload(codigo) {
  const code = normalizeGiftCardCode(codigo);
  if (!code) return '';
  return `${GIFT_CARD_QR_PREFIX}${code}`;
}

export function parseGiftCardQrPayload(raw) {
  const s = String(raw || '').trim();
  if (s.toUpperCase().startsWith(GIFT_CARD_QR_PREFIX)) {
    return normalizeGiftCardCode(s);
  }
  return normalizeGiftCardCode(s);
}

export function giftCardPublicUrl(codigo) {
  const code = normalizeGiftCardCode(codigo);
  if (!code) return null;
  return `${GIFT_CARD_WEB_BASE}/tarjeta/${encodeURIComponent(code)}`;
}

export function giftCardQrImageUrl(codigo, size = 220) {
  const payload = buildGiftCardQrPayload(codigo);
  if (!payload) return null;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(payload)}`;
}

export function giftCardCodesMatch(scanned, expected) {
  const a = parseGiftCardQrPayload(scanned);
  const b = normalizeGiftCardCode(expected);
  return Boolean(a && b && a === b);
}
