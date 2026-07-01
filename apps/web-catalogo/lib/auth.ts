import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { displayNameFromUser } from '@/lib/clientDisplayName';
import {
  ensureClienteFromAuth,
  getClienteByUserId,
} from '@/lib/data/cliente';

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

/** Nombre visible del cliente (clientes.nombre o metadata Auth). */
export async function getClienteDisplayName(
  userId: string,
  user?: User | null,
): Promise<string> {
  if (!isSupabaseConfigured) {
    return user ? displayNameFromUser(user) : '';
  }
  try {
    const supabase = await createSupabaseServerClient();
    let row = await getClienteByUserId(supabase, userId);
    if (!row && user) {
      const ensured = await ensureClienteFromAuth(supabase, user);
      row = ensured.row;
    }
    if (row?.nombre?.trim()) return row.nombre.trim();
    if (user) return displayNameFromUser(user);
    return '';
  } catch {
    return user ? displayNameFromUser(user) : '';
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
