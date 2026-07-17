import { unstable_cache } from 'next/cache';
import { createSupabasePublicClient } from '@/lib/supabase/public';
import { isSupabaseConfigured } from '@/lib/env';
import type { ClientReview } from '@/lib/data/googleReviews';

type BirthdayTestimonialRow = {
  id: string;
  reaction: 'like' | 'love' | 'dislike';
  rating?: number | null;
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

function reactionRating(reaction: BirthdayTestimonialRow['reaction']): number {
  if (reaction === 'love') return 5;
  if (reaction === 'like') return 4;
  if (reaction === 'dislike') return 2;
  return 5;
}

function mapBirthdayReview(row: BirthdayTestimonialRow): ClientReview {
  const explicitRating = Number(row.rating);
  const rating =
    Number.isFinite(explicitRating) && explicitRating >= 1 && explicitRating <= 5
      ? explicitRating
      : reactionRating(row.reaction);
  return {
    id: `birthday-${row.id}`,
    authorName: row.author_first_name || 'Cliente',
    rating,
    text: row.comment.trim(),
    relativeTime: formatRelativeTime(row.published_at),
    source: 'birthday_club',
  };
}

async function fetchBirthdayClubPublicReviews(): Promise<ClientReview[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const supabase = createSupabasePublicClient();
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

const getCachedBirthdayClubPublicReviews = unstable_cache(
  fetchBirthdayClubPublicReviews,
  ['birthday-club-public-reviews-v3'],
  { revalidate: 3600, tags: ['birthday-club-reviews'] },
);

/** Comentarios reales del Club Tu Cumpleaños (clientes contentos, públicos en la web). */
export async function getBirthdayClubPublicReviews(): Promise<ClientReview[]> {
  return getCachedBirthdayClubPublicReviews();
}
