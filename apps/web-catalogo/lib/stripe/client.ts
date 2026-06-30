'use client';

import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { env } from '@/lib/env';

let promise: Promise<Stripe | null> | null = null;

/** Carga diferida de Stripe.js (browser). null si no hay publishable key. */
export function getStripePromise(): Promise<Stripe | null> | null {
  if (!env.stripePublishableKey) return null;
  if (!promise) promise = loadStripe(env.stripePublishableKey);
  return promise;
}
