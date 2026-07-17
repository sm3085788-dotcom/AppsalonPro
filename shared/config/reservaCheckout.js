/** Política de anticipo para reservas web / App Clientes (servicios). */

export const BOOKING_DEPOSIT_PERCENT = 0.15;
export const BOOKING_DEPOSIT_MIN_GTQ = 35;
/** Horas mínimas antes de la cita para cancelar con reembolso automático. */
export const BOOKING_REFUND_HOURS_BEFORE = 3;

export const PRECIO_A_TU_MEDIDA_LABEL = 'Precio a tu medida';
export const PRECIO_A_TU_MEDIDA_HINT = 'Según volumen y estilo · se define en tu visita';

export const BOOKING_DEPOSIT_LABEL = 'Anticipo de reserva';

/** Texto de política de anticipo y cancelación (usa BOOKING_REFUND_HOURS_BEFORE). */
export function bookingDepositPolicyText() {
  const h = BOOKING_REFUND_HOURS_BEFORE;
  const horas = h === 1 ? '1 hora' : `${h} horas`;
  return (
    'Pagás un anticipo para confirmar tu cita. El valor final del servicio se define en el salón. ' +
    `Cancelá con al menos ${horas} de anticipación y recibirás el reembolso automático del anticipo en tu tarjeta. ` +
    'Si cancelás dentro de ese plazo o no asistís sin cancelar, pierdes el anticipo.'
  );
}

/** @deprecated Usar bookingDepositPolicyText() para texto actualizado. */
export const BOOKING_DEPOSIT_POLICY = bookingDepositPolicyText();

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

/** Mensaje cuando ya no aplica reembolso por plazo. */
export function bookingRefundTooLateMessage() {
  const h = BOOKING_REFUND_HOURS_BEFORE;
  const horas = h === 1 ? '1 hora' : `${h} horas`;
  return `Solo podés cancelar con reembolso automático hasta ${horas} antes de la cita. Si no asistís, pierdes el anticipo.`;
}

/** Fecha/hora límite para cancelar con reembolso (ISO). */
export function bookingRefundDeadlineIso(fechaHoraIso) {
  const appt = new Date(fechaHoraIso);
  if (Number.isNaN(appt.getTime())) return null;
  return new Date(
    appt.getTime() - BOOKING_REFUND_HOURS_BEFORE * 60 * 60 * 1000,
  ).toISOString();
}

const WEB_RESERVA_META_TAG = '__WEB_RESERVA_JSON__';

function parseWebReservaMetaJson(raw) {
  let meta = /** @type {Record<string, unknown>} */ ({});
  try {
    meta = JSON.parse(String(raw || '').trim() || '{}');
  } catch {
    /* ignore */
  }
  return meta;
}

export function splitBookingNotas(raw) {
  const s = String(raw || '');
  const i = s.indexOf(BOOKING_META_MARK);
  if (i !== -1) {
    const staff = s.slice(0, i).trim();
    return { staff, meta: parseWebReservaMetaJson(s.slice(i + BOOKING_META_MARK.length)) };
  }

  const alt = s.indexOf(WEB_RESERVA_META_TAG);
  if (alt !== -1) {
    const staff = s.slice(0, alt).trim();
    const afterTag = s.slice(alt + WEB_RESERVA_META_TAG.length);
    return { staff, meta: parseWebReservaMetaJson(afterTag) };
  }

  return { staff: s.trim(), meta: /** @type {Record<string, unknown>} */ ({}) };
}

export function mergeBookingNotas(staff, meta) {
  const clean = String(staff || '').trim();
  if (!meta || !Object.keys(meta).length) return clean;
  return `${clean}${BOOKING_META_MARK}${JSON.stringify(meta)}`;
}
