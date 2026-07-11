/** Helpers públicos de tarjeta regalo (web). */

export function normalizeGiftCardCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/^APSGIFT:/i, '');
}

export const GIFT_CARD_QR_PREFIX = 'APSGIFT:';

export function buildGiftCardQrPayload(codigo: string): string {
  const code = normalizeGiftCardCode(codigo);
  if (!code) return '';
  return `${GIFT_CARD_QR_PREFIX}${code}`;
}

export function giftCardQrImageUrl(codigo: string, size = 220): string | null {
  const payload = buildGiftCardQrPayload(codigo);
  if (!payload) return null;
  const safeSize = Math.min(512, Math.max(64, Math.round(size)));
  const params = new URLSearchParams({ data: payload, size: String(safeSize) });
  return `/api/gift-card/qr?${params.toString()}`;
}

export function giftCardPublicPath(codigo: string): string {
  return `/tarjeta/${encodeURIComponent(normalizeGiftCardCode(codigo))}`;
}

export function formatGiftCardDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('es-GT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export const GIFT_CARD_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://appsalon-pro-web-catalogo.vercel.app';
