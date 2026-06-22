/** Moneda de checkout tienda · Guatemala (quetzales). */
export const STRIPE_CHECKOUT_CURRENCY = 'gtq';

/** Código ISO del país para billing en Payment Sheet. */
export const STRIPE_CHECKOUT_COUNTRY = 'GT';

/**
 * Convierte monto en quetzales (Q) a unidades menores Stripe (centavos).
 * Ej.: Q 10.50 → 1050
 */
export function quetzalesToStripeMinorUnits(totalQuetzales) {
  return Math.max(1, Math.round(Number(totalQuetzales) * 100));
}

export function formatStripeGtqLabel(amountQuetzales) {
  const x = Number(amountQuetzales);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
