export function normalizeEstadoCita(estado: string | null | undefined): string {
  return String(estado || '').trim().toLowerCase();
}

export function clientePuedeModificarCita(estado: string | null | undefined): boolean {
  return normalizeEstadoCita(estado) === 'pendiente';
}

export function citaEstaCancelada(estado: string | null | undefined): boolean {
  const s = normalizeEstadoCita(estado);
  return s === 'cancelada' || s === 'cancelado' || s === 'rechazada' || s === 'rechazado';
}

export function citaEstaCompletada(estado: string | null | undefined): boolean {
  const s = normalizeEstadoCita(estado);
  return s === 'completada' || s === 'completado';
}

export function citaEstaConfirmada(estado: string | null | undefined): boolean {
  const s = normalizeEstadoCita(estado);
  return s === 'confirmada' || s === 'confirmado';
}

/** Confirmada y falta escanear QR en salón. */
export function citaNecesitaValidacionVisita(
  estado: string | null | undefined,
  visitaValidadaEn: string | null | undefined,
): boolean {
  if (!citaEstaConfirmada(estado)) return false;
  return !visitaValidadaEn;
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
