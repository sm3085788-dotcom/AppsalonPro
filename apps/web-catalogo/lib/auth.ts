import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { User } from '@supabase/supabase-js';

/** Usuario actual (o null). Seguro en modo demo y ante errores. */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

/** Nombre visible del cliente para reseñas (tabla clientes.nombre). */
export async function getClienteNombre(userId: string): Promise<string> {
  if (!isSupabaseConfigured) return '';
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('clientes')
      .select('nombre')
      .eq('user_id', userId)
      .maybeSingle();
    return (data?.nombre ?? '').trim();
  } catch {
    return '';
  }
}
