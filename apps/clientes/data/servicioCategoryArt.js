/**
 * Imágenes Unsplash por categoría / tipo de servicio (uso editorial en app).
 * Fallback cuando el inventario no trae foto propia.
 */
import { HOME_HERO_SLIDES } from './remoteHeroImages';

export const SERVICIO_IMAGE_FALLBACK = HOME_HERO_SLIDES[0].uri;

/** Palabras clave (en categoría o nombre) → imagen */
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
    keys: ['corte', 'peinado', 'brush', 'estilo', 'barber'],
    uri: 'https://images.unsplash.com/photo-1497553583772-641fa562cd6c?w=1200&q=85&auto=format&fit=crop',
  },
  {
    keys: ['manic', 'uñas', 'nail', 'gel'],
    uri: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=1200&q=85&auto=format&fit=crop',
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
    keys: ['pie', 'pedic', 'podolog'],
    uri: 'https://images.unsplash.com/photo-1519415387223-4f34d96324e1?w=1200&q=85&auto=format&fit=crop',
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

function categoryFallbackUri(servicio) {
  const haystack = `${servicio?.categoria || ''} ${servicio?.nombre || ''}`;
  const n = norm(haystack);
  for (const rule of RULES) {
    if (rule.keys.some((k) => n.includes(k))) return rule.uri;
  }
  return SERVICIO_IMAGE_FALLBACK;
}

export function resolveServicioImageUris(servicio) {
  const list = Array.isArray(servicio?.imageUris) ? servicio.imageUris.filter(Boolean) : [];
  if (list.length) return list;
  const own = String(servicio?.imageUri || '').trim();
  if (own) return [own];
  return [categoryFallbackUri(servicio)];
}

export function resolveServicioImageUri(servicio) {
  return resolveServicioImageUris(servicio)[0];
}

export function formatCategoriaLabel(raw) {
  const t = String(raw || '').trim();
  if (!t) return 'Servicios';
  return t.charAt(0).toUpperCase() + t.slice(1);
}
