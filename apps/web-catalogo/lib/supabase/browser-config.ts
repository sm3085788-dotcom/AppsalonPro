import type { PublicSupabaseConfig } from '@/lib/supabase/types';
import { env, isValidHttpUrl } from '@/lib/env';

let runtimeConfig: PublicSupabaseConfig | null = null;

/** Llamado por SupabaseConfigProvider con valores resueltos en el servidor. */
export function setBrowserSupabaseConfig(config: PublicSupabaseConfig): void {
  runtimeConfig = config;
}

/** Credenciales para createBrowserClient: runtime SSR primero, build-time después. */
export function getBrowserSupabaseCredentials(): {
  url: string;
  anonKey: string;
  configured: boolean;
} {
  if (runtimeConfig?.configured) {
    return {
      url: runtimeConfig.url,
      anonKey: runtimeConfig.anonKey,
      configured: true,
    };
  }
  const url = env.supabaseUrl;
  const anonKey = env.supabaseAnonKey;
  return {
    url,
    anonKey,
    configured: isValidHttpUrl(url) && Boolean(anonKey),
  };
}
