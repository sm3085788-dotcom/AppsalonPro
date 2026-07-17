'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureClienteFromAuth } from '@/lib/data/cliente';
import { getCurrentUser } from '@/lib/auth';

export async function enrollBirthdayClubAction(): Promise<
  { ok: true } | { ok: false; error: string; needsProfile?: boolean }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Inicia sesión para unirte al club.' };

  const supabase = await createSupabaseServerClient();
  await ensureClienteFromAuth(supabase, user);

  const { data, error } = await supabase.rpc('enroll_birthday_club');
  if (error) return { ok: false, error: error.message };

  const payload = data as { ok?: boolean; error?: string };
  if (!payload?.ok) {
    const msg = payload?.error || 'No se pudo inscribir.';
    if (/cumpleaños|perfil/i.test(msg)) {
      return { ok: false, error: msg, needsProfile: true };
    }
    return { ok: false, error: msg };
  }

  revalidatePath('/tu-cumpleanos');
  return { ok: true };
}

function reactionFromRating(rating: number): 'like' | 'dislike' | 'love' {
  if (rating >= 5) return 'love';
  if (rating >= 4) return 'like';
  return 'dislike';
}

function normalizeBirthdayRating(rating: number): number | null {
  const r = Math.round(Number(rating));
  if (!Number.isFinite(r) || r < 1 || r > 5) return null;
  return r;
}

export async function setBirthdayRatingAction(
  rating: number,
  comment?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const stars = normalizeBirthdayRating(rating);
  if (stars == null) {
    return { ok: false, error: 'Elegí entre 1 y 5 estrellas.' };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Inicia sesión.' };

  const supabase = await createSupabaseServerClient();
  await ensureClienteFromAuth(supabase, user);

  const { data, error } = await supabase.rpc('set_birthday_club_reaction', {
    p_reaction: reactionFromRating(stars),
    p_comment: comment?.trim() || null,
    p_rating: stars,
  });
  if (error) return { ok: false, error: error.message };

  const payload = data as { ok?: boolean; error?: string };
  if (!payload?.ok) return { ok: false, error: payload?.error || 'No se pudo guardar.' };

  revalidatePath('/tu-cumpleanos');
  revalidatePath('/');
  revalidateTag('birthday-club-reviews', 'max');
  return { ok: true };
}

/** @deprecated Usar setBirthdayRatingAction */
export async function setBirthdayReactionAction(
  reaction: 'like' | 'dislike' | 'love',
  comment?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rating = reaction === 'love' ? 5 : reaction === 'like' ? 4 : 2;
  return setBirthdayRatingAction(rating, comment);
}

export async function sendBirthdayClubCommentAction(
  comment: string,
  rating = 5,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = comment.trim();
  if (!trimmed) {
    return { ok: false, error: 'Escribí un comentario antes de enviar.' };
  }
  return setBirthdayRatingAction(rating, trimmed);
}

export async function getBirthdayClubStatusAction() {
  const user = await getCurrentUser();
  if (!user) return { loggedIn: false as const };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_birthday_club_status');
  if (error) return { loggedIn: true as const, error: error.message };

  return { loggedIn: true as const, ...(data as object) };
}
