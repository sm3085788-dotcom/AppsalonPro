/** Contenido estructurado de difusiones (Pulso masivo) en marketing_direct_messages. */

export const BROADCAST_PROMO_ACTIONS = {
  BUY: 'buy',
  BOOK: 'book',
  CALL: 'call',
};

export const BROADCAST_LINK_TYPES = {
  PRODUCT: 'product',
  SERVICE: 'service',
};

export function parseBroadcastContent(raw) {
  const s = String(raw || '').trim();
  const empty = {
    title: '',
    body: '',
    v: 0,
    linkType: null,
    linkId: null,
    linkName: null,
    linkPriceLabel: null,
  };
  if (!s) return empty;
  if (s.startsWith('{')) {
    try {
      const j = JSON.parse(s);
      if (j && (j.v === 1 || j.v === 2)) {
        return {
          title: String(j.title || '').trim(),
          body: String(j.body || '').trim(),
          v: j.v,
          linkType: j.linkType || null,
          linkId: j.linkId != null ? String(j.linkId) : null,
          linkName: j.linkName ? String(j.linkName).trim() : null,
          linkPriceLabel: j.linkPriceLabel ? String(j.linkPriceLabel).trim() : null,
        };
      }
    } catch {
      /* markdown legacy */
    }
  }
  const m = s.match(/^\*\*(.+?)\*\*\s*\n?([\s\S]*)$/);
  if (m) return { ...empty, title: m[1].trim(), body: m[2].trim(), v: 0 };
  return { ...empty, body: s, v: 0 };
}

export function formatBroadcastContent({
  title,
  body,
  linkType = null,
  linkId = null,
  linkName = null,
  linkPriceLabel = null,
}) {
  return JSON.stringify({
    v: 2,
    title: String(title || '').trim(),
    body: String(body || '').trim(),
    linkType: linkType || null,
    linkId: linkId != null ? String(linkId) : null,
    linkName: linkName ? String(linkName).trim() : null,
    linkPriceLabel: linkPriceLabel ? String(linkPriceLabel).trim() : null,
  });
}

export function broadcastPreviewText(content) {
  const { title, body, linkName } = parseBroadcastContent(content);
  const bits = [title, body, linkName].filter(Boolean);
  if (bits.length >= 2) return bits.slice(0, 2).join(' — ');
  return bits[0] || '';
}

export function buildBroadcastActionMessage(action, promo = {}, extra = '') {
  const parsed = parseBroadcastContent(promo.content);
  const label = parsed.title || 'esta promoción';
  const target = parsed.linkName || '';
  const suffix = extra ? ` · ${extra}` : '';
  switch (action) {
    case BROADCAST_PROMO_ACTIONS.BUY:
      return `🛒 Compra por promo «${label}»${target ? ` · ${target}` : ''}${suffix}`;
    case BROADCAST_PROMO_ACTIONS.BOOK:
      return `📅 Cita solicitada por promo «${label}»${target ? ` · ${target}` : ''}${suffix}`;
    case BROADCAST_PROMO_ACTIONS.CALL:
      return `📞 Solicito que un asistente me llame por la promo «${label}»${suffix}`;
    default:
      return null;
  }
}
