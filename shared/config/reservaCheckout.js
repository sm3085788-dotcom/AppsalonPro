/** Política de anticipo para reservas web / App Clientes (servicios). */

export const BOOKING_DEPOSIT_PERCENT = 0.15;
export const BOOKING_DEPOSIT_MIN_GTQ = 35;
/** Horas mínimas antes de la cita para cancelar con reembolso automático. */
export const BOOKING_REFUND_HOURS_BEFORE = 24;

export const PRECIO_A_TU_MEDIDA_LABEL = 'Precio a tu medida';
export const PRECIO_A_TU_MEDIDA_HINT = 'Según volumen y estilo · se define en tu visita';

export const BOOKING_DEPOSIT_LABEL = 'Anticipo de reserva';
export const BOOKING_DEPOSIT_POLICY =
  'Pagás un anticipo para confirmar tu cita. El valor final del servicio se define en el salón. ' +
  'Cancelá con al menos 24 horas de anticipación y recibirás el reembolso automático del anticipo. ' +
  'Si no asistís sin cancelar, pierdes el anticipo.';

export const BOOKING_META_MARK = '\n\n__WEB_RESERVA_JSON__\n';

/** @typedef {object} BookingNotasMeta
 * @property {string} [payment_intent_id]
 * @property {number} [deposit_gtq]
 * @property {string|null} [servicio_id]
 * @property {boolean} [refunded]
 * @property {string} [refunded_at]
 */

/** Anticipo = max(mínimo fijo, % sobre precio referencia interno). */
export function computeBookingDepositGtq(referencePrice) {
  const ref = Number(referencePrice) || 0;
  const pct = Math.round(ref * BOOKING_DEPOSIT_PERCENT * 100) / 100;
  return Math.max(BOOKING_DEPOSIT_MIN_GTQ, pct);
}

/** ¿Puede el cliente cancelar con reembolso automático? */
export function bookingRefundEligible(fechaHoraIso, now = new Date()) {
  const appt = new Date(fechaHoraIso);
  if (Number.isNaN(appt.getTime())) return false;
  const deadline = appt.getTime() - BOOKING_REFUND_HOURS_BEFORE * 60 * 60 * 1000;
  return now.getTime() <= deadline;
}

export function splitBookingNotas(raw) {
  const s = String(raw || '');
  const i = s.indexOf(BOOKING_META_MARK);
  if (i === -1) return { staff: s.trim(), meta: /** @type {Record<string, unknown>} */ ({}) };
  const staff = s.slice(0, i).trim();
  let meta = /** @type {Record<string, unknown>} */ ({});
  try {
    meta = JSON.parse(s.slice(i + BOOKING_META_MARK.length).trim() || '{}');
  } catch {
    /* ignore */
  }
  return { staff, meta };
}

export function mergeBookingNotas(staff, meta) {
  const clean = String(staff || '').trim();
  if (!meta || !Object.keys(meta).length) return clean;
  return `${clean}${BOOKING_META_MARK}${JSON.stringify(meta)}`;
}
