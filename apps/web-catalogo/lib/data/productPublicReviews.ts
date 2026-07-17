import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured, isSupabaseAdminConfigured } from '@/lib/env';
import type { ClientReview } from '@/lib/data/googleReviews';

type ProductReviewRow = {
  id: string;
  autor_nombre: string;
  rating: number;
  comentario: string;
  created_at: string;
  inventario_id: string;
  inventario?: {
    nombre?: string | null;
    visible_en_tienda?: boolean | null;
    imagen_url?: string | null;
    imagenes_urls?: string[] | null;
  } | null;
};

function firstProductImage(inventario: ProductReviewRow['inventario']): string | null {
  if (!inventario) return null;
  if (inventario.imagen_url) return inventario.imagen_url;
  if (Array.isArray(inventario.imagenes_urls) && inventario.imagenes_urls.length > 0) {
    return inventario.imagenes_urls[0] ?? null;
  }
  return null;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 'Reciente';

  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'hace 1 semana' : `hace ${weeks} semanas`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? 'hace 1 mes' : `hace ${months} meses`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? 'hace 1 año' : `hace ${years} años`;
}

function mapProductReview(row: ProductReviewRow): ClientReview | null {
  const text = String(row.comentario || '').trim();
  if (!text) return null;
  const productName = String(row.inventario?.nombre || '').trim() || 'Producto del salón';

  return {
    id: `product-${row.id}`,
    authorName: String(row.autor_nombre || '').trim() || 'Cliente verificado',
    rating: Math.min(5, Math.max(1, Number(row.rating) || 5)),
    text,
    relativeTime: formatRelativeTime(row.created_at),
    source: 'product',
    productName,
    productId: row.inventario_id,
    productImageUrl: firstProductImage(row.inventario) ?? undefined,
  };
}

async function queryProductReviews(client: SupabaseClient): Promise<ClientReview[]> {
  const { data, error } = await client
    .from('inventario_resenas')
    .select(
      'id,autor_nombre,rating,comentario,created_at,inventario_id,inventario:inventario_id(nombre,visible_en_tienda,imagen_url,imagenes_urls)',
    )
    .order('created_at', { ascending: false })
    .limit(24);

  if (error) {
    console.error('[productPublicReviews]', error.message);
    return [];
  }

  const rows = (data ?? []) as ProductReviewRow[];
  return rows
    .filter((r) => r.inventario?.visible_en_tienda !== false)
    .map(mapProductReview)
    .filter((r): r is ClientReview => r !== null);
}

async function fetchProductPublicReviews(): Promise<ClientReview[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const publicClient = createSupabasePublicClient();
    const rows = await queryProductReviews(publicClient);
    if (rows.length > 0) return rows;

    if (isSupabaseAdminConfigured) {
      return queryProductReviews(createSupabaseAdminClient());
    }
    return [];
  } catch (err) {
    console.error('[productPublicReviews]', err);
    return [];
  }
}

const getCachedProductPublicReviews = unstable_cache(
  fetchProductPublicReviews,
  ['product-public-reviews-v2'],
  { revalidate: 1800, tags: ['product-reviews'] },
);

/** Reseñas verificadas de productos (compra entregada) para la home. */
export async function getProductPublicReviews(): Promise<ClientReview[]> {
  return getCachedProductPublicReviews();
}
