import { getPaymentEnv, isQPayProConfigured } from '../env.js';

/**
 * Esqueleto para tokenización directa QPayPro (futuro).
 * @implements {import('../types.js').PaymentGatewayInterface}
 */
export class QPayProDirectAdapter {
  constructor(env = getPaymentEnv()) {
    this.env = env;
  }

  isConfigured() {
    return isQPayProConfigured(this.env) && Boolean(this.env.qpaypro.tokenizeUrl);
  }

  async createSession() {
    if (!this.isConfigured()) {
      throw new Error('QPayPro direct no configurado (QPAYPRO_TOKENIZE_URL).');
    }
    throw new Error('QPayProDirectAdapter.createSession: pendiente de integración API.');
  }

  async captureFromToken() {
    throw new Error('QPayProDirectAdapter.captureFromToken: pendiente de integración API.');
  }

  async verifyWebhook(rawBody, headers) {
    const redirect = new (await import('./QPayProRedirectAdapter.js')).QPayProRedirectAdapter(this.env);
    return redirect.verifyWebhook(rawBody, headers);
  }

  async refund() {
    return { ok: false, error: 'Reembolsos QPayPro direct pendientes.' };
  }
}
