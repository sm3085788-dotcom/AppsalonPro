'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getBrowserSupabaseCredentials } from '@/lib/supabase/browser-config';

/**
 * Cliente Supabase para componentes de cliente (browser).
 * Usa config inyectada desde el servidor (runtime) cuando el build no trae NEXT_PUBLIC_*.
 */
export function createClient() {
  const { url, anonKey } = getBrowserSupabaseCredentials();
  return createBrowserClient(url, anonKey);
}
