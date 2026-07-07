'use server';

import { revalidatePath } from 'next/cache';
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

export async function setBirthdayReactionAction(
  reaction: 'like' | 'dislike' | 'love',
  comment?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Inicia sesión.' };

  const supabase = await createSupabaseServerClient();
  await ensureClienteFromAuth(supabase, user);

  const { data, error } = await supabase.rpc('set_birthday_club_reaction', {
    p_reaction: reaction,
    p_comment: comment?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  const payload = data as { ok?: boolean; error?: string };
  if (!payload?.ok) return { ok: false, error: payload?.error || 'No se pudo guardar.' };

  revalidatePath('/tu-cumpleanos');
  revalidatePath('/');
  return { ok: true };
}

export async function sendBirthdayClubCommentAction(
  comment: string,
  reaction: 'like' | 'dislike' | 'love' = 'love',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = comment.trim();
  if (!trimmed) {
    return { ok: false, error: 'Escribí un comentario antes de enviar.' };
  }
  return setBirthdayReactionAction(reaction, trimmed);
}

export async function getBirthdayClubStatusAction() {
  const user = await getCurrentUser();
  if (!user) return { loggedIn: false as const };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_birthday_club_status');
  if (error) return { loggedIn: true as const, error: error.message };

  return { loggedIn: true as const, ...(data as object) };
}
