import {
  ANDREAS_META,
  isPedidoAppEfectivoRetiroSalon,
  isPedidoAppTarjetaDelivery,
} from './andreasPremios.js';
import { getArticuloTipo } from './inventarioMeta.js';
import { countCitasPremios } from './referidoPremios.js';

export const PREMIO_REGLA = {
  EFECTIVO: 'p_app_efectivo_retiro',
  TARJETA: 'p_app_tarjeta_delivery',
  CITAS: 'citas',
  SALON: 'salon',
  REFERIDOS: 'referidos',
};

function defaultRuleState() {
  return { puntos: 0, pedidos_ids: [], canje_pendiente: null, citas_base_verificadas: null };
}

function cloneAp(ap) {
  return ap && typeof ap === 'object' && !Array.isArray(ap) ? { ...ap } : {};
}

export function getReglasState(andreasPremios) {
  const ap = cloneAp(andreasPremios);
  const reglas = ap.reglas && typeof ap.reglas === 'object' ? { ...ap.reglas } : {};
  for (const id of Object.values(PREMIO_REGLA)) {
    if (id === PREMIO_REGLA.REFERIDOS) continue;
    if (!reglas[id] || typeof reglas[id] !== 'object') {
      reglas[id] = defaultRuleState();
    } else {
      const baseRaw = reglas[id].citas_base_verificadas;
      reglas[id] = {
        puntos: Math.max(0, Math.floor(Number(reglas[id].puntos) || 0)),
        pedidos_ids: Array.isArray(reglas[id].pedidos_ids)
          ? reglas[id].pedidos_ids.map(String)
          : [],
        canje_pendiente: reglas[id].canje_pendiente || null,
        citas_base_verificadas:
          baseRaw === null || baseRaw === undefined
            ? null
            : Math.max(0, Math.floor(Number(baseRaw) || 0)),
      };
    }
  }
  ap.reglas = reglas;
  return ap;
}

export function ruleIdForOrder(order) {
  if (!order) return null;
  if (isPedidoAppEfectivoRetiroSalon(order)) return PREMIO_REGLA.EFECTIVO;
  if (isPedidoAppTarjetaDelivery(order)) return PREMIO_REGLA.TARJETA;
  return null;
}

export function countProductoQtyInOrder(lines, orderId) {
  if (!Array.isArray(lines)) return 0;
  let n = 0;
  for (const line of lines) {
    if (String(line.order_id) !== String(orderId)) continue;
    if (getArticuloTipo(line.product) !== 'producto') continue;
    n += Math.max(0, Math.floor(Number(line.qty) || 0));
  }
  return n;
}

export function resolvePremioDiscountPct(membresiaNivel) {
  const id = String(membresiaNivel || '').toLowerCase().trim();
  const base = 19.99;
  const bonus = { bronce: 15, plata: 30, vip: 55 }[id] || 0;
  return Number((base + bonus).toFixed(2));
}

export function andreasMetaAppForMembresia(membresiaNivel) {
  const id = String(membresiaNivel || '').toLowerCase().trim();
  if (id === 'bronce') return 7;
  if (id === 'plata') return 6;
  if (id === 'vip') return 5;
  return ANDREAS_META.appEfectivoRetiro;
}

/** Canje pendiente de la regla citas verificadas (próxima cita en app o venta en salón). */
export function findCanjePendienteForCitas(ap, membresiaNivel) {
  const apNorm = getReglasState(ap);
  const pending = apNorm.reglas[PREMIO_REGLA.CITAS]?.canje_pendiente;
  if (!pending) return null;
  if (pending === true) {
    const meta = Math.max(1, Math.floor(Number(ANDREAS_META.citas) || 8));
    return {
      ruleId: PREMIO_REGLA.CITAS,
      rule_id: PREMIO_REGLA.CITAS,
      descuento_pct: resolvePremioDiscountPct(membresiaNivel),
      meta,
    };
  }
  if (typeof pending !== 'object') return null;
  return {
    ruleId: PREMIO_REGLA.CITAS,
    rule_id: PREMIO_REGLA.CITAS,
    descuento_pct: Number(pending.descuento_pct) || resolvePremioDiscountPct(membresiaNivel),
    meta: Number(pending.meta) || ANDREAS_META.citas,
  };
}

