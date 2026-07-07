'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Gift, Heart, ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  sendGiftCardCommentAction,
  setGiftCardReactionAction,
} from '@/app/gift-card-review/actions';

type ReactionKind = 'like' | 'dislike' | 'love' | null;

export function GiftCardReviewPanel({
  initialReaction,
  initialComment,
  giftCardCodigo,
  onClose,
}: {
  initialReaction: ReactionKind;
  initialComment: string;
  giftCardCodigo?: string | null;
  onClose?: () => void;
}) {
  const [reaction, setReaction] = useState<ReactionKind>(initialReaction);
  const [comment, setComment] = useState(initialComment);
  const [draftComment, setDraftComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onReaction = (kind: 'like' | 'dislike' | 'love') => {
    setError(null);
    setReaction(kind);
    startTransition(async () => {
      const res = await setGiftCardReactionAction(kind, draftComment.trim() || comment || null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (draftComment.trim()) setComment(draftComment.trim());
    });
  };

  const onSendComment = () => {
    const trimmed = draftComment.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      const reactionToSend = reaction ?? 'love';
      const res = await sendGiftCardCommentAction(trimmed, reactionToSend);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setComment(trimmed);
      if (!reaction) setReaction('love');
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-gold">
          <Gift className="h-5 w-5" strokeWidth={1.5} />
          <div>
            <h3 className="text-lg font-light text-cream">Tarjeta regalo</h3>
            <p className="text-[11px] text-muted">Experiencia verificada</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-cream"
            aria-label="Cerrar"
          >
            ×
          </button>
        ) : null}
      </div>

      {giftCardCodigo ? (
        <p className="text-xs text-muted">
          Tarjeta vinculada: <span className="font-medium text-pearl">{giftCardCodigo}</span>
        </p>
      ) : null}

      <p className="text-sm text-muted">
        Tu opinión llega al equipo de marketing del salón en tiempo real.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onReaction('like')}
          disabled={pending}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
            reaction === 'like'
              ? 'border-gold bg-gold/15 text-gold'
              : 'border-border text-muted hover:border-gold/40'
          }`}
        >
          <ThumbsUp className="h-4 w-4" /> Me gusta
        </button>
        <button
          type="button"
          onClick={() => onReaction('dislike')}
          disabled={pending}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
            reaction === 'dislike'
              ? 'border-red-400/50 bg-red-500/10 text-red-300'
              : 'border-border text-muted hover:border-red-400/30'
          }`}
        >
          <ThumbsDown className="h-4 w-4" /> No me convence
        </button>
        <button
          type="button"
          onClick={() => onReaction('love')}
          disabled={pending}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
            reaction === 'love'
              ? 'border-pink-400/50 bg-pink-500/10 text-pink-200'
              : 'border-border text-muted hover:border-pink-400/30'
          }`}
        >
          <Heart className="h-4 w-4" /> Me encanta
        </button>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-widest text-muted">
          Comentario (opcional)
        </label>
        <textarea
          value={draftComment}
          onChange={(e) => setDraftComment(e.target.value)}
          placeholder="Compartí tu experiencia con la tarjeta regalo…"
          rows={3}
          disabled={pending}
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-gold disabled:opacity-60"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSendComment}
            disabled={pending || !draftComment.trim()}
            className="rounded-full bg-gold px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-charcoal transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Enviando…' : 'Enviar'}
          </button>
          {comment ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted">
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-emerald-500"
                strokeWidth={2.5}
                aria-hidden
              />
              <span>
                Enviado: <span className="text-pearl">{comment}</span>
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
