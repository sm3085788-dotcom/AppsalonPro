import { ANDREAS_META, parseSalonFisicoUnidades, parseSalonFisicoCanjePendiente } from './andreasPremios.js';
import {
  applyDiscountToSubtotal,
  markSalonFisicoCanjePendiente,
  resolvePremioDiscountPct,
} from './andreasPremiosCycles.js';

export function andreasMetaSalonForMembresia(membresiaNivel) {
  const id = String(membresiaNivel || '').toLowerCase().trim();
  if (id === 'bronce') return 7;
  if (id === 'plata') return 6;
  if (id === 'vip') return 5;
  return ANDREAS_META.salon;
}

/** Cliente con app verificada y canje pendiente de salón físico (módulo Vender). */
export function resolveSalonCanjeParaCliente(cliente) {
  if (!cliente?.id || !cliente?.user_id) return null;
  const ap = cliente.andreas_premios;
  const pending = parseSalonFisicoCanjePendiente(ap);
  const unidades = parseSalonFisicoUnidades(ap);
  const meta = andreasMetaSalonForMembresia(cliente.membresia_nivel);
  const metaAlcanzada = unidades >= meta;
  if (!pending && !metaAlcanzada) return null;
  const pct =
    Number(pending?.descuento_pct) ||
    resolvePremioDiscountPct(cliente.membresia_nivel) ||
    19.99;
  return {
    descuento_pct: pct,
    meta: Number(pending?.meta) || meta,
    unidades,
  };
}

/** Asegura JSON con canje pendiente cuando ya alcanzó la meta (p. ej. RPC sin descuento_pct). */
export function ensureSalonFisicoCanjeEnAp(ap, membresiaNivel) {
  const u = parseSalonFisicoUnidades(ap);
  const meta = andreasMetaSalonForMembresia(membresiaNivel);
  if (u < meta) return ap;
  if (parseSalonFisicoCanjePendiente(ap)) return ap;
  return markSalonFisicoCanjePendiente(ap, u, meta, membresiaNivel);
}

/** Descuento del canje solo sobre líneas de producto (no servicios). */
export function calcSalonCanjeDescuentoEnLineas(lines, canje) {
  if (!canje || !Array.isArray(lines) || !lines.length) {
    return { productSubtotal: 0, descuentoMonto: 0, descuentoPct: 0, canjeSnap: null };
  }
  let productSubtotal = 0;
  for (const l of lines) {
    if (l.esServicio) continue;
    productSubtotal += Number(l.qty || 0) * Number(l.precioUnit || 0);
  }
  productSubtotal = Math.round(productSubtotal * 100) / 100;
  if (productSubtotal <= 0) {
    return { productSubtotal: 0, descuentoMonto: 0, descuentoPct: 0, canjeSnap: null };
  }
  const calc = applyDiscountToSubtotal(productSubtotal, canje.descuento_pct);
  return {
    productSubtotal,
    descuentoMonto: calc.discount,
    descuentoPct: calc.descuento_pct,
    canjeSnap: {
      descuento_pct: calc.descuento_pct,
      descuento_monto: calc.discount,
      subtotal_productos: calc.subtotal,
    },
  };
}

export function countProductoQtyEnLineasVenta(lines) {
  if (!Array.isArray(lines)) return 0;
  let n = 0;
  for (const l of lines) {
    if (l.esServicio) continue;
    n += Math.max(0, Math.floor(Number(l.qty) || 0));
  }
  return n;
}