/**
 * Canje de producto en tienda app (efectivo+retiro o tarjeta+envío).
 * Incluye fallback cuando ya alcanzó la meta pero aún no se persistió canje_pendiente.
 */
export function resolveCheckoutCanjeParaCliente(cliente, { payment_method, shipId }) {
  if (!cliente?.id) return null;
  const apNorm = getReglasState(cliente.andreas_premios);
  const fakeOrder = {
    payment_method,
    fulfillment_type: shipId === 'ship-home' ? 'domicilio' : 'retiro_salon',
  };
  const ruleId = ruleIdForOrder(fakeOrder);
  if (!ruleId) return null;

  const meta = andreasMetaAppForMembresia(cliente.membresia_nivel);
  const pending = findCanjePendienteForCheckout(cliente.andreas_premios, { payment_method, shipId });
  if (pending) {
    return {
      ...pending,
      rule_id: pending.rule_id || pending.ruleId || ruleId,
      ruleId: pending.ruleId || pending.rule_id || ruleId,
      descuento_pct:
        Number(pending.descuento_pct) || resolvePremioDiscountPct(cliente.membresia_nivel) || 19.99,
    };
  }

  const rule = apNorm.reglas[ruleId];
  if (rule?.canje_pendiente) return null;
  const puntos = Math.max(0, Math.floor(Number(rule?.puntos) || 0));
  if (puntos < meta) return null;

  const pct = resolvePremioDiscountPct(cliente.membresia_nivel) || 19.99;
  return {
    ruleId,
    rule_id: ruleId,
    descuento_pct: pct,
    meta,
  };
}

/** Canje pendiente aplicable al pedido que se está creando en tienda. */
export function findCanjePendienteForCheckout(ap, { payment_method, fulfillment_type, shipId }) {
  const apNorm = getReglasState(ap);
  const fakeOrder = {
    payment_method,
    fulfillment_type:
      fulfillment_type ||
      (shipId === 'ship-home' ? 'domicilio' : 'retiro_salon'),
  };
  const ruleId = ruleIdForOrder(fakeOrder);
  if (!ruleId) return null;
  const pending = apNorm.reglas[ruleId]?.canje_pendiente;
  if (!pending || typeof pending !== 'object') return null;
  return {
    ruleId,
    rule_id: ruleId,
    descuento_pct: Number(pending.descuento_pct) || resolvePremioDiscountPct(),
    meta: Number(pending.meta) || ANDREAS_META.appEfectivoRetiro,
  };
}

export function applyDiscountToSubtotal(subtotal, descuentoPct) {
  const base = Math.max(0, Number(subtotal) || 0);
  const pct = Math.min(100, Math.max(0, Number(descuentoPct) || 0));
  const discount = Math.round(base * (pct / 100) * 100) / 100;
  return {
    subtotal: base,
    discount,
    total: Math.max(0, Math.round((base - discount) * 100) / 100),
    descuento_pct: pct,
  };
}

/**
 * Reconcilia reglas de producto app con pedidos entregados (self-heal al abrir Premios).
 */
export function syncReglasProductosFromPedidos(ap, orders, lines, meta, membresiaNivel) {
  if (!Array.isArray(orders) || !Array.isArray(lines)) return getReglasState(ap);
  let apNorm = getReglasState(ap);
  for (const order of orders) {
    if (String(order?.status || '').toLowerCase() !== 'delivered') continue;
    const qty = countProductoQtyInOrder(lines, order.id);
    if (qty < 1) continue;
    const canjeSnap = parseCanjeFromCheckoutSnapshot(order.checkout_snapshot);
    if (canjeSnap?.rule_id) {
      apNorm = syncReglaOnCanjeRedeemed(
        apNorm,
        canjeSnap.rule_id,
        order.id,
        qty,
        meta,
        membresiaNivel,
      );
    } else {
      apNorm = syncReglaOnPedidoDelivered(apNorm, order, qty, meta, membresiaNivel);
    }
  }
  return apNorm;
}

