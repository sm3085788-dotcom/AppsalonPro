import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseAdminConfigured } from '@/lib/env';

/**
 * Cliente con service role (omite RLS). SOLO para servidor: webhooks de Stripe
 * y acciones administrativas. Nunca importar desde codigo de cliente.
 */
export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured) {
    throw new Error(
      'Supabase service role no configurado (SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY).',
    );
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
