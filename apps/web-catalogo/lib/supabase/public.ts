import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/lib/env';

/**
 * Cliente Supabase anónimo para lecturas públicas en Server Components.
 * No usa cookies → compatible con generación estática / ISR.
 */
export function createSupabasePublicClient() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no configurado.');
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
