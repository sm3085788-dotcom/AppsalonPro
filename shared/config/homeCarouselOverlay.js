import { getArticuloTipo, normalizeServicioCategoria } from './inventarioMeta.js';

/**
 * Overlay JSON en `marketing_posts.body` para carrusel Publicidad (home_carousel).
 * @typedef {'producto'|'servicio'} CarouselArticuloTipo
 */

export function buildCarouselOverlayFromInventario(row, buttonTitle) {
  const tipo = getArticuloTipo(row);
  const isProducto = tipo === 'producto';
  const headline = String(row?.nombre || (isProducto ? 'Producto' : 'Servicio')).trim();
  return {
    inventarioId: row.id,
    articuloTipo: isProducto ? 'producto' : 'servicio',
    kicker: isProducto
      ? String(row?.categoria || 'Producto').trim() || 'Producto'
      : normalizeServicioCategoria(row?.categoria),
    headline,
    body: String(row?.descripcion_tienda || row?.descripcion || ' ').trim().slice(0, 240) || ' ',
    buttonTitle:
      String(buttonTitle || '').trim() || (isProducto ? 'Ver en tienda' : 'Ver servicio'),
  };
}

export function parseHomeCarouselOverlay(raw, fallbackTitle = '') {
  const base = {
    inventarioId: null,
    articuloTipo: 'servicio',
    kicker: 'Publicidad',
    headline: fallbackTitle || 'Promoción',
    body: '',
    priceLabel: undefined,
    buttonTitle: 'Ver más',
  };
  const text = String(raw || '').trim();
  if (!text.startsWith('{')) {
    base.body = text;
    return base;
  }
  try {
    const o = JSON.parse(text);
    if (!o || typeof o !== 'object') return base;
    if (o.kicker) base.kicker = String(o.kicker);
    if (o.headline) base.headline = String(o.headline);
    if (o.body != null) base.body = String(o.body);
    if (o.priceLabel) base.priceLabel = String(o.priceLabel);
    if (o.buttonTitle) base.buttonTitle = String(o.buttonTitle);
    if (o.inventarioId != null) {
      const id = Number(o.inventarioId);
      if (Number.isFinite(id)) base.inventarioId = id;
    }
    const t = String(o.articuloTipo || o.articulo_tipo || '').toLowerCase();
    if (t === 'producto' || t === 'servicio') {
      base.articuloTipo = t;
    } else if (base.inventarioId) {
      base.articuloTipo = 'servicio';
    }
    return base;
  } catch {
    base.body = text;
    return base;
  }
}

export function mapHomeCarouselPostToClientSlide(row) {
  const id = String(row.id);
  const uri = row.media_url;
  const parsed = parseHomeCarouselOverlay(row.body, row.title);
  return {
    id,
    uri,
    caption: parsed.headline,
    kicker: parsed.kicker,
    headline: parsed.headline,
    body: parsed.body,
    priceLabel: parsed.priceLabel,
    buttonTitle: parsed.buttonTitle,
    inventarioId: parsed.inventarioId,
    articuloTipo: parsed.articuloTipo,
  };
}
