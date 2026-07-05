'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { PublicSupabaseConfig } from '@/lib/supabase/types';
import { setBrowserSupabaseConfig } from '@/lib/supabase/browser-config';

const SupabaseConfigContext = createContext<PublicSupabaseConfig | null>(null);

export function SupabaseConfigProvider({
  config,
  children,
}: {
  config: PublicSupabaseConfig;
  children: ReactNode;
}) {
  setBrowserSupabaseConfig(config);
  const value = useMemo(() => config, [config.url, config.anonKey, config.configured]);
  return (
    <SupabaseConfigContext.Provider value={value}>
      {children}
    </SupabaseConfigContext.Provider>
  );
}

export function useSupabaseConfig(): PublicSupabaseConfig {
  const ctx = useContext(SupabaseConfigContext);
  if (!ctx) {
    return { configured: false, url: '', anonKey: '' };
  }
  return ctx;
}
