import { getPaymentEnv } from './env.js';
import { QPayProRedirectAdapter } from './adapters/QPayProRedirectAdapter.js';
import { QPayProDirectAdapter } from './adapters/QPayProDirectAdapter.js';

let cached = null;

/**
 * @returns {import('./types.js').PaymentGatewayInterface}
 */
export function getPaymentGateway(env = getPaymentEnv()) {
  if (cached && cached._envKey === JSON.stringify(env)) return cached.gateway;

  const gateway =
    env.mode === 'direct'
      ? new QPayProDirectAdapter(env)
      : new QPayProRedirectAdapter(env);

  cached = { _envKey: JSON.stringify(env), gateway };
  return gateway;
}

export function resetPaymentGatewayCache() {
  cached = null;
}
