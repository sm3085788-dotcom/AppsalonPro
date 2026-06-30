/** Formatea montos en Quetzales (GTQ). */
export function formatQ(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(n);
}

/** Convierte Quetzales a centavos (Stripe usa la unidad minima). */
export function toMinorUnits(value: number): number {
  return Math.round(Number(value) * 100);
}

/** Formatea una fecha ISO a texto legible en es-GT. */
export function formatFechaHora(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-GT', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
