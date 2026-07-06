import { supabase } from './supabaseClient.js';
import {
  PAYMENT_COUNTRY,
  PAYMENT_CURRENCY,
  formatPaymentGtqLabel,
  isPaymentGatewayConfigured,
} from '../payments/index.js';

export {
  PAYMENT_CURRENCY,
  PAYMENT_COUNTRY,
  formatPaymentGtqLabel,
  formatPaymentGtqLabel as formatStripeGtqLabel,
  PAYMENT_CURRENCY as STRIPE_CHECKOUT_CURRENCY,
  PAYMENT_COUNTRY as STRIPE_CHECKOUT_COUNTRY,
} from '../payments/currency.js';

export { isPaymentGatewayConfigured, isPaymentGatewayConfigured as isStripeConfigured } from '../payments/env.js';

function parseFunctionError(error, data) {
  if (data?.error) return { message: String(data.error) };
  if (error?.message) return { message: error.message };
  return { message: 'No se pudo completar el pago.' };
}

export async function createMembershipPaymentSession({ codigo, nivel }) {
  const { data, error } = await supabase.functions.invoke('qpaypro-create-session', {
    body: { kind: 'membership', codigo, nivel },
  });
  if (error) return { ok: false, error: parseFunctionError(error, data) };
  if (data?.error) return { ok: false, error: { message: String(data.error) } };
  if (!data?.sessionId) {
    return { ok: false, error: { message: 'Respuesta inválida del servidor de pagos.' } };
  }
  return {
    ok: true,
    sessionId: data.sessionId,
    redirectUrl: data.redirectUrl || null,
    demo: Boolean(data.demo),
    amount: data.amount,
    currency: data.currency || PAYMENT_CURRENCY,
    nivel: data.nivel,
    label: data.label,
  };
}

/**
 * Membresía: sesión QPayPro → redirect o demo.
 */
export async function checkoutMembresiaConQPayPro({ codigo, nivel, returnUrl, openUrl }) {
  const intentRes = await createMembershipPaymentSession({ codigo, nivel, returnUrl });
  if (!intentRes.ok) return intentRes;

  if (intentRes.demo) {
    return { ok: true, demo: true, sessionId: intentRes.sessionId, amount: intentRes.amount, nivel: intentRes.nivel };
  }

  if (intentRes.redirectUrl) {
    if (typeof openUrl === 'function') {
      await openUrl(intentRes.redirectUrl);
      return {
        ok: true,
        pendingRedirect: true,
        sessionId: intentRes.sessionId,
        redirectUrl: intentRes.redirectUrl,
        amount: intentRes.amount,
        nivel: intentRes.nivel,
        label: intentRes.label,
      };
    }
    return {
      ok: true,
      sessionId: intentRes.sessionId,
      redirectUrl: intentRes.redirectUrl,
      amount: intentRes.amount,
      nivel: intentRes.nivel,
      label: intentRes.label,
    };
  }

  return { ok: false, error: { message: 'No se recibió URL de pago.' } };
}

/** @deprecated */
export const checkoutMembresiaConStripe = checkoutMembresiaConQPayPro;

export async function createDomicilioPaymentSession(payload) {
  const { data, error } = await supabase.functions.invoke('qpaypro-create-session', {
    body: { kind: 'tienda_domicilio', ...payload },
  });
  if (error) return { ok: false, error: parseFunctionError(error, data) };
  if (data?.error) return { ok: false, error: { message: String(data.error) } };
  if (!data?.sessionId) {
    return { ok: false, error: { message: 'Respuesta inválida del servidor de pagos.' } };
  }
  return {
    ok: true,
    sessionId: data.sessionId,
    redirectUrl: data.redirectUrl || null,
    demo: Boolean(data.demo),
    amount: data.amount,
    currency: data.currency || PAYMENT_CURRENCY,
  };
}

export async function finalizeQPayProDomicilioOrder(sessionId) {
  const { data, error } = await supabase.functions.invoke('qpaypro-finalize-order', {
    body: { session_id: sessionId },
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

/** @deprecated */
export const finalizeStripeDomicilioOrder = finalizeQPayProDomicilioOrder;

/**
 * Flujo tienda domicilio: sesión QPayPro → redirect o demo → finalize.
 */
export async function checkoutDomicilioConQPayPro({ checkoutPayload, returnUrl, openUrl }) {
  const intentRes = await createDomicilioPaymentSession({ ...checkoutPayload, returnUrl });
  if (!intentRes.ok) return intentRes;

  if (intentRes.demo) {
    return finalizeQPayProDomicilioOrder(intentRes.sessionId);
  }

  if (intentRes.redirectUrl && typeof openUrl === 'function') {
    await openUrl(intentRes.redirectUrl);
    return {
      ok: true,
      pendingRedirect: true,
      sessionId: intentRes.sessionId,
      amount: intentRes.amount,
      redirectUrl: intentRes.redirectUrl,
    };
  }

  return { ok: false, error: { message: 'No se pudo abrir el checkout QPayPro.' } };
}

/** @deprecated */
export const checkoutDomicilioConStripe = checkoutDomicilioConQPayPro;

/** @deprecated */
export async function createStripePaymentIntent(payload) {
  return createDomicilioPaymentSession(payload);
}

/** @deprecated */
export async function createStripeMembershipPaymentIntent(params) {
  return createMembershipPaymentSession(params);
}
