import { BOOKING_OPEN, SLOT_MINUTES } from './bookingSlots.js';

/** Zona del salón (Guatemala, sin horario de verano). */
export const BOOKING_TIMEZONE = 'America/Guatemala';

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
  return parseTimeToMinutes('22:00');
}

/** Partes de fecha/hora en zona del salón. */
export function parseBookingZonedParts(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;

  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: BOOKING_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    fmt
      .formatToParts(d)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** YYYY-MM-DD en zona del salón (para citas guardadas en UTC). */
export function zonedCalendarDateString(date) {
  const p = parseBookingZonedParts(date);
  if (!p) return '';
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Inicio de franja HH:MM en zona del salón; redondea a la hora en punto. */
export function getSlotStartFromInstant(date) {
  const p = parseBookingZonedParts(date);
  if (!p) return null;

  const minutes = p.hour * 60 + p.minute;
  const open = getOpenMinutes();
  const close = getCloseMinutes();

  if (minutes < open - SLOT_MINUTES / 2 || minutes > close + SLOT_MINUTES / 2) {
    return null;
  }

  const offset = minutes - open;
  let slotIndex = Math.round(offset / SLOT_MINUTES);
  let slotMinutes = open + slotIndex * SLOT_MINUTES;
  if (slotMinutes < open) slotMinutes = open;
  if (slotMinutes > close) slotMinutes = close;

  return formatMinutesToTime(slotMinutes);
}

/**
 * Combina YYYY-MM-DD + HH:MM como hora de Guatemala (UTC−6, sin DST).
 * GT 09:00 → UTC 15:00 vía Date.UTC(y, mo-1, d, h+6, mi).
 */
export function instantFromDateAndSlotGT(dateStr, slotTime) {
  const [y, mo, d] = String(dateStr || '').split('-').map(Number);
  const [h, mi] = String(slotTime || '').split(':').map(Number);
  if (![y, mo, d, h, mi].every(Number.isFinite)) return null;
  return new Date(Date.UTC(y, mo - 1, d, h + 6, mi, 0, 0));
}

/** Mañana según calendario GT (para abrir el picker). */
export function defaultBookingDateStringGT() {
  const today = zonedCalendarDateString(new Date());
  const [y, mo, d] = today.split('-').map(Number);
  if (![y, mo, d].every(Number.isFinite)) return today;
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

/** Normaliza un instante al inicio de franja GT (Date o null). */
export function snapToBookingSlotGT(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const dateStr = zonedCalendarDateString(d);
  const slot = getSlotStartFromInstant(d);
  if (!dateStr || !slot) return null;
  return instantFromDateAndSlotGT(dateStr, slot);
}

/** Rango UTC (ISO) que cubre un día calendario en Guatemala. */
export function dayInstantRangeForCalendarDate(dateStr) {
  const [y, mo, d] = String(dateStr || '').split('-').map(Number);
  if (![y, mo, d].every(Number.isFinite)) {
    return { start: null, end: null };
  }
  const startUtc = Date.UTC(y, mo - 1, d, 6, 0, 0, 0);
  const endUtc = Date.UTC(y, mo - 1, d, 6, 0, 0, 0) + 24 * 60 * 60 * 1000 - 1;
  return {
    start: new Date(startUtc).toISOString(),
    end: new Date(endUtc).toISOString(),
  };
}
