/** Código QR de retiro / cobro de pedidos tienda (App Clientes → App Salón). */

export const PICKUP_QR_PREFIX = 'APSPICKUP:';

export function buildPickupQrPayload(trackingCode) {
  const code = String(trackingCode || '')
    .trim()
    .toUpperCase();
  if (!code) return '';
  return `${PICKUP_QR_PREFIX}${code}`;
}

export function parsePickupQrPayload(raw) {
  const s = String(raw || '').trim();
  if (s.toUpperCase().startsWith(PICKUP_QR_PREFIX)) {
    return s.slice(PICKUP_QR_PREFIX.length).trim().toUpperCase();
  }
  return s.trim().toUpperCase();
}

export function pickupQrImageUrl(trackingCode, size = 220) {
  const payload = buildPickupQrPayload(trackingCode);
  if (!payload) return null;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(payload)}`;
}

export function trackingCodesMatch(scanned, expected) {
  const a = parsePickupQrPayload(scanned);
  const b = String(expected || '')
    .trim()
    .toUpperCase();
  return Boolean(a && b && a === b);
}
