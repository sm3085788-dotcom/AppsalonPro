import 'server-only';
import { isValidHttpUrl } from '@/lib/env';
import type { PublicSupabaseConfig } from '@/lib/supabase/types';

export type { PublicSupabaseConfig } from '@/lib/supabase/types';

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

/** Lee Supabase en runtime (servidor). Incluye alias de integración Vercel. */
export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  const anonKey = readEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
  return {
    configured: isValidHttpUrl(url) && Boolean(anonKey),
    url,
    anonKey,
  };
}
