/**
 * Promos en chat App Clientes — lee inventario matriz (interruptor promo ON + vigente).
 * Portada + precio, sin depender de filas promo_inventario en marketing_direct_messages.
 */

import { db } from './supabaseClient.js';
import { mapInventarioToTiendaProduct } from './tiendaCheckout.js';
import {
  maybeRevertInventarioPromoExpired,
  splitNotas,
  isPromocionVigente,
  formatPromocionHastaLabel,
  getPreciosPorVolumenFromRow,
  VOLUMEN_TRABAJO_OPCIONES,
} from './inventarioMeta.js';
import { isClientOutboundAuraMessage } from './auraLineClient.js';
import {
  PROMO_INVENTARIO_CONTENT_TYPE,
  formatPromoInventarioContent,
  isPromoInventarioMessage,
} from './promoInventarioChat.js';

function formatQChat(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '';
  return `Q${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Payload compacto para tarjeta chat (imagen + precio). */
export function inventarioRowToPromoChatPayload(row) {
  if (!row?.id) return null;
  const fresh = maybeRevertInventarioPromoExpired(row);
  const { meta } = splitNotas(fresh.notas);
  if (!isPromocionVigente(meta)) return null;

  const mapped = mapInventarioToTiendaProduct(fresh);
  if (!mapped) return null;

  let priceLabel = mapped.priceLabel || '';
  let compareAtLabel = mapped.compareAtLabel || null;

  if (mapped.precioVariable) {
    const pv = getPreciosPorVolumenFromRow(fresh);
    let min = null;
    for (const o of VOLUMEN_TRABAJO_OPCIONES) {
      const n = pv[o.id];
      if (n != null && n > 0 && (min == null || n < min)) min = n;
    }
    if (min != null) {
      priceLabel = `Desde ${formatQChat(min)}`;
    }
    const orig = meta.promocionPreciosPorVolumenOriginal;
    if (orig && typeof orig === 'object') {
      let minOrig = null;
      for (const o of VOLUMEN_TRABAJO_OPCIONES) {
        const n = Number(orig[o.id]);
        if (Number.isFinite(n) && n > 0 && (minOrig == null || n < minOrig)) minOrig = n;
      }
      if (minOrig != null && min != null && minOrig > min) {
        compareAtLabel = formatQChat(minOrig);
      }
    }
  }

  const imgs = Array.isArray(fresh.imagenes_urls) ? fresh.imagenes_urls.filter(Boolean) : [];
  const imagenUrl = fresh.imagen_url || imgs[0] || null;

  return {
    inventarioId: String(fresh.id),
    nombre: mapped.title || fresh.nombre || '',
    articuloTipo: mapped.articuloTipo === 'servicio' ? 'servicio' : 'producto',
    priceLabel,
    compareAtLabel,
    hastaLabel: formatPromocionHastaLabel(meta.promocionHasta),
    imagenUrl,
  };
}

/** Promos vigentes desde inventario (misma fuente que Tienda / matriz). */
export async function fetchClientPromosVigentesForChat() {
  const { data, error } = await db.inventario.getCatalogoAppClientes();
  if (error || !Array.isArray(data)) {
    return { data: [], error: error || null };
  }
  const out = [];
  for (const row of data) {
    const payload = inventarioRowToPromoChatPayload(row);
    if (payload) out.push(payload);
  }
  return { data: out, error: null };
}

export function isPromoIntroSalonChat(row, sessionUserId) {
  if (!row || isClientOutboundAuraMessage(row, sessionUserId)) return false;
  if (String(row.content_type || '') !== 'chat') return false;
  return /promociones vigentes/i.test(String(row.content || ''));
}

export function buildSyntheticPromoChatMessage(payload, anchorMessage) {
  const anchorId = anchorMessage?.id != null ? String(anchorMessage.id) : '0';
  return {
    id: `live-promo-${payload.inventarioId}-${anchorId}`,
    client_id: anchorMessage?.client_id ?? null,
    content_type: PROMO_INVENTARIO_CONTENT_TYPE,
    content: formatPromoInventarioContent(payload),
    media_url: payload.imagenUrl || null,
    media_kind: payload.imagenUrl ? 'image' : null,
    created_at: anchorMessage?.created_at || new Date().toISOString(),
    created_by_name: anchorMessage?.created_by_name || 'Andreas Pro',
    status: anchorMessage?.status || 'delivered',
    __syntheticPromo: true,
  };
}

/**
 * Tras el intro del bot, muestra tarjetas desde inventario si aún no hay promo_inventario en BD.
 */
export function expandAuraMessagesWithLivePromos(messages, promoPayloads, sessionUserId) {
  const rows = Array.isArray(messages) ? messages : [];
  const promos = Array.isArray(promoPayloads) ? promoPayloads : [];
  if (!rows.length || !promos.length) return rows;

  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    out.push(item);
    if (!isPromoIntroSalonChat(item, sessionUserId)) continue;

    const following = rows.slice(i + 1, i + 8);
    const hasRealCards = following.some(
      (m) => isPromoInventarioMessage(m) && !m.__syntheticPromo,
    );
    if (hasRealCards) continue;

    for (const p of promos) {
      out.push(buildSyntheticPromoChatMessage(p, item));
    }
  }
  return out;
}

/** Agrupa promos consecutivas en un ítem de lista para el FlatList del chat. */
export function collapsePromoChatRowsForDisplay(messages, sessionUserId) {
  const rows = Array.isArray(messages) ? messages : [];
  const out = [];
  let i = 0;
  while (i < rows.length) {
    const item = rows[i];
    const isPromoRow =
      isPromoInventarioMessage(item) && !isClientOutboundAuraMessage(item, sessionUserId);
    if (!isPromoRow) {
      out.push(item);
      i += 1;
      continue;
    }
    const promos = [];
    while (
      i < rows.length &&
      isPromoInventarioMessage(rows[i]) &&
      !isClientOutboundAuraMessage(rows[i], sessionUserId)
    ) {
      promos.push(rows[i]);
      i += 1;
    }
    const first = promos[0];
    out.push({
      id: `promo-list-${promos.map((p) => p.id).join('-')}`,
      __promoList: true,
      promos,
      content_type: PROMO_INVENTARIO_CONTENT_TYPE,
      created_at: first?.created_at,
      created_by_name: first?.created_by_name,
      client_id: first?.client_id,
    });
  }
  return out;
}
