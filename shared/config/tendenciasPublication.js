/**
 * Número de publicación visible en Tendencias (1, 2, 3…).
 * Solo cuenta posts publicados con media en el feed Tendencias (no carrusel ni hero).
 */

export function isTendenciasFeedPost(row) {
  if (!row) return false;
  const aud = String(row.audience || '');
  if (aud === 'home_carousel' || aud === 'home_hero') return false;
  if (String(row.status || '').toLowerCase() !== 'published') return false;
  const u = row.media_url;
  if (!u || typeof u !== 'string') return false;
  const ct = String(row.content_type || '').toLowerCase();
  if (ct === 'image' || ct === 'video') return true;
  return /\.(jpe?g|png|gif|webp|mp4|mov|webm|m4v)(\?|$)/i.test(u);
}

function sortTendenciasByPublishOrder(a, b) {
  const ta = new Date(a.published_at || a.created_at).getTime();
  const tb = new Date(b.published_at || b.created_at).getTime();
  if (ta !== tb) return ta - tb;
  return Number(a.id) - Number(b.id);
}

/** Mapa post id → número de publicación Tendencias (1 = la más antigua publicada). */
export function buildTendenciasPublicationMap(rows) {
  const tendencias = (rows || []).filter(isTendenciasFeedPost).sort(sortTendenciasByPublishOrder);
  const map = new Map();
  tendencias.forEach((p, i) => {
    const id = Number(p.id);
    if (Number.isFinite(id)) map.set(id, i + 1);
  });
  return map;
}

export function getTendenciasPublicationNo(postId, rows) {
  const id = Number(postId);
  if (!Number.isFinite(id)) return null;
  return buildTendenciasPublicationMap(rows).get(id) ?? null;
}

export function countTendenciasPublications(rows) {
  return buildTendenciasPublicationMap(rows).size;
}

/** Añade `tendencias_no` a cada fila del feed (usa todas las filas publicadas para el orden global). */
export function enrichTendenciasFeedPosts(feedRows, allPublishedRows = null) {
  const list = feedRows || [];
  if (!list.length) return list;
  const rankSource = allPublishedRows?.length ? allPublishedRows : list;
  const map = buildTendenciasPublicationMap(rankSource);
  return list.map((r) => {
    const no = map.get(Number(r.id)) ?? (r.tendencias_no != null ? Number(r.tendencias_no) : null);
    return {
      ...r,
      tendencias_no: Number.isFinite(no) && no > 0 ? no : null,
    };
  });
}

export function formatTendenciasPublicationLine(publicationNo, { includeSource = true } = {}) {
  const n = Number(publicationNo);
  if (!Number.isFinite(n) || n < 1) return null;
  const label = `Tendencias · Publicación #${n}`;
  return includeSource ? label : `Publicación #${n}`;
}
