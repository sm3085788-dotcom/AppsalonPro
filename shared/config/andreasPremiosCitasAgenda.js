import { ANDREAS_META } from './andreasPremios.js';
import {
  PREMIO_REGLA,
  applyDiscountToSubtotal,
  findCanjePendienteForCitas,
} from './andreasPremiosCycles.js';

const CANJE_MARK = 'ANDREAS_CANJE:';

export function andreasMetaCitasForMembresia(membresiaNivel) {
  const id = String(membresiaNivel || '').toLowerCase().trim();
  if (id === 'bronce') return 7;
  if (id === 'plata') return 6;
  if (id === 'vip') return 5;
  return ANDREAS_META.citas;
}

/** Elige el canje de servicio con mayor descuento (citas verificadas vs referidos). */
export function pickBestCanjeServicio(...candidates) {
  const list = candidates.filter(Boolean);
  if (!list.length) return null;
  return list.reduce((best, cur) =>
    (Number(cur.descuento_pct) || 0) > (Number(best.descuento_pct) || 0) ? cur : best,
  );
}

/** Precio del servicio con descuento de canje (citas verificadas o referidos). */
export function resolvePrecioServicioConCanjeCitas(precioBase, canjePending) {
  const base = Math.max(0, Number(precioBase) || 0);
  if (!canjePending?.descuento_pct) {
    return { precio: base, canjeSnap: null, calc: null };
  }
  const calc = applyDiscountToSubtotal(base, canjePending.descuento_pct);
  const ruleId = canjePending.rule_id || canjePending.ruleId || PREMIO_REGLA.CITAS;
  const snap = {
    rule_id: ruleId,
    descuento_pct: calc.descuento_pct,
    descuento_monto: calc.discount,
    precio_antes: calc.subtotal,
  };
  if (ruleId === PREMIO_REGLA.REFERIDOS && canjePending.ciclo != null) {
    snap.referidos_ciclo = Math.max(0, Math.min(2, Math.floor(Number(canjePending.ciclo) || 0)));
  }
  return {
    precio: calc.total,
    calc,
    canjeSnap: snap,
  };
}

export function mergeNotasServicioConCanje(baseNotas, canjeSnap) {
  if (!canjeSnap?.rule_id) return String(baseNotas || '').trim() || null;
  const base = String(baseNotas || '').trim();
  const payload = `${CANJE_MARK}${encodeURIComponent(JSON.stringify(canjeSnap))}`;
  return base ? `${base} · ${payload}` : payload;
}

export function parseCanjeFromNotasServicio(notas) {
  const m = String(notas || '').match(/ANDREAS_CANJE:([^·\n]+)/);
  if (!m) return null;
  try {
    const c = JSON.parse(decodeURIComponent(m[1].trim()));
    if (!c || typeof c !== 'object') return null;
    return {
      rule_id: String(c.rule_id || ''),
      descuento_pct: Number(c.descuento_pct) || 0,
      descuento_monto: Number(c.descuento_monto) || 0,
      precio_antes: Number(c.precio_antes) || 0,
    };
  } catch {
    return null;
  }
}

export function stripCanjeMarkerFromNotas(notas) {
  const raw = String(notas || '').trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\s*·\s*ANDREAS_CANJE:[^·\n]+/g, '').trim();
  return cleaned || null;
}

export { findCanjePendienteForCitas };
