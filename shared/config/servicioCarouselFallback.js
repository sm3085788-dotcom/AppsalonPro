import { getArticuloTipo } from './inventarioMeta.js';

/**
 * Imagen de respaldo para carrusel / Mis citas cuando el inventario no trae foto propia.
 */
const DEFAULT_URI =
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=85&auto=format&fit=crop';

const RULES = [
  {
    keys: ['kerat', 'alisado', 'botox', 'capilar', 'tratamiento', 'hidrat', 'reconstruc'],
    uri: 'https://images.unsplash.com/photo-1560869713-b31170498189?w=1200&q=85&auto=format&fit=crop&h=900',
  },
  {
    keys: ['color', 'mechas', 'balayage', 'tinte', 'rubio', 'tono'],
    uri: 'https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=1200&q=85&auto=format&fit=crop',
  },
  {
    keys: ['corte', 'peinado', 'brush', 'estilo', 'barber', 'pedic', 'manic', 'uñas', 'nail', 'gel', 'pies'],
    uri: 'https://images.unsplash.com/photo-1497553583772-641fa562cd6c?w=1200&q=85&auto=format&fit=crop',
  },
  {
    keys: ['facial', 'piel', 'spa', 'masaje', 'relax', 'ritual'],
    uri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=85&auto=format&fit=crop',
  },
  {
    keys: ['maquillaje', 'makeup', 'evento', 'novia'],
    uri: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=85&auto=format&fit=crop',
  },
  {
    keys: ['ceja', 'pestaña', 'lash', 'brow'],
    uri: 'https://images.unsplash.com/photo-1595476108010-b4d582f2c484?w=1200&q=85&auto=format&fit=crop',
  },
];

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function servicioCarouselFallbackUri(row) {
  const haystack = `${row?.categoria || ''} ${row?.nombre || ''}`;
  const n = norm(haystack);
  for (const rule of RULES) {
    if (rule.keys.some((k) => n.includes(k))) return rule.uri;
  }
  return DEFAULT_URI;
}

export function inventarioRowImageUrls(row) {
  return [row?.imagen_url, ...(Array.isArray(row?.imagenes_urls) ? row.imagenes_urls : [])].filter(
    (u) => typeof u === 'string' && u.trim().length > 0,
  );
}

/** URL para `marketing_posts.media_url` (foto real o respaldo solo para servicios). */
export function resolveInventarioCarouselMediaUrl(row) {
  const own = inventarioRowImageUrls(row);
  if (own.length > 0) return own[0];
  if (row && getArticuloTipo(row) === 'servicio') {
    return servicioCarouselFallbackUri(row);
  }
  return null;
}
