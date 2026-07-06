import { getPaymentEnv, isQPayProConfigured } from '../env.js';
import { PAYMENT_MODES } from '../types.js';

function buildSessionId(draftId) {
  return `qpay_${draftId}_${Date.now()}`;
}

/**
 * @implements {import('../types.js').PaymentGatewayInterface}
 */
export class QPayProRedirectAdapter {
  constructor(env = getPaymentEnv()) {
    this.env = env;
  }

  isConfigured() {
    return isQPayProConfigured(this.env) && Boolean(this.env.qpaypro.checkoutBaseUrl);
  }

  /**
   * @param {import('../types.js').PaymentSessionInput} input
   * @returns {Promise<import('../types.js').PaymentSessionResult>}
   */
  async createSession(input) {
    const sessionId = buildSessionId(input.draftId);

    if (!this.isConfigured()) {
      return {
        mode: PAYMENT_MODES.DEMO,
        sessionId,
        amountGtq: input.amountGtq,
        currency: input.currency,
        demo: true,
      };
    }

    const base = this.env.qpaypro.checkoutBaseUrl.replace(/\/$/, '');
    const params = new URLSearchParams({
      merchant_id: this.env.qpaypro.merchantId,
      amount: String(input.amountGtq),
      currency: input.currency.toUpperCase(),
      session_id: sessionId,
      draft_id: input.draftId,
      kind: input.metadata?.kind || input.kind,
    });
    if (input.returnUrl) params.set('return_url', input.returnUrl);
    if (input.cancelUrl) params.set('cancel_url', input.cancelUrl);
    if (input.customerEmail) params.set('email', input.customerEmail);

    return {
      mode: PAYMENT_MODES.REDIRECT,
      sessionId,
      redirectUrl: `${base}?${params.toString()}`,
      amountGtq: input.amountGtq,
      currency: input.currency,
      demo: false,
    };
  }

  async captureFromToken() {
    return { ok: false, error: 'Modo redirect: usa la URL de checkout.' };
  }

  /**
   * @param {string} rawBody
   * @param {Record<string, string>} headers
   */
  async verifyWebhook(rawBody, headers) {
    const secret = this.env.qpaypro.webhookSecret;
    const signature = headers['x-qpaypro-signature'] || headers['X-QPayPro-Signature'] || '';

    if (secret && signature !== secret) {
      throw new Error('Firma de webhook inválida.');
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new Error('Webhook JSON inválido.');
    }

    const statusRaw = String(payload.status || payload.event || '').toLowerCase();
    let status = 'pending';
    if (['paid', 'success', 'approved', 'payment_intent.succeeded'].includes(statusRaw)) {
      status = 'paid';
    } else if (['failed', 'declined', 'cancelled', 'canceled'].includes(statusRaw)) {
      status = 'failed';
    }

    const metadata = payload.metadata && typeof payload.metadata === 'object'
      ? Object.fromEntries(Object.entries(payload.metadata).map(([k, v]) => [k, String(v)]))
      : {};

    return {
      status,
      sessionId: String(payload.session_id || payload.sessionId || payload.id || ''),
      paymentReference: String(payload.payment_reference || payload.transaction_id || payload.id || ''),
      amountGtq: payload.amount != null ? Number(payload.amount) : undefined,
      currency: payload.currency ? String(payload.currency).toLowerCase() : undefined,
      metadata,
    };
  }

  async refund() {
    return { ok: false, error: 'Reembolsos QPayPro pendientes de credenciales.' };
  }
}
