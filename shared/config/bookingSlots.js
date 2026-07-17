/** Franjas de reserva web / agenda: 8:00–22:00 cada hora en punto. */

import {
  defaultBookingDateStringGT,
  getSlotStartFromInstant,
  instantFromDateAndSlotGT,
  parseBookingZonedParts,
  snapToBookingSlotGT,
} from './bookingTimezone.js';

export const BOOKING_OPEN = '08:00';
export const BOOKING_CLOSE = '22:00';
export const SLOT_MINUTES = 60;

function parseTimeToMinutes(timeStr) {
  const [h, m] = String(timeStr || '')
    .split(':')
    .map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
}

function formatMinutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getOpenMinutes() {
  return parseTimeToMinutes(BOOKING_OPEN);
}

function getCloseMinutes() {
  return parseTimeToMinutes(BOOKING_CLOSE);
}

/** Lista de horas seleccionables: 08:00 … 22:00 inclusive. */
export function generateBookingSlots() {
  const open = getOpenMinutes();
  const close = getCloseMinutes();
  const slots = [];
  for (let t = open; t <= close; t += SLOT_MINUTES) {
    slots.push(formatMinutesToTime(t));
  }
  return slots;
}

/** Combina YYYY-MM-DD + HH:MM como hora de Guatemala. */
export function combineDateAndSlot(dateStr, slotTime) {
  return instantFromDateAndSlotGT(dateStr, slotTime);
}

/** Normaliza a inicio de franja HH:MM en zona GT (para agrupar citas). */
export function getSlotStart(date) {
  return getSlotStartFromInstant(date);
}

/** Redondea a la hora en punto más cercana dentro de la ventana GT. */
export function snapToBookingSlot(date) {
  return snapToBookingSlotGT(date);
}

/** ¿Fecha/hora válida para reservar? (ventana, incremento, futuro) */
export function isValidBookingSlot(date, now = new Date()) {
  return bookingSlotValidationError(date, now) == null;
}

/** Mensaje de error o null si es válido (validación en zona GT). */
export function bookingSlotValidationError(date, now = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return 'Fecha u hora inválida.';

  const p = parseBookingZonedParts(d);
  if (!p) return 'Fecha u hora inválida.';

  const minutes = p.hour * 60 + p.minute;
  const open = getOpenMinutes();
  const close = getCloseMinutes();

  if (minutes < open || minutes > close) {
    return 'Horario fuera de atención (8:00–22:00).';
  }
  if (p.minute !== 0) {
    return 'Solo franjas en punto (cada hora).';
  }
  const offset = minutes - open;
  if (offset % SLOT_MINUTES !== 0) {
    return 'Solo franjas en punto (cada hora).';
  }
  if (d.getTime() <= now.getTime()) {
    return 'Elegí una fecha y hora en el futuro.';
  }
  return null;
}

/** Fecha sugerida al abrir el picker (mañana, calendario GT). */
export function defaultBookingDateString() {
  return defaultBookingDateStringGT();
}

/** Etiqueta legible 12 h: 08:00 → 8:00 AM, 13:00 → 1:00 PM, 22:00 → 10:00 PM */
export function formatBookingSlotLabel(timeStr, options = {}) {
  const [h24, mi] = String(timeStr || '').split(':').map(Number);
  if (!Number.isFinite(h24) || !Number.isFinite(mi)) return String(timeStr || '');
  const period = h24 < 12 ? 'AM' : 'PM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const label = `${h12}:${String(mi).padStart(2, '0')} ${period}`;
  if (options.congested) return `${label} · saturado`;
  return label;
}
