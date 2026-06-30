import { supabase } from './supabaseClient.js';
import { STRIPE_CHECKOUT_COUNTRY } from './stripeCurrency.js';

function parseFunctionError(error, data) {
  if (data?.error) return { message: String(data.error) };
  if (error?.message) return { message: error.message };
  return { message: 'No se pudo completar la operación con Stripe.' };
}

export async function ensureStripeCustomer() {
  const { data, error } = await supabase.functions.invoke('stripe-setup-customer', { body: {} });
  if (error) return { ok: false, error: parseFunctionError(error, data) };
  if (data?.error) return { ok: false, error: { message: String(data.error) } };
  if (!data?.customerId) return { ok: false, error: { message: 'No se pudo crear el cliente Stripe.' } };
  return { ok: true, customerId: data.customerId };
}

export async function createStripeSetupIntent(customerId) {
  const { data, error } = await supabase.functions.invoke('stripe-setup-intent', {
    body: { customerId },
  });
  if (error) return { ok: false, error: parseFunctionError(error, data) };
  if (data?.error) return { ok: false, error: { message: String(data.error) } };
  if (!data?.clientSecret) return { ok: false, error: { message: 'SetupIntent inválido.' } };
  return {
    ok: true,
    clientSecret: data.clientSecret,
    setupIntentId: data.setupIntentId,
    customerId: data.customerId,
  };
}

export async function listStripeSavedCards() {
  const { data, error } = await supabase.functions.invoke('stripe-list-payment-methods', { body: {} });
  if (error) return { ok: false, error: parseFunctionError(error, data), cards: [] };
  if (data?.error) return { ok: false, error: { message: String(data.error) }, cards: [] };
  return { ok: true, cards: Array.isArray(data?.cards) ? data.cards : [], customerId: data?.customerId ?? null };
}

export async function detachStripePaymentMethod(paymentMethodId) {
  const { data, error } = await supabase.functions.invoke('stripe-detach-payment-method', {
    body: { paymentMethodId },
  });
  if (error) return { ok: false, error: parseFunctionError(error, data) };
  if (data?.error) return { ok: false, error: { message: String(data.error) } };
  return { ok: true };
}

/**
 * Guarda tarjeta vía SetupIntent + Payment Sheet (PCI-safe).
 * @param {object} params
 * @param {object} params.stripe - useStripe()
 * @param {string} [params.merchantDisplayName]
 */
export async function saveCardWithStripeSetup({ stripe, merchantDisplayName = 'Aura Salón' }) {
  if (!stripe?.initPaymentSheet || !stripe?.presentPaymentSheet) {
    return { ok: false, error: { message: 'Stripe no está disponible.' } };
  }

  const custRes = await ensureStripeCustomer();
  if (!custRes.ok) return custRes;

  const setupRes = await createStripeSetupIntent(custRes.customerId);
  if (!setupRes.ok) return setupRes;

  const { error: initErr } = await stripe.initPaymentSheet({
    setupIntentClientSecret: setupRes.clientSecret,
    merchantDisplayName,
    allowsDelayedPaymentMethods: false,
    defaultBillingDetails: {
      address: { country: STRIPE_CHECKOUT_COUNTRY },
    },
  });
  if (initErr) {
    return { ok: false, error: { message: initErr.message || 'No se pudo abrir el formulario.' } };
  }

  const { error: presentErr } = await stripe.presentPaymentSheet();
  if (presentErr) {
    const cancelled = presentErr.code === 'Canceled' || /cancel/i.test(String(presentErr.message));
    return {
      ok: false,
      cancelled,
      error: { message: presentErr.message || 'Guardado cancelado.' },
    };
  }

  const listRes = await listStripeSavedCards();
  if (!listRes.ok) return listRes;
  return { ok: true, cards: listRes.cards };
}

export function formatSavedCardLabel(card) {
  if (!card) return 'Tarjeta';
  const brand = String(card.brand || 'card').replace(/^./, (c) => c.toUpperCase());
  return `${brand} ··· ${card.last4 || '****'}`;
}

export function formatSavedCardSub(card) {
  if (!card?.expMonth || !card?.expYear) return 'Tarjeta guardada';
  const mm = String(card.expMonth).padStart(2, '0');
  const yy = String(card.expYear).slice(-2);
  return `Vence ${mm}/${yy}`;
}
