'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Cake, Heart, ThumbsDown, ThumbsUp } from 'lucide-react';
import { BIRTHDAY_CLUB_BENEFITS } from '@/lib/birthday/benefits';
import {
  enrollBirthdayClubAction,
  setBirthdayReactionAction,
} from '@/app/tu-cumpleanos/actions';

type ReactionKind = 'like' | 'dislike' | 'love' | null;

export function BirthdayClubPanel({
  initialEnrolled,
  initialReaction,
  initialComment,
}: {
  initialEnrolled: boolean;
  initialReaction: ReactionKind;
  initialComment: string;
}) {
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [reaction, setReaction] = useState<ReactionKind>(initialReaction);
  const [comment, setComment] = useState(initialComment);
  const [loveComment, setLoveComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onEnroll = () => {
    setError(null);
    startTransition(async () => {
      const res = await enrollBirthdayClubAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEnrolled(true);
    });
  };

  const onReaction = (kind: 'like' | 'dislike' | 'love') => {
    if (!enrolled) {
      setError('Unite al club primero.');
      return;
    }
    setError(null);
    const commentToSend = kind === 'love' ? loveComment.trim() || 'Me encanta' : null;
    startTransition(async () => {
      const res = await setBirthdayReactionAction(kind, commentToSend);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setReaction(kind);
      if (kind === 'love') setComment(commentToSend || 'Me encanta');
    });
  };

  return (
    <div className="space-y-10">
      {!enrolled ? (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 text-center">
          <p className="text-sm text-muted">
            Confirmá tu fecha de cumpleaños en tu perfil y unite al club para ver tus beneficios.
          </p>
          <button
            type="button"
            onClick={onEnroll}
            disabled={pending}
            className="mt-4 rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-charcoal disabled:opacity-60"
          >
            {pending ? 'Uniéndote…' : 'Unirme al club'}
          </button>
          <p className="mt-3 text-xs text-muted">
            ¿Falta tu cumpleaños?{' '}
            <Link href="/cuenta/perfil?from=/tu-cumpleanos" className="text-gold hover:underline">
              Completar perfil
            </Link>
          </p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {BIRTHDAY_CLUB_BENEFITS.map((benefit, i) => (
              <li
                key={benefit}
                className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm font-light text-pearl"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-medium text-gold">
                  {i + 1}
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <p className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
            Presenta tu identificación en recepción para activar tus beneficios el día de tu visita.
          </p>
        </>
      )}

      <div className="rounded-2xl border border-border bg-charcoal p-6">
        <div className="flex items-center gap-2 text-gold">
          <Cake className="h-5 w-5" />
          <h2 className="text-lg font-light text-cream">¿Te emociona tu día especial?</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          Tu opinión llega al equipo de marketing del salón en tiempo real.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onReaction('like')}
            disabled={pending || !enrolled}
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
            disabled={pending || !enrolled}
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
            disabled={pending || !enrolled}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
              reaction === 'love'
                ? 'border-pink-400/50 bg-pink-500/10 text-pink-200'
                : 'border-border text-muted hover:border-pink-400/30'
            }`}
          >
            <Heart className="h-4 w-4" /> Me encanta
          </button>
        </div>

        {reaction === 'love' || enrolled ? (
          <div className="mt-4">
            <label className="mb-2 block text-xs uppercase tracking-widest text-muted">
              Comentario (opcional)
            </label>
            <textarea
              value={loveComment}
              onChange={(e) => setLoveComment(e.target.value)}
              placeholder="Me encanta…"
              rows={2}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-gold"
            />
            {reaction === 'love' && comment ? (
              <p className="mt-2 text-xs text-muted">Enviado: {comment}</p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
