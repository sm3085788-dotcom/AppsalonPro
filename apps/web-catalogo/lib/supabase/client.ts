'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

/**
 * Cliente Supabase para componentes de cliente (browser).
 * Reutiliza la sesion SSR via cookies gestionadas por @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
