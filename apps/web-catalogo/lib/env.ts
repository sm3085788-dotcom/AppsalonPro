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
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripeCurrency: (process.env.NEXT_PUBLIC_STRIPE_CURRENCY ?? 'gtq').toLowerCase(),
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  deliveryProvider: process.env.DELIVERY_PROVIDER ?? 'mock',
  deliveryApiKey: process.env.DELIVERY_API_KEY ?? '',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
} as const;

/** Supabase listo (URL http(s) + anon/publishable key). Seguro de evaluar en cliente. */
export const isSupabaseConfigured =
  isValidHttpUrl(env.supabaseUrl) && Boolean(env.supabaseAnonKey);

/** Service role disponible en servidor (incluye alias SUPABASE_SECRET_KEY). */
export const isSupabaseAdminConfigured =
  isValidHttpUrl(env.supabaseUrl) && Boolean(env.supabaseServiceRoleKey);

/** Stripe en modo real (solo evaluable en servidor por la secret key). */
export const isStripeServerConfigured = Boolean(env.stripeSecretKey);

/** Publishable key presente (evaluable en cliente). */
export const isStripeClientConfigured = Boolean(env.stripePublishableKey);

/** Google Maps Places disponible (evaluable en cliente). */
export const isMapsConfigured = Boolean(env.googleMapsApiKey);
