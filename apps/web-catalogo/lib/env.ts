/**
 * Acceso centralizado a variables de entorno.
 * Las `NEXT_PUBLIC_*` quedan disponibles en cliente y servidor; el resto solo en servidor.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripeCurrency: (process.env.NEXT_PUBLIC_STRIPE_CURRENCY ?? 'gtq').toLowerCase(),
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
  deliveryProvider: process.env.DELIVERY_PROVIDER ?? 'mock',
  deliveryApiKey: process.env.DELIVERY_API_KEY ?? '',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
} as const;

/** Verifica que la URL sea un endpoint HTTP/HTTPS valido (no un placeholder). */
function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Supabase listo (URL valida + anon key). Seguro de evaluar en cliente. */
export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(env.supabaseUrl) && env.supabaseAnonKey,
);

/** Stripe en modo real (solo evaluable en servidor por la secret key). */
export const isStripeServerConfigured = Boolean(env.stripeSecretKey);

/** Publishable key presente (evaluable en cliente). */
export const isStripeClientConfigured = Boolean(env.stripePublishableKey);

/** Google Maps Places disponible (evaluable en cliente). */
export const isMapsConfigured = Boolean(env.googleMapsApiKey);
