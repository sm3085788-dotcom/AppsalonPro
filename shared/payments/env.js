function readEnv(...keys) {
  for (const key of keys) {
    const value = (typeof process !== 'undefined' && process.env?.[key]) || '';
    if (String(value).trim()) return String(value).trim();
  }
  return '';
}

export function getPaymentEnv() {
  return {
    mode: readEnv('PAYMENT_MODE') || 'redirect',
    provider: readEnv('PAYMENT_PROVIDER') || 'qpaypro',
    currency: (readEnv('NEXT_PUBLIC_PAYMENT_CURRENCY', 'PAYMENT_CURRENCY') || 'gtq').toLowerCase(),
    shippingFeeGtq: Number(readEnv('WEB_PRODUCT_SHIPPING_FEE_GTQ') || '0') || 0,
    qpaypro: {
      merchantId: readEnv('QPAYPRO_MERCHANT_ID'),
      apiKey: readEnv('QPAYPRO_API_KEY'),
      apiSecret: readEnv('QPAYPRO_API_SECRET'),
      checkoutBaseUrl: readEnv('QPAYPRO_CHECKOUT_BASE_URL'),
      tokenizeUrl: readEnv('QPAYPRO_TOKENIZE_URL'),
      webhookSecret: readEnv('QPAYPRO_WEBHOOK_SECRET'),
      env: readEnv('QPAYPRO_ENV') || 'sandbox',
    },
  };
}

export function isQPayProConfigured(env = getPaymentEnv()) {
  const q = env.qpaypro;
  return Boolean(q.merchantId && q.apiKey && q.apiSecret);
}

export function isPaymentGatewayConfigured(env = getPaymentEnv()) {
  if (env.mode === 'direct') {
    return isQPayProConfigured(env) && Boolean(env.qpaypro.tokenizeUrl);
  }
  return isQPayProConfigured(env) && Boolean(env.qpaypro.checkoutBaseUrl);
}

/** @deprecated use isPaymentGatewayConfigured */
export function isStripeConfigured() {
  return isPaymentGatewayConfigured();
}
