import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ClientReview } from '@/lib/data/googleReviews';

type BirthdayTestimonialRow = {
  id: string;
  reaction: 'like' | 'love' | 'dislike';
  comment: string;
  author_first_name: string;
  published_at: string;
};

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

function mapBirthdayReview(row: BirthdayTestimonialRow): ClientReview {
  return {
    id: `birthday-${row.id}`,
    authorName: row.author_first_name || 'Cliente',
    rating: row.reaction === 'love' ? 5 : 5,
    text: row.comment.trim(),
    relativeTime: formatRelativeTime(row.published_at),
    source: 'birthday_club',
  };
}

/** Comentarios reales del Club Tu Cumpleaños (clientes contentos, públicos en la web). */
export async function getBirthdayClubPublicReviews(): Promise<ClientReview[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('list_public_birthday_club_testimonials', {
      p_limit: 24,
    });

    if (error) {
      console.error('[birthdayClubReviews]', error.message);
      return [];
    }

    const payload = data as { ok?: boolean; reviews?: BirthdayTestimonialRow[] };
    if (!payload?.ok || !Array.isArray(payload.reviews)) return [];

    return payload.reviews
      .filter((r) => String(r.comment || '').trim().length > 0)
      .map(mapBirthdayReview);
  } catch (err) {
    console.error('[birthdayClubReviews]', err);
    return [];
  }
}
