import {
  PREMIO_REGLA,
  applyDiscountToSubtotal,
  findCanjePendienteForCitas,
  getReglasState,
  resolvePremioDiscountPct,
  syncReglaCitas,
} from './andreasPremiosCycles.js';
import { andreasMetaCitasForMembresia } from './andreasPremiosCitasAgenda.js';
import { findCanjePendienteForReferidos } from './andreasReferidos.js';
import { pickBestCanjeServicio } from './andreasPremiosCitasAgenda.js';
import { resolveSalonCanjeParaCliente } from './andreasPremiosSalonVenta.js';

/**
 * Cliente con canje pendiente de citas / servicios (módulo Vender).
 * No exige user_id: el staff puede aplicar el descuento en caja aunque la ficha no esté enlazada.
 */
export function resolveCitasCanjeParaCliente(
  cliente,
  citasVerificadasExternas = null,
  referidosTotalValidados = null,
) {
  if (!cliente?.id) return null;

  const meta = andreasMetaCitasForMembresia(cliente.membresia_nivel);
  const ap = cliente.andreas_premios;
  const citasPendingRaw = findCanjePendienteForCitas(ap, cliente.membresia_nivel);
  const referidosPendingRaw = findCanjePendienteForReferidos(ap, referidosTotalValidados);
  const apNorm = getReglasState(ap);
  const rule = apNorm.reglas[PREMIO_REGLA.CITAS];
  const enCiclo =
    rule?.citas_base_verificadas !== null && rule?.citas_base_verificadas !== undefined;

  const citasCandidate = citasPendingRaw
    ? {
        descuento_pct:
          Number(citasPendingRaw.descuento_pct) ||
          resolvePremioDiscountPct(cliente.membresia_nivel) ||
          19.99,
        meta: Number(citasPendingRaw.meta) || meta,
        citas: Math.max(rule?.puntos ?? 0, citasVerificadasExternas ?? 0),
        ruleId: PREMIO_REGLA.CITAS,
        rule_id: PREMIO_REGLA.CITAS,
        requiereApp: !cliente.user_id,
      }
    : null;

  const referidosCandidate = referidosPendingRaw
    ? {
        descuento_pct: referidosPendingRaw.descuento_pct,
        meta: referidosPendingRaw.meta,
        ruleId: PREMIO_REGLA.REFERIDOS,
        rule_id: PREMIO_REGLA.REFERIDOS,
        ciclo: referidosPendingRaw.ciclo,
        requiereApp: false,
      }
    : null;

  const best = pickBestCanjeServicio(citasCandidate, referidosCandidate);
  if (best) return best;

  if (enCiclo) return null;

  const puntosRegla = Math.max(0, Math.floor(Number(rule?.puntos) || 0));
  const citasDb =
    citasVerificadasExternas != null
      ? Math.max(0, Math.floor(Number(citasVerificadasExternas) || 0))
      : null;
  const citas = citasDb != null ? citasDb : puntosRegla;
  if (citas < meta) return null;

  const pct = resolvePremioDiscountPct(cliente.membresia_nivel) || 19.99;
  return {
    descuento_pct: pct,
    meta,
    citas,
    ruleId: PREMIO_REGLA.CITAS,
    rule_id: PREMIO_REGLA.CITAS,
    requiereApp: !cliente.user_id,
  };
}

/** Sincroniza regla citas y marca canje pendiente si ya alcanzó la meta. */
export function ensureCitasCanjeEnAp(ap, citasVerificadas, membresiaNivel) {
  const meta = andreasMetaCitasForMembresia(membresiaNivel);
  return syncReglaCitas(ap, citasVerificadas, meta, membresiaNivel);
}

/** Descuento del canje solo sobre líneas de servicio (no productos). */
export function calcCitasCanjeDescuentoEnLineas(lines, canje) {
  if (!canje || !Array.isArray(lines) || !lines.length) {
    return { servicioSubtotal: 0, descuentoMonto: 0, descuentoPct: 0, canjeSnap: null };
  }
  let servicioSubtotal = 0;
  for (const l of lines) {
    if (!l.esServicio) continue;
    servicioSubtotal += Number(l.qty || 0) * Number(l.precioUnit || 0);
  }
  servicioSubtotal = Math.round(servicioSubtotal * 100) / 100;
  if (servicioSubtotal <= 0) {
    return { servicioSubtotal: 0, descuentoMonto: 0, descuentoPct: 0, canjeSnap: null };
  }
  const calc = applyDiscountToSubtotal(servicioSubtotal, canje.descuento_pct);
  const ruleId = canje.rule_id || canje.ruleId || PREMIO_REGLA.CITAS;
  const canjeSnap = {
    rule_id: ruleId,
    descuento_pct: calc.descuento_pct,
    descuento_monto: calc.discount,
    precio_antes: calc.subtotal,
  };
  if (ruleId === PREMIO_REGLA.REFERIDOS && canje.ciclo != null) {
    canjeSnap.referidos_ciclo = Math.max(0, Math.min(2, Math.floor(Number(canje.ciclo) || 0)));
  }
  return {
    servicioSubtotal,
    descuentoMonto: calc.discount,
    descuentoPct: calc.descuento_pct,
    canjeSnap,
  };
}

export function countServicioQtyEnLineasVenta(lines) {
  if (!Array.isArray(lines)) return 0;
  let n = 0;
  for (const l of lines) {
    if (!l.esServicio) continue;
    n += Math.max(0, Math.floor(Number(l.qty) || 0));
  }
  return n;
}

/** Etiqueta corta en listas de clientes (Vender). */
export function labelCanjeAndreasCliente(cliente) {
  const parts = [];
  if (resolveCitasCanjeParaCliente(cliente)) parts.push('servicio');
  if (resolveSalonCanjeParaCliente(cliente)) parts.push('producto');
  if (!parts.length) return '';
  return ` · Canje ANDREAS (${parts.join(' + ')})`;
}