/**
 * Tras entregar un pedido app: actualiza ciclo, reinicia si había canje pendiente, marca nuevo canje.
 */
export function syncReglaOnPedidoDelivered(ap, order, productQty, meta, membresiaNivel) {
  const ruleId = ruleIdForOrder(order);
  if (!ruleId || productQty < 1) return getReglasState(ap);

  const apNorm = getReglasState(ap);
  const rule = apNorm.reglas[ruleId];
  const orderKey = String(order.id);
  const m = Math.max(1, Math.floor(Number(meta) || ANDREAS_META.appEfectivoRetiro));
  const descuento = resolvePremioDiscountPct(membresiaNivel);

  if (rule.pedidos_ids.includes(orderKey)) {
    return apNorm;
  }

  if (rule.canje_pendiente) {
    rule.puntos = productQty;
    rule.pedidos_ids = [orderKey];
    apNorm.reglas[ruleId] = rule;
    return apNorm;
  }

  rule.puntos += productQty;
  rule.pedidos_ids.push(orderKey);

  if (rule.puntos >= m && !rule.canje_pendiente) {
    rule.canje_pendiente = {
      at: new Date().toISOString(),
      descuento_pct: descuento,
      meta: m,
      rule_id: ruleId,
    };
  }

  apNorm.reglas[ruleId] = rule;
  return apNorm;
}

/**
 * Canje consumido en un pedido (checkout o cobro QR): reinicia ciclo y suma 1 punto por la compra canjeada.
 */
export function syncReglaOnCanjeRedeemed(ap, ruleId, orderId, productQty = 1, meta, membresiaNivel) {
  const apNorm = getReglasState(ap);
  const rule = apNorm.reglas[ruleId] || defaultRuleState();
  const m = Math.max(1, Math.floor(Number(meta) || ANDREAS_META.appEfectivoRetiro));
  const qty = Math.max(1, Math.floor(Number(productQty) || 1));
  const orderKey = orderId != null ? String(orderId) : null;

  rule.canje_pendiente = null;
  rule.puntos = qty;
  rule.pedidos_ids = orderKey ? [orderKey] : [];

  if (rule.puntos >= m) {
    rule.canje_pendiente = {
      at: new Date().toISOString(),
      descuento_pct: resolvePremioDiscountPct(membresiaNivel),
      meta: m,
      rule_id: ruleId,
    };
  }

  apNorm.reglas[ruleId] = rule;
  return apNorm;
}

/**
 * Tras consumir canje de citas (venta en caja o cita en app): reinicia ciclo en 1 punto.
 * `citas_base_verificadas` evita que el total histórico de citas vuelva a marcar canje al instante.
 */
export function syncReglaCitasOnCanjeRedeemed(
  ap,
  consumeId,
  citasVerificadasAtRedeem,
  meta,
  membresiaNivel,
) {
  const apNorm = getReglasState(ap);
  const rule = apNorm.reglas[PREMIO_REGLA.CITAS] || defaultRuleState();
  const v = Math.max(0, Math.floor(Number(citasVerificadasAtRedeem) || 0));

  rule.canje_pendiente = null;
  rule.puntos = 1;
  rule.pedidos_ids = consumeId != null ? [String(consumeId)] : [];
  rule.citas_base_verificadas = v;

  apNorm.reglas[PREMIO_REGLA.CITAS] = rule;
  return apNorm;
}

