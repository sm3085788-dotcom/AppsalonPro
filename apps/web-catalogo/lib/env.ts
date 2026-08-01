/**
 * Acceso centralizado a variables de entorno.
 * Las `NEXT_PUBLIC_*` quedan disponibles en cliente y servidor; el resto solo en servidor.
 *
 * Acepta alias de la integración Vercel ↔ Supabase (publishable/secret key).
 */

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

/** URL http(s) válida; evita crashes si Vercel inyecta un placeholder mal formado. */
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
  googlePlaceId: readEnv('GOOGLE_PLACE_ID', 'NEXT_PUBLIC_GOOGLE_PLACE_ID'),
  deliveryProvider: process.env.DELIVERY_PROVIDER ?? 'mock',
  deliveryApiKey: process.env.DELIVERY_API_KEY ?? '',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  siteUrl: readEnv('NEXT_PUBLIC_SITE_URL'),
  /** Clave pública VAPID (Web Push). Segura en cliente. */
  vapidPublicKey: readEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PUBLIC_KEY'),
  /** Clave privada VAPID — solo servidor / Edge. */
  vapidPrivateKey: readEnv('VAPID_PRIVATE_KEY'),
  vapidSubject: readEnv('VAPID_SUBJECT') || 'mailto:contacto@appsalon.pro',
} as const;

/** Web Push listo (público + privado). */
export const isWebPushConfigured =
  Boolean(env.vapidPublicKey) && Boolean(env.vapidPrivateKey);

/** Supabase listo (URL http(s) + anon/publishable key). Seguro de evaluar en cliente. */
export const isSupabaseConfigured =
  isValidHttpUrl(env.supabaseUrl) && Boolean(env.supabaseAnonKey);

/** Service role disponible en servidor (incluye alias SUPABASE_SECRET_KEY). */
export const isSupabaseAdminConfigured =
  isValidHttpUrl(env.supabaseUrl) && Boolean(env.supabaseServiceRoleKey);

export const isPaymentServerConfigured = Boolean(
  env.qpayproMerchantId && env.qpayproApiKey && env.qpayproApiSecret && env.qpayproCheckoutBaseUrl,
);

/** Google Maps Places disponible (evaluable en cliente). */
export const isMapsConfigured = Boolean(env.googleMapsApiKey);

/** @deprecated Usar isPaymentServerConfigured (QPayPro). */
export const isStripeServerConfigured = isPaymentServerConfigured;
/** @deprecated Usar isPaymentServerConfigured (QPayPro). */
export const isStripeClientConfigured = isPaymentServerConfigured;
