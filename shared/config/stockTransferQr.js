/** QR de traslado de stock matriz → sucursal (App Salón). */

export const STOCK_TRANSFER_QR_PREFIX = 'APSSTOCK:';

function utf8ToBase64Url(str) {
  const b64 = globalThis.btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(b64url) {
  let b64 = String(b64url || '').replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return decodeURIComponent(escape(globalThis.atob(b64)));
}

/**
 * @typedef {{ inventario_id: string, cantidad: number }} StockTransferItem
 * @typedef {{ v: number, sid: string, l: string, f: string, i: StockTransferItem[] }} StockTransferPayload
 */

/** @param {StockTransferItem[]} items */
export function buildStockTransferPayload({ sucursalId, numeroLote, fechaIngreso, items }) {
  const sid = String(sucursalId || '').trim();
  const l = String(numeroLote || '').trim();
  const f = String(fechaIngreso || '').slice(0, 10);
  const normalized = (items || [])
    .map((row) => ({
      inventario_id: String(row.inventario_id || row.id || '').trim(),
      cantidad: Math.max(1, Math.floor(Number(row.cantidad ?? row.qty ?? 0))),
    }))
    .filter((row) => row.inventario_id && row.cantidad >= 1);

  if (!sid || !l || !/^\d{4}-\d{2}-\d{2}$/.test(f) || !normalized.length) {
    return null;
  }

  return { v: 1, sid, l, f, i: normalized };
}

export function buildStockTransferQrPayload(payload) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  if (!body) return '';
  return `${STOCK_TRANSFER_QR_PREFIX}${utf8ToBase64Url(body)}`;
}

/** @returns {StockTransferPayload | null} */
export function parseStockTransferQrPayload(raw) {
  const s = String(raw || '').trim();
  if (!s.toUpperCase().startsWith(STOCK_TRANSFER_QR_PREFIX)) return null;
  const encoded = s.slice(STOCK_TRANSFER_QR_PREFIX.length).trim();
  if (!encoded) return null;
  try {
    const json = base64UrlToUtf8(encoded);
    const data = JSON.parse(json);
    if (!data || data.v !== 1) return null;
    const sid = String(data.sid || '').trim();
    const l = String(data.l || '').trim();
    const f = String(data.f || '').slice(0, 10);
    const items = Array.isArray(data.i)
      ? data.i
          .map((row) => {
            if (Array.isArray(row)) {
              return { inventario_id: String(row[0] || '').trim(), cantidad: Math.max(1, Math.floor(Number(row[1] || 0))) };
            }
            return {
              inventario_id: String(row.inventario_id || row.id || '').trim(),
              cantidad: Math.max(1, Math.floor(Number(row.cantidad ?? row.qty ?? 0))),
            };
          })
          .filter((row) => row.inventario_id && row.cantidad >= 1)
      : [];
    if (!sid || !l || !/^\d{4}-\d{2}-\d{2}$/.test(f) || !items.length) return null;
    return { v: 1, sid, l, f, i: items };
  } catch {
    return null;
  }
}

export function stockTransferQrImageUrl(payloadOrRaw, size = 280) {
  const payload =
    typeof payloadOrRaw === 'string' && payloadOrRaw.startsWith(STOCK_TRANSFER_QR_PREFIX)
      ? payloadOrRaw
      : buildStockTransferQrPayload(payloadOrRaw);
  if (!payload) return null;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(payload)}`;
}

export function stockTransferSucursalMatches(payload, sucursalId) {
  if (!payload?.sid || !sucursalId) return false;
  return String(payload.sid).trim() === String(sucursalId).trim();
}