export function syncReglaCitas(ap, citasVerificadas, meta, membresiaNivel) {
  const apNorm = getReglasState(ap);
  const rule = apNorm.reglas[PREMIO_REGLA.CITAS];
  const m = Math.max(1, Math.floor(Number(meta) || ANDREAS_META.citas));
  const v = Math.max(0, Math.floor(Number(citasVerificadas) || 0));
  const descuento = resolvePremioDiscountPct(membresiaNivel);

  if (rule.canje_pendiente) {
    rule.puntos = Math.max(rule.puntos, Math.min(v, m));
    apNorm.reglas[PREMIO_REGLA.CITAS] = rule;
    return apNorm;
  }

  const enCiclo =
    rule.citas_base_verificadas !== null && rule.citas_base_verificadas !== undefined;
  if (enCiclo) {
    const base = Math.max(0, Math.floor(Number(rule.citas_base_verificadas) || 0));
    rule.puntos = Math.min(m, 1 + Math.max(0, v - base));
    if (rule.puntos >= m) {
      rule.canje_pendiente = {
        at: new Date().toISOString(),
        descuento_pct: descuento,
        meta: m,
        rule_id: PREMIO_REGLA.CITAS,
      };
    }
    apNorm.reglas[PREMIO_REGLA.CITAS] = rule;
    return apNorm;
  }

  rule.puntos = v;
  if (v >= m) {
    rule.canje_pendiente = {
      at: new Date().toISOString(),
      descuento_pct: descuento,
      meta: m,
      rule_id: PREMIO_REGLA.CITAS,
    };
  }

  apNorm.reglas[PREMIO_REGLA.CITAS] = rule;
  return apNorm;
}

/** Salón físico: canje en recepción reinicia y deja 1 unidad. */
export function syncSalonFisicoOnCanje(ap, meta, membresiaNivel) {
  const apNorm = cloneAp(ap);
  const m = Math.max(1, Math.floor(Number(meta) || ANDREAS_META.salon));
  apNorm.salon_fisico_unidades = 1;
  apNorm.salon_fisico_canje_pendiente = null;
  apNorm.salon_fisico_venta_ids = Array.isArray(apNorm.salon_fisico_venta_ids)
    ? apNorm.salon_fisico_venta_ids
    : [];
  if (apNorm.salon_fisico_unidades >= m) {
    apNorm.salon_fisico_canje_pendiente = {
      at: new Date().toISOString(),
      descuento_pct: resolvePremioDiscountPct(membresiaNivel),
      meta: m,
    };
  }
  return apNorm;
}

/** Tras venta en caja con canje salón físico: reinicia ciclo y deja unidades = productos de esa venta. */
export function syncSalonFisicoOnCanjeRedeemed(ap, productQty, meta, membresiaNivel, ventaId = null) {
  const apNorm = cloneAp(ap);
  const m = Math.max(1, Math.floor(Number(meta) || ANDREAS_META.salon));
  const qty = Math.max(1, Math.floor(Number(productQty) || 1));
  apNorm.salon_fisico_unidades = qty;
  apNorm.salon_fisico_canje_pendiente = null;
  const ids = Array.isArray(apNorm.salon_fisico_venta_ids)
    ? apNorm.salon_fisico_venta_ids.map(String)
    : [];
  if (ventaId != null && !ids.includes(String(ventaId))) {
    apNorm.salon_fisico_venta_ids = [...ids, String(ventaId)];
  } else {
    apNorm.salon_fisico_venta_ids = ids;
  }
  if (qty >= m) {
    apNorm.salon_fisico_canje_pendiente = {
      at: new Date().toISOString(),
      descuento_pct: resolvePremioDiscountPct(membresiaNivel),
      meta: m,
    };
  }
  return apNorm;
}

export const SALON_CANJE_VENTA_MARK = 'ANDREAS_CANJE_SALON';

export function mergeVentaNotasConCanjeSalon(baseNotas, canjeSnap) {
  if (!canjeSnap) return baseNotas || null;
  const base = String(baseNotas || '').trim();
  const payload = `${SALON_CANJE_VENTA_MARK}:${encodeURIComponent(JSON.stringify(canjeSnap))}`;
  return base ? `${base} · ${payload}` : payload;
}

