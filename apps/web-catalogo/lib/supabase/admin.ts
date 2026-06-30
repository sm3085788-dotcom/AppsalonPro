import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Cliente con service role (omite RLS). SOLO para servidor: webhooks de Stripe
 * y acciones administrativas. Nunca importar desde codigo de cliente.
 */
export function createSupabaseAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      'Supabase service role no configurado (SUPABASE_SERVICE_ROLE_KEY).',
    );
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
