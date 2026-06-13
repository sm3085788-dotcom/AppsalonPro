/** Mensajes chat automáticos con promos de inventario (imagen compacta). */

export const PROMO_INVENTARIO_CONTENT_TYPE = 'promo_inventario';

export function parsePromoInventarioContent(raw) {
  const empty = {
    v: 0,
    inventarioId: null,
    nombre: '',
    articuloTipo: 'producto',
    priceLabel: '',
    compareAtLabel: null,
    hastaLabel: '',
    imagenUrl: null,
  };
  const s = String(raw || '').trim();
  if (!s.startsWith('{')) return empty;
  try {
    const j = JSON.parse(s);
    if (!j || j.v !== 1) return empty;
    return {
      v: 1,
      inventarioId: j.inventarioId != null ? String(j.inventarioId) : null,
      nombre: String(j.nombre || '').trim(),
      articuloTipo: j.articuloTipo === 'servicio' ? 'servicio' : 'producto',
      priceLabel: String(j.priceLabel || '').trim(),
      compareAtLabel: j.compareAtLabel ? String(j.compareAtLabel).trim() : null,
      hastaLabel: String(j.hastaLabel || '').trim(),
      imagenUrl: j.imagenUrl ? String(j.imagenUrl).trim() : null,
    };
  } catch {
    return empty;
  }
}

export function formatPromoInventarioContent(payload) {
  return JSON.stringify({
    v: 1,
    inventarioId: payload.inventarioId != null ? String(payload.inventarioId) : null,
    nombre: String(payload.nombre || '').trim(),
    articuloTipo: payload.articuloTipo === 'servicio' ? 'servicio' : 'producto',
    priceLabel: String(payload.priceLabel || '').trim(),
    compareAtLabel: payload.compareAtLabel ? String(payload.compareAtLabel).trim() : null,
    hastaLabel: String(payload.hastaLabel || '').trim(),
    imagenUrl: payload.imagenUrl ? String(payload.imagenUrl).trim() : null,
  });
}

export function promoInventarioPreviewText(content) {
  const p = parsePromoInventarioContent(content);
  if (!p.nombre) return '';
  const tipo = p.articuloTipo === 'servicio' ? 'Servicio' : 'Producto';
  const bits = [tipo, p.nombre, p.priceLabel, p.hastaLabel ? `hasta ${p.hastaLabel}` : ''].filter(Boolean);
  return bits.join(' · ');
}

export function isPromoInventarioMessage(item) {
  if (!item) return false;
  if (String(item.content_type || '') === PROMO_INVENTARIO_CONTENT_TYPE) return true;
  const p = parsePromoInventarioContent(item.content);
  return p.v === 1 && Boolean(p.nombre);
}

/** Mapea fila promo_inventario al mismo shape que parseBroadcastContent (tienda / citas). */
export function resolveInventarioPromoActionTarget(promoItem) {
  const p = parsePromoInventarioContent(promoItem?.content);
  if (!p.inventarioId && !p.nombre) return null;
  return {
    title: p.nombre,
    body: '',
    v: 1,
    linkType: p.articuloTipo === 'servicio' ? 'service' : 'product',
    linkId: p.inventarioId,
    linkName: p.nombre,
    linkPriceLabel: p.priceLabel || null,
  };
}
