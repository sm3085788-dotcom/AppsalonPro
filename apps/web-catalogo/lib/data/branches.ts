import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { Branch } from '@/lib/types/db';

/**
 * Sucursales activas. Usa la RPC `list_sucursales_activas` (otorgada a anon),
 * con fallback a SELECT directo. Devuelve [] en modo demo o ante errores.
 */
export async function listBranches(): Promise<Branch[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('list_sucursales_activas');
    if (!error && Array.isArray(data)) return data as Branch[];

    const fallback = await supabase
      .from('sucursales')
      .select('id,codigo,nombre,es_matriz,activa,direccion,telefono,created_at')
      .eq('activa', true)
      .order('es_matriz', { ascending: false })
      .order('nombre');
    if (fallback.error || !fallback.data) return [];
    return fallback.data as Branch[];
  } catch {
    return [];
  }
}

export async function getBranchById(id: string): Promise<Branch | null> {
  const branches = await listBranches();
  return branches.find((b) => b.id === id) ?? null;
}
