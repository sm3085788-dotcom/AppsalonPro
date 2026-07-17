import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured, isSupabaseAdminConfigured } from '@/lib/env';
import type { Review, UUID } from '@/lib/types/db';

async function fetchReviews(
  inventarioId: UUID,
  client: SupabaseClient,
): Promise<Review[]> {
  const { data, error } = await client
    .from('inventario_resenas')
    .select(
      'id,inventario_id,client_user_id,cliente_id,autor_nombre,rating,comentario,foto_urls,created_at',
    )
    .eq('inventario_id', inventarioId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as Review[];
}

/** Reseñas públicas de un item de inventario (tienda web + App Clientes). */
export async function getReviews(inventarioId: UUID): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const rows = await fetchReviews(inventarioId, supabase);
    if (rows.length > 0) return rows;

    if (isSupabaseAdminConfigured) {
      const admin = createSupabaseAdminClient();
      return fetchReviews(inventarioId, admin);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Req 8: ¿puede el usuario actual reseñar este producto?
 * Verificado contra pedidos entregados via RPC cliente_puede_resenar_inventario.
 */
export async function canReview(inventarioId: UUID): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.rpc(
      'cliente_puede_resenar_inventario',
      { p_inventario_id: inventarioId },
    );
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

/** ¿El usuario ya dejó reseña? (índice único por inventario_id + user). */
export async function userHasReviewed(
  inventarioId: UUID,
  userId: UUID,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('inventario_resenas')
      .select('id')
      .eq('inventario_id', inventarioId)
      .eq('client_user_id', userId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}
