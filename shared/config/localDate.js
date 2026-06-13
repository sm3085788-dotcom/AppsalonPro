/**
 * Fecha calendario local (YYYY-MM-DD) según la zona horaria del dispositivo.
 * Evita usar toISOString() que devuelve UTC y adelanta el día en GT (UTC-6).
 */
export function localCalendarDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
