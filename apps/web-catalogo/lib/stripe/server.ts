import Stripe from 'stripe';
import { env, isStripeServerConfigured } from '@/lib/env';

let cached: Stripe | null = null;

/** Instancia de Stripe (servidor). Devuelve null si no hay secret key (modo demo). */
export function getStripe(): Stripe | null {
  if (!isStripeServerConfigured) return null;
  if (!cached) {
    cached = new Stripe(env.stripeSecretKey);
  }
  return cached;
}
