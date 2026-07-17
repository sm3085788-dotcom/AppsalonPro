export function citaEstadoBadgeClass(estado: string): string {
  const base = 'rounded-full bg-surface-2 px-3 py-1 text-xs capitalize';
  const s = estado.trim().toLowerCase();

  if (s === 'confirmado' || s === 'confirmada') {
    return `${base} text-emerald-400`;
  }

  if (s === 'completado' || s === 'completada') {
    return `${base} text-blue-400`;
  }

  if (
    s === 'cancelado' ||
    s === 'cancelada' ||
    s === 'rechazado' ||
    s === 'rechazada'
  ) {
    return `${base} text-red-400`;
  }

  return `${base} text-gold`;
}
