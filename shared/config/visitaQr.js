/** QR de visita física para validar referido por primera cita (App Salón escanea). */

export const VISITA_QR_PREFIX = 'APSVISITA:';

export function buildVisitaQrPayload(token) {
  const t = String(token || '').trim().toUpperCase();
  if (!t) return '';
  return `${VISITA_QR_PREFIX}${t}`;
}

export function parseVisitaQrPayload(raw) {
  const s = String(raw || '').trim();
  if (s.toUpperCase().startsWith(VISITA_QR_PREFIX)) {
    return s.slice(VISITA_QR_PREFIX.length).trim().toUpperCase();
  }
  return s.trim().toUpperCase();
}

export function visitaTokensMatch(scanned, expected) {
  const a = parseVisitaQrPayload(scanned);
  const b = String(expected || '').trim().toUpperCase();
  return Boolean(a && b && a === b);
}

export function visitaQrImageUrl(token, size = 220) {
  const payload = buildVisitaQrPayload(token);
  if (!payload) return null;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(payload)}`;
}
