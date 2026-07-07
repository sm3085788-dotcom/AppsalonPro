'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureClienteFromAuth } from '@/lib/data/cliente';
import { getCurrentUser } from '@/lib/auth';

export type GiftCardReviewStatus = {
  loggedIn: boolean;
  eligible?: boolean;
  giftCardCodigo?: string | null;
  initialReaction?: 'like' | 'dislike' | 'love' | null;
  initialComment?: string;
};

export async function getGiftCardReviewStatusForPage(): Promise<GiftCardReviewStatus> {
  const user = await getCurrentUser();
  if (!user) return { loggedIn: false };

  const supabase = await createSupabaseServerClient();
  await ensureClienteFromAuth(supabase, user);

  const { data, error } = await supabase.rpc('get_gift_card_review_status');
  if (error) return { loggedIn: true, eligible: false };

  const payload = data as {
    ok?: boolean;
    logged_in?: boolean;
    eligible?: boolean;
    gift_card_codigo?: string | null;
    reaction?: { reaction?: string; comment?: string | null } | null;
  };

  const reactionRow = payload?.reaction;
  const reactionKind = reactionRow?.reaction;
  const initialReaction =
    reactionKind === 'like' || reactionKind === 'dislike' || reactionKind === 'love'
      ? reactionKind
      : null;

  return {
    loggedIn: true,
    eligible: Boolean(payload?.eligible),
    giftCardCodigo: payload?.gift_card_codigo ?? null,
    initialReaction,
    initialComment: String(reactionRow?.comment || '').trim(),
  };
}

export async function setGiftCardReactionAction(
  reaction: 'like' | 'dislike' | 'love',
  comment?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Inicia sesión.' };

  const supabase = await createSupabaseServerClient();
  await ensureClienteFromAuth(supabase, user);

  const { data, error } = await supabase.rpc('set_gift_card_reaction', {
    p_reaction: reaction,
    p_comment: comment?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };

  const payload = data as { ok?: boolean; error?: string };
  if (!payload?.ok) return { ok: false, error: payload?.error || 'No se pudo guardar.' };

  revalidatePath('/');
  revalidateTag('gift-card-reviews', 'max');
  return { ok: true };
}

export async function sendGiftCardCommentAction(
  comment: string,
  reaction: 'like' | 'dislike' | 'love' = 'love',
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = comment.trim();
  if (!trimmed) {
    return { ok: false, error: 'Escribí un comentario antes de enviar.' };
  }
  return setGiftCardReactionAction(reaction, trimmed);
}
