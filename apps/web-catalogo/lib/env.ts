/**
 * Acceso centralizado a variables de entorno.
 */

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

export function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const env = {
  supabaseUrl: readEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'),
  supabaseAnonKey: readEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ),
  supabaseServiceRoleKey: readEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
  ),
  paymentMode: readEnv('PAYMENT_MODE') || 'redirect',
  paymentProvider: readEnv('PAYMENT_PROVIDER') || 'qpaypro',
  paymentCurrency: (readEnv('NEXT_PUBLIC_PAYMENT_CURRENCY', 'PAYMENT_CURRENCY') || 'gtq').toLowerCase(),
  qpayproMerchantId: readEnv('QPAYPRO_MERCHANT_ID'),
  qpayproApiKey: readEnv('QPAYPRO_API_KEY'),
  qpayproApiSecret: readEnv('QPAYPRO_API_SECRET'),
  qpayproCheckoutBaseUrl: readEnv('QPAYPRO_CHECKOUT_BASE_URL'),
  qpayproTokenizeUrl: readEnv('QPAYPRO_TOKENIZE_URL'),
  qpayproWebhookSecret: readEnv('QPAYPRO_WEBHOOK_SECRET'),
  qpayproEnv: readEnv('QPAYPRO_ENV') || 'sandbox',
  productShippingFeeGtq: Number(readEnv('WEB_PRODUCT_SHIPPING_FEE_GTQ') || '0') || 0,
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  deliveryProvider: process.env.DELIVERY_PROVIDER ?? 'mock',
  deliveryApiKey: process.env.DELIVERY_API_KEY ?? '',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  siteUrl: readEnv('NEXT_PUBLIC_SITE_URL'),
} as const;

export const isSupabaseConfigured =
  isValidHttpUrl(env.supabaseUrl) && Boolean(env.supabaseAnonKey);

export const isSupabaseAdminConfigured =
  isValidHttpUrl(env.supabaseUrl) && Boolean(env.supabaseServiceRoleKey);

export const isPaymentServerConfigured = Boolean(
  env.qpayproMerchantId && env.qpayproApiKey && env.qpayproApiSecret && env.qpayproCheckoutBaseUrl,
);

export const isMapsConfigured = Boolean(env.googleMapsApiKey);

/** @deprecated */
export const isStripeServerConfigured = isPaymentServerConfigured;
/** @deprecated */
export const isStripeClientConfigured = isPaymentServerConfigured;
