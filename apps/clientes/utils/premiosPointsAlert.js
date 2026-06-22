/** Snapshot de progreso ANDREAS para alerta campanita en Inicio → Premios. */

import { ANDREAS_META } from '@appsalon/shared-config';

export const PREMIOS_PROGRESS_STORAGE_KEY = '@appsalon/clientes/premios_progress_ack';
export const PREMIOS_CANJE_FLAGS_KEY = '@appsalon/clientes/premios_canje_flags_ack';

const META_BY_MEMBRESIA = {
  bronce: 7,
  plata: 6,
  vip: 5,
};

function n(v) {
  const x = Math.floor(Number(v) || 0);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

/** Meta de puntos/citas según membresía activa (referidos siempre 3). */
export function resolvePremiosMeta(membresiaNivel) {
  const id = String(membresiaNivel || '').toLowerCase().trim();
  return META_BY_MEMBRESIA[id] ?? ANDREAS_META.appEfectivoRetiro;
}

/** Totales visibles en Premios (verificados + en camino). */
export function buildPremiosProgressSnapshot(resumen) {
  if (!resumen || typeof resumen !== 'object') return null;
  return {
    efectivo:
      n(resumen.productosAppEfectivoRetiro) + n(resumen.productosAppEfectivoRetiroPendiente),
    tarjeta:
      n(resumen.productosAppTarjetaDelivery) + n(resumen.productosAppTarjetaDeliveryPendiente),
    citas: n(resumen.citasVerificadas) + n(resumen.citasPendientes),
    salon: n(resumen.productosSalonFisico),
    referidos: n(resumen.referidosPrimeraCompra),
  };
}

export function premiosProgressIncreased(prev, next) {
  if (!prev || !next) return false;
  return (
    next.efectivo > (prev.efectivo ?? 0) ||
    next.tarjeta > (prev.tarjeta ?? 0) ||
    next.citas > (prev.citas ?? 0) ||
    next.salon > (prev.salon ?? 0) ||
    next.referidos > (prev.referidos ?? 0)
  );
}

function canjePendienteActivo(resumen, ruleId) {
  const cp = resumen?.canjePendiente;
  if (!cp || typeof cp !== 'object') return false;
  return Boolean(cp[ruleId]);
}

/** Regla lista para canje o recordatorio de canje pendiente sin haber canjeado. */
export function buildPremiosCanjeFlags(resumen, meta = ANDREAS_META.appEfectivoRetiro) {
  if (!resumen || typeof resumen !== 'object') return null;
  const m = Math.max(1, Math.floor(Number(meta) || ANDREAS_META.appEfectivoRetiro));
  const refMeta = ANDREAS_META.referidos;
  return {
    p_app_efectivo_retiro:
      canjePendienteActivo(resumen, 'p_app_efectivo_retiro') ||
      n(resumen.productosAppEfectivoRetiro) >= m,
    p_app_tarjeta_delivery:
      canjePendienteActivo(resumen, 'p_app_tarjeta_delivery') ||
      n(resumen.productosAppTarjetaDelivery) >= m,
    citas: canjePendienteActivo(resumen, 'citas') || n(resumen.citasVerificadas) >= m,
    salon: canjePendienteActivo(resumen, 'salon') || n(resumen.productosSalonFisico) >= m,
    referidos: canjePendienteActivo(resumen, 'referidos'),
  };
}

/** Solo recordatorio en tarjeta (ciclo reiniciado tras compra sin canjear). */
export function buildPremiosCanjePendienteFlags(resumen) {
  if (!resumen?.canjePendiente || typeof resumen.canjePendiente !== 'object') return null;
  const cp = resumen.canjePendiente;
  return {
    p_app_efectivo_retiro: Boolean(cp.p_app_efectivo_retiro),
    p_app_tarjeta_delivery: Boolean(cp.p_app_tarjeta_delivery),
    citas: Boolean(cp.citas),
    salon: Boolean(cp.salon),
    referidos: Boolean(cp.referidos),
  };
}

export function anyPremiosCanjeReady(flags) {
  if (!flags || typeof flags !== 'object') return false;
  return Object.values(flags).some(Boolean);
}

/** Alguna regla pasó a «lista para canje» respecto al snapshot guardado. */
export function premiosCanjeNewlyUnlocked(prev, next) {
  if (!next || typeof next !== 'object') return false;
  if (!prev || typeof prev !== 'object') return false;
  return Object.keys(next).some((k) => Boolean(next[k]) && !prev[k]);
}

const CANJE_UNLOCK_PRIORITY = [
  'p_app_efectivo_retiro',
  'p_app_tarjeta_delivery',
  'citas',
  'salon',
  'referidos',
];

/** Reglas que acaban de quedar listas para canje. */
export function listPremiosCanjeNewlyUnlocked(prev, next) {
  if (!next || typeof next !== 'object') return [];
  if (!prev || typeof prev !== 'object') {
    return Object.keys(next).filter((k) => Boolean(next[k]));
  }
  return Object.keys(next).filter((k) => Boolean(next[k]) && !prev[k]);
}

/** Una regla principal si se desbloquearon varias a la vez (p. ej. modal ¡Ganaste!). */
export function pickPrimaryPremiosCanjeUnlock(prev, next) {
  const ids = listPremiosCanjeNewlyUnlocked(prev, next);
  return CANJE_UNLOCK_PRIORITY.find((id) => ids.includes(id)) ?? ids[0] ?? null;
}

const CELEBRATION_HINT_BY_RULE = {
  p_app_efectivo_retiro:
    'Usalo en tu próxima compra en la tienda de la app (productos, efectivo y retiro en salón). El descuento se aplica al confirmar el pedido.',
  p_app_tarjeta_delivery:
    'Usalo en tu próxima compra en la tienda de la app (productos, tarjeta y envío a domicilio). El descuento se aplica al confirmar el pedido.',
  citas:
    'Usalo al agendar tu próxima cita desde Servicios en la app. El descuento se aplica automáticamente en el servicio elegido.',
  salon:
    'Usalo en tu próxima compra de producto en el salón físico (caja con tu perfil vinculado). El equipo aplica el descuento al cobrar.',
  referidos:
    'Usalo al agendar un servicio desde Servicios en la app: el descuento se aplica automáticamente en el precio. Coordiná en recepción la sesión de fotos del premio.',
};

/** Texto corto del modal de celebración según el premio desbloqueado. */
export function getPremiosCelebrationHint(ruleId) {
  const id = String(ruleId || '').trim();
  if (id && CELEBRATION_HINT_BY_RULE[id]) return CELEBRATION_HINT_BY_RULE[id];
  return (
    'Aplicá el canje en tu próxima compra en la tienda de la app o en productos en el salón físico. ' +
    'Revisá Premios para ver el detalle de cada regla.'
  );
}
