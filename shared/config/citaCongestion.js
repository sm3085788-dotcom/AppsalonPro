import { localCalendarDateString } from './localDate.js';
import { filterRowsBySucursal } from './salonSucursalHelpers.js';
import { getSlotStart } from './bookingSlots.js';
import {
  getSlotStartFromInstant,
  zonedCalendarDateString,
} from './bookingTimezone.js';

/** Citas activas en la misma franja que marcan congestión. */
export const CITA_CONGESTION_THRESHOLD = 3;

/** Duración por defecto si la cita no trae duracion_minutos. */
export const CITA_DEFAULT_DURATION_MINUTES = 60;

/** Fin de ventana de la cita (inicio + duración estimada). */
export function citaNoShowDeadline(cita) {
  if (!cita?.fecha_hora) return null;
  const start = new Date(cita.fecha_hora);
  if (Number.isNaN(start.getTime())) return null;
  const dur = Number(cita.duracion_minutos);
  const minutes =
    Number.isFinite(dur) && dur > 0 ? dur : CITA_DEFAULT_DURATION_MINUTES;
  return new Date(start.getTime() + minutes * 60 * 1000);
}

/** ¿Ya pasó la ventana sin visita? (el cron las cancelará como no-show). */
export function isCitaPastNoShowWindow(cita, now = new Date()) {
  const deadline = citaNoShowDeadline(cita);
  if (!deadline) return false;
  return deadline.getTime() < now.getTime();
}

export function isActiveCitaForCongestion(cita, now = new Date()) {
  if (!cita || cita.visita_validada_en) return false;
  const est = String(cita.estado || '').toLowerCase();
  if (est !== 'pendiente' && est !== 'confirmada' && est !== 'confirmado') {
    return false;
  }
  if (isCitaPastNoShowWindow(cita, now)) return false;
  return true;
}

export function isSlotCongested(count) {
  return Number(count) >= CITA_CONGESTION_THRESHOLD;
}

/** Mapa { "08:00": { count, congested } } para un día y sucursal. */
export function buildSlotDensityMap(citas, date, sucursalId, { matrizId = null } = {}) {
  const dateKey =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : localCalendarDateString(date instanceof Date ? date : new Date(date));

  const rows = filterRowsBySucursal(citas || [], sucursalId, { matrizId });
  const map = {};

  for (const cita of rows) {
    if (!isActiveCitaForCongestion(cita)) continue;
    const citaDay = zonedCalendarDateString(cita.fecha_hora);
    if (citaDay !== dateKey) continue;
    const slot =
      getSlotStartFromInstant(cita.fecha_hora) ||
      getSlotStart(cita.fecha_hora);
    if (!slot) continue;
    if (!map[slot]) map[slot] = { count: 0, congested: false };
    map[slot].count += 1;
    map[slot].congested = isSlotCongested(map[slot].count);
  }

  return map;
}

/** ¿La cita cae en una franja ya congestionada (incluyéndola en el conteo)? */
export function isCitaInCongestedSlot(cita, citas, sucursalId, { matrizId = null } = {}) {
  if (!cita?.fecha_hora) return false;
  const dateKey = zonedCalendarDateString(cita.fecha_hora);
  const map = buildSlotDensityMap(citas, dateKey, sucursalId, { matrizId });
  const slot =
    getSlotStartFromInstant(cita.fecha_hora) || getSlotStart(cita.fecha_hora);
  return Boolean(slot && map[slot]?.congested);
}
