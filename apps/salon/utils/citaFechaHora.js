/** Zona del salón para citas (misma que reservas web). */
export const SALON_CITA_TIMEZONE = 'America/Guatemala';

const GT_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: SALON_CITA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD calendario GT (filtrar agenda, agrupar citas). */
export function citaCalendarDateKeyGT(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  return GT_DATE_FMT.format(d);
}

/** Fecha y hora de cita legible en hora de Guatemala. */
export function formatCitaFechaHoraSalon(isoOrDate, options = {}) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-GT', {
    timeZone: SALON_CITA_TIMEZONE,
    ...options,
  });
}

/** Solo fecha de cita en GT. */
export function formatCitaFechaSalon(isoOrDate, options = {}) {
  return formatCitaFechaHoraSalon(isoOrDate, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

/** Solo hora de cita en GT. */
export function formatCitaHoraSalon(isoOrDate, options = {}) {
  return formatCitaFechaHoraSalon(isoOrDate, {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}
