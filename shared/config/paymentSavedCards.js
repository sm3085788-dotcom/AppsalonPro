/** Tarjetas guardadas: pendiente tokenización QPayPro (modo direct). */

export function listSavedCardsUnavailable() {
  return {
    ok: false,
    error: { message: 'Tarjetas guardadas disponibles cuando PAYMENT_MODE=direct y QPayPro esté configurado.' },
    cards: [],
  };
}

export async function listStripeSavedCards() {
  return listSavedCardsUnavailable();
}

export async function saveCardWithStripeSetup() {
  return {
    ok: false,
    error: { message: 'Guardar tarjeta pendiente de integración QPayPro direct.' },
  };
}

export async function detachStripePaymentMethod() {
  return {
    ok: false,
    error: { message: 'Eliminar tarjeta pendiente de integración QPayPro direct.' },
  };
}

export async function saveCardUnavailable() {
  return saveCardWithStripeSetup();
}

export async function detachSavedCardUnavailable() {
  return detachStripePaymentMethod();
}

export function formatSavedCardLabel(card) {
  const brand = card?.brand ? String(card.brand) : 'Tarjeta';
  const last4 = card?.last4 ? String(card.last4) : '—';
  return `${brand} ·••• ${last4}`;
}

export function formatSavedCardSub(card) {
  return card?.exp ? `Vence ${card.exp}` : '';
}
