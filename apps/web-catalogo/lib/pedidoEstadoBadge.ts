/** Mismos colores y base que `citaEstadoBadgeClass` en Mi cuenta. */
export function pedidoEstadoBadgeClass(status: string): string {
  const base = 'rounded-full bg-surface-2 px-3 py-1 text-xs';
  const s = String(status || '').trim().toLowerCase();

  if (s === 'delivered') {
    return `${base} text-emerald-400`;
  }

  if (s === 'cancelled') {
    return `${base} text-red-400`;
  }

  return `${base} text-gold`;
}
