/**
 * @typedef {'product' | 'gift_card' | 'membership' | 'tienda_domicilio'} PaymentKind
 */

/**
 * @typedef {'redirect' | 'direct' | 'demo'} PaymentSessionMode
 */

/**
 * @typedef {Object} PaymentSessionInput
 * @property {PaymentKind} kind
 * @property {number} amountGtq
 * @property {string} currency
 * @property {string} draftId
 * @property {Record<string, string>} metadata
 * @property {string} [returnUrl]
 * @property {string} [cancelUrl]
 * @property {string} [customerEmail]
 */

/**
 * @typedef {Object} PaymentSessionResult
 * @property {PaymentSessionMode} mode
 * @property {string} sessionId
 * @property {string} [redirectUrl]
 * @property {string} [paymentToken]
 * @property {number} amountGtq
 * @property {string} currency
 * @property {boolean} demo
 */

/**
 * @typedef {Object} PaymentWebhookEvent
 * @property {'paid' | 'failed' | 'pending'} status
 * @property {string} sessionId
 * @property {string} [paymentReference]
 * @property {number} [amountGtq]
 * @property {string} [currency]
 * @property {Record<string, string>} metadata
 */

/**
 * @typedef {Object} PaymentGatewayInterface
 * @property {() => boolean} isConfigured
 * @property {(input: PaymentSessionInput) => Promise<PaymentSessionResult>} createSession
 * @property {(token: string, sessionId: string) => Promise<{ ok: boolean, sessionId?: string, error?: string }>} captureFromToken
 * @property {(rawBody: string, headers: Record<string, string>) => Promise<PaymentWebhookEvent | null>} verifyWebhook
 * @property {(sessionId: string, amountGtq?: number) => Promise<{ ok: boolean, error?: string }>} refund
 */

export const PAYMENT_KINDS = Object.freeze({
  PRODUCT: 'product',
  GIFT_CARD: 'gift_card',
  MEMBERSHIP: 'membership',
  TIENDA_DOMICILIO: 'tienda_domicilio',
});

export const PAYMENT_MODES = Object.freeze({
  REDIRECT: 'redirect',
  DIRECT: 'direct',
  DEMO: 'demo',
});
