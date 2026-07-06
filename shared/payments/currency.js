export const PAYMENT_CURRENCY = 'gtq';
export const PAYMENT_COUNTRY = 'GT';

export function quetzalesToMinorUnits(amountGtq) {
  return Math.max(1, Math.round(Number(amountGtq) * 100));
}

export function minorUnitsToGtq(minor) {
  return Math.round(Number(minor)) / 100;
}

export function formatPaymentGtqLabel(amountGtq) {
  const n = Number(amountGtq);
  if (!Number.isFinite(n)) return 'Q0.00';
  return `Q${n.toFixed(2)}`;
}

/** @deprecated */
export const STRIPE_CHECKOUT_CURRENCY = PAYMENT_CURRENCY;
/** @deprecated */
export const STRIPE_CHECKOUT_COUNTRY = PAYMENT_COUNTRY;
export function quetzalesToStripeMinorUnits(amountGtq) {
  return quetzalesToMinorUnits(amountGtq);
}
export function formatStripeGtqLabel(amountGtq) {
  return formatPaymentGtqLabel(amountGtq);
}