export function parseSalonCanjeFromVentaNotas(notas) {
  const m = String(notas || '').match(/ANDREAS_CANJE_SALON:([^·\n]+)/);
  if (!m) return null;
  try {
    const c = JSON.parse(decodeURIComponent(m[1].trim()));
    if (!c || typeof c !== 'object') return null;
    return {
      descuento_pct: Number(c.descuento_pct) || 0,
      descuento_monto: Number(c.descuento_monto) || 0,
      subtotal_productos: Number(c.subtotal_productos) || 0,
    };
  } catch {
    return null;
  }
}

/** Quita el bloque técnico ANDREAS_CANJE_SALON; deja solo notas escritas por el staff. */
export function stripSalonCanjeMarkerFromVentaNotas(notas) {
  const raw = String(notas || '').trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/\s*·\s*ANDREAS_CANJE_SALON:[^·\n]+/gi, '')
    .replace(/ANDREAS_CANJE_SALON:[^·\n]+/gi, '')
    .replace(/\s*·\s*$/g, '')
    .trim();
  return cleaned || null;
}

export function markSalonFisicoCanjePendiente(ap, unidades, meta, membresiaNivel) {
  const apNorm = cloneAp(ap);
  const u = Math.max(0, Math.floor(Number(unidades) || 0));
  const m = Math.max(1, Math.floor(Number(meta) || ANDREAS_META.salon));
  apNorm.salon_fisico_unidades = u;
  if (u >= m && !apNorm.salon_fisico_canje_pendiente) {
    apNorm.salon_fisico_canje_pendiente = {
      at: new Date().toISOString(),
      descuento_pct: resolvePremioDiscountPct(membresiaNivel),
      meta: m,
    };
  }
  return apNorm;
}

/** Contadores para Premios UI (con fallback legacy). */
export function buildPremiosCountsFromReglas(ap, legacy = {}) {
  const apNorm = getReglasState(ap);
  const salonU = Math.max(
    0,
    Math.floor(Number(apNorm.salon_fisico_unidades) ?? legacy.productosSalonFisico ?? 0),
  );
  const citasRule = apNorm.reglas[PREMIO_REGLA.CITAS];
  const efectRule = apNorm.reglas[PREMIO_REGLA.EFECTIVO];
  const tarjRule = apNorm.reglas[PREMIO_REGLA.TARJETA];

  const hasReglasInit = Boolean(ap?.reglas);

  return {
    productosAppEfectivoRetiro: hasReglasInit
      ? efectRule.puntos
      : (legacy.productosAppEfectivoRetiro ?? 0),
    productosAppTarjetaDelivery: hasReglasInit
      ? tarjRule.puntos
      : (legacy.productosAppTarjetaDelivery ?? 0),
    productosAppEfectivoRetiroPendiente: legacy.productosAppEfectivoRetiroPendiente ?? 0,
    productosAppTarjetaDeliveryPendiente: legacy.productosAppTarjetaDeliveryPendiente ?? 0,
    citasVerificadas: hasReglasInit ? citasRule.puntos : (legacy.citasVerificadas ?? 0),
    citasPendientes: legacy.citasPendientes ?? 0,
    productosSalonFisico: salonU,
    canjePendiente: {
      [PREMIO_REGLA.EFECTIVO]: efectRule.canje_pendiente,
      [PREMIO_REGLA.TARJETA]: tarjRule.canje_pendiente,
      [PREMIO_REGLA.CITAS]: citasRule.canje_pendiente,
      [PREMIO_REGLA.SALON]: apNorm.salon_fisico_canje_pendiente || null,
    },
    reglas: apNorm.reglas,
  };
}

export function parseCanjeFromCheckoutSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const c = snapshot.andreas_canje;
  if (!c || typeof c !== 'object') return null;
  return {
    rule_id: String(c.rule_id || ''),
    descuento_pct: Number(c.descuento_pct) || 0,
    descuento_monto: Number(c.descuento_monto) || 0,
    subtotal_antes: Number(c.subtotal_antes) || 0,
  };
}

export { countCitasPremios };
