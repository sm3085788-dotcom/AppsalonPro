import { supabase } from './supabaseClient.js';
import { STRIPE_CHECKOUT_COUNTRY, STRIPE_CHECKOUT_CURRENCY } from './stripeCurrency.js';

export { STRIPE_CHECKOUT_CURRENCY, STRIPE_CHECKOUT_COUNTRY, formatStripeGtqLabel } from './stripeCurrency.js';

export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export function isStripeConfigured() {
  return Boolean(String(STRIPE_PUBLISHABLE_KEY).trim());
}

function parseFunctionError(error, data) {
  if (data?.error) return { message: String(data.error) };
  if (error?.message) return { message: error.message };
  return { message: 'No se pudo completar el pago con Stripe.' };
}

export async function createStripePaymentIntent(payload) {
  const { data, error } = await supabase.functions.invoke('stripe-create-payment-intent', {
    body: payload,
  });
  if (error) return { ok: false, error: parseFunctionError(error, data) };
  if (data?.error) return { ok: false, error: { message: String(data.error) } };
  if (!data?.clientSecret || !data?.paymentIntentId) {
    return { ok: false, error: { message: 'Respuesta inválida del servidor de pagos.' } };
  }
  return {
    ok: true,
    clientSecret: data.clientSecret,
    paymentIntentId: data.paymentIntentId,
    amount: data.amount,
    currency: data.currency || STRIPE_CHECKOUT_CURRENCY,
  };
}

export async function finalizeStripeDomicilioOrder(paymentIntentId) {
  const { data, error } = await supabase.functions.invoke('stripe-finalize-order', {
    body: { payment_intent_id: paymentIntentId },
  });
  if (error) return { ok: false, error: parseFunctionError(error, data) };
  if (data?.error) return { ok: false, error: { message: String(data.error) } };
  if (!data?.ok || !data?.order) {
    return { ok: false, error: { message: 'No se pudo registrar el pedido tras el pago.' } };
  }
  return {
    ok: true,
    order: data.order,
    trackingCode: data.trackingCode || data.order?.tracking_code,
    total: data.total ?? data.order?.total_amount,
    cardLast4: data.cardLast4 ?? data.order?.card_last4,
    cardBrand: data.cardBrand ?? null,
    idempotent: Boolean(data.idempotent),
  };
}

/**
 * Flujo completo: PaymentIntent → Payment Sheet → pedido confirmado.
 * @param {object} params
 * @param {object} params.stripe - instancia de useStripe()
 * @param {object} params.checkoutPayload - body para create-payment-intent
 * @param {string} [params.merchantDisplayName]
 */
export async function checkoutDomicilioConStripe({
  stripe,
  checkoutPayload,
  merchantDisplayName = 'Aura Salón',
}) {
  if (!stripe?.initPaymentSheet || !stripe?.presentPaymentSheet) {
    return { ok: false, error: { message: 'Stripe no está disponible en este dispositivo.' } };
  }

  const intentRes = await createStripePaymentIntent(checkoutPayload);
  if (!intentRes.ok) return intentRes;

  const { error: initErr } = await stripe.initPaymentSheet({
    paymentIntentClientSecret: intentRes.clientSecret,
    merchantDisplayName,
    allowsDelayedPaymentMethods: false,
    defaultBillingDetails: {
      address: { country: STRIPE_CHECKOUT_COUNTRY },
    },
  });
  if (initErr) {
    return { ok: false, error: { message: initErr.message || 'No se pudo abrir el pago.' } };
  }

  const { error: presentErr } = await stripe.presentPaymentSheet();
  if (presentErr) {
    const cancelled = presentErr.code === 'Canceled' || /cancel/i.test(String(presentErr.message));
    return {
      ok: false,
      cancelled,
      error: { message: presentErr.message || 'Pago cancelado.' },
    };
  }

  return finalizeStripeDomicilioOrder(intentRes.paymentIntentId);
}
