import { getArticuloTipo } from './inventarioMeta.js';
import { normalizeServicioCategoria } from './servicioCategorias.js';
import {
  inventarioRowImageUrls,
  resolveInventarioCarouselMediaUrl,
} from './servicioCarouselFallback.js';

/**
 * Overlay JSON en `marketing_posts.body` para carrusel Publicidad (home_carousel).
 * @typedef {'producto'|'servicio'} CarouselArticuloTipo
 */

/** ID de inventario (UUID o entero legado) para deep links del carrusel. */
export function normalizeInventarioCarouselId(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.floor(raw));
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

/** Tipo efectivo para carrusel (misma regla en salón al importar y en clientes al abrir). */
export function resolveCarouselArticuloTipo(row, slideTipo = null) {
  const fromSlide = carouselArticuloTipoFromSlide({ articuloTipo: slideTipo });
  if (fromSlide) return fromSlide;
  if (row) return getArticuloTipo(row);
  return null;
}

export function buildCarouselOverlayFromInventario(row, buttonTitle) {
  const tipo = getArticuloTipo(row);
  const isProducto = tipo === 'producto';
  const headline = String(row?.nombre || (isProducto ? 'Producto' : 'Servicio')).trim();
  const invId = normalizeInventarioCarouselId(row?.id);
  return {
    inventarioId: invId,
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

export function carouselArticuloTipoFromSlide(slide) {
  const t = String(slide?.articuloTipo || '').toLowerCase();
  if (t === 'producto' || t === 'servicio') return t;
  return null;
}

/** Solo inferencia cuando el overlay no trae `articuloTipo` (posts viejos). */
export function isCarouselSlideProducto(slide) {
  if (!slide) return false;
  const declared = carouselArticuloTipoFromSlide(slide);
  if (declared === 'servicio') return false;
  if (declared === 'producto') return true;
  const btn = String(slide.buttonTitle || '').toLowerCase();
  if (/\btienda\b|\bcomprar\b/.test(btn)) return true;
  const kick = String(slide.kicker || '').toLowerCase();
  if (kick === 'producto' || kick.includes('producto')) return true;
  return false;
}

/** Texto del botón al importar desde inventario, alineado al tipo real del artículo. */
export function resolveCarouselButtonTitle(row, customCta) {
  const isProducto = getArticuloTipo(row) === 'producto';
  const defaultCta = isProducto ? 'Ver en tienda' : 'Ver servicio';
  let cta = String(customCta || '').trim() || defaultCta;
  const ctaL = cta.toLowerCase();
  if (isProducto) {
    if (/\bservicio\b|\bcita\b|\bagendar\b/.test(ctaL)) return defaultCta;
    return cta;
  }
  if (/\btienda\b|\bcomprar\b/.test(ctaL)) return defaultCta;
  return cta;
}

export function parseHomeCarouselOverlay(raw, fallbackTitle = '') {
  const base = {
    inventarioId: null,
    articuloTipo: null,
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
      base.inventarioId = normalizeInventarioCarouselId(o.inventarioId);
    }
    if (!base.inventarioId && o.inventario_id != null) {
      base.inventarioId = normalizeInventarioCarouselId(o.inventario_id);
    }
    const t = String(o.articuloTipo || o.articulo_tipo || '').toLowerCase();
    if (t === 'producto' || t === 'servicio') {
      base.articuloTipo = t;
    }
    if (!base.articuloTipo && isCarouselSlideProducto(base)) {
      base.articuloTipo = 'producto';
    }
    if (!base.articuloTipo) {
      base.articuloTipo = 'servicio';
    }
    return base;
  } catch {
    base.body = text;
    if (isCarouselSlideProducto(base)) base.articuloTipo = 'producto';
    if (!base.articuloTipo) base.articuloTipo = 'servicio';
    return base;
  }
}

/** Corrige `articuloTipo` con inventario (posts viejos sin tipo en el JSON). */
export async function enrichHomeCarouselSlidesWithInventario(slides, getById, getTipo) {
  if (!Array.isArray(slides) || !slides.length) return slides || [];
  const out = [];
  for (const slide of slides) {
    const invId = normalizeInventarioCarouselId(slide?.inventarioId);
    if (!invId) {
      out.push(slide);
      continue;
    }
    try {
      const { data } = await getById(invId);
      if (data) {
        const dbTipo = getTipo(data);
        out.push({ ...slide, inventarioId: invId, articuloTipo: dbTipo });
        continue;
      }
    } catch {
      /* ignore */
    }
    const declared = carouselArticuloTipoFromSlide(slide);
    if (declared === 'producto' || declared === 'servicio') {
      out.push({ ...slide, inventarioId: invId, articuloTipo: declared });
      continue;
    }
    out.push({
      ...slide,
      inventarioId: invId,
      articuloTipo: isCarouselSlideProducto(slide) ? 'producto' : 'servicio',
    });
  }
  return out;
}

/**
 * Mismo flujo para producto y servicio al importar desde Marketing (App Salón).
 * El JSON del overlay fija `articuloTipo` + `inventarioId` para que Clientes abra Tienda o Mis citas.
 */
/** Importar portada de inventario al carrusel hero «Reserva tu cita». */
export function buildHomeHeroMarketingPayload(row, { customCta } = {}) {
  const built = buildHomeCarouselMarketingPayload(row, { customCta });
  return {
    ...built,
    payload: {
      ...built.payload,
      title: String(built.overlay.headline || row?.nombre || 'Reserva tu cita').slice(0, 200),
      audience: 'home_hero',
    },
  };
}

export function buildHomeCarouselMarketingPayload(row, { customCta } = {}) {
  const invId = normalizeInventarioCarouselId(row?.id);
  const tipo = getArticuloTipo(row);
  const isProducto = tipo === 'producto';
  const mediaUrl = resolveInventarioCarouselMediaUrl(row);
  const cta = resolveCarouselButtonTitle(row, customCta);
  const overlay = buildCarouselOverlayFromInventario(row, cta);
  overlay.inventarioId = invId;
  overlay.articuloTipo = isProducto ? 'producto' : 'servicio';
  overlay.buttonTitle = cta;
  return {
    tipo,
    isProducto,
    invId,
    mediaUrl,
    usaFallback: !isProducto && inventarioRowImageUrls(row).length === 0,
    overlay,
    payload: {
      title: String(overlay.headline || row?.nombre || 'Promoción').slice(0, 200),
      body: JSON.stringify(overlay),
      media_url: mediaUrl,
      media_kind: 'image',
      content_type: 'image',
      status: 'published',
      visibility: 'public',
      audience: 'home_carousel',
      published_at: new Date().toISOString(),
    },
  };
}

export function mapHomeHeroPostToClientSlide(row) {
  const id = String(row.id);
  const uri = row.media_url;
  const parsed = parseHomeCarouselOverlay(row.body, row.title);
  const kicker =
    parsed.kicker && parsed.kicker !== 'Publicidad'
      ? parsed.kicker
      : 'Tu próxima experiencia';
  return {
    id,
    uri,
    caption: parsed.headline || row.title || 'Reserva tu cita',
    kicker,
    headline: parsed.headline || row.title || 'Reserva tu cita',
    body:
      parsed.body?.trim() ||
      'Descubre el arte de la belleza con nuestros estilistas expertos.',
    buttonTitle: parsed.buttonTitle || 'Agendar ahora',
    priceLabel: parsed.priceLabel,
    inventarioId: parsed.inventarioId,
    articuloTipo: parsed.articuloTipo,
  };
}

export function mapHomeCarouselPostToClientSlide(row) {
  const id = String(row.id);
  const uri = row.media_url;
  const parsed = parseHomeCarouselOverlay(row.body, row.title);
  const slide = {
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
  return slide;
}
