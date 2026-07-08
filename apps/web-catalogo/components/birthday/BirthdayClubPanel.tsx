'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Cake, CheckCircle2, Gift, Heart, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { CustomerServiceWhatsAppButton } from '@/components/site/CustomerServiceWhatsAppButton';
import { BIRTHDAY_CLUB_PACKAGE, birthdayGreeting, birthdayPackageIntro } from '@/lib/birthday/benefits';
import { buildWhatsAppCustomerUrl, type WhatsAppCustomerContext } from '@/lib/salonContact';
import {
  enrollBirthdayClubAction,
  sendBirthdayClubCommentAction,
  setBirthdayReactionAction,
} from '@/app/tu-cumpleanos/actions';

type ReactionKind = 'like' | 'dislike' | 'love' | null;

export function BirthdayClubPanel({
  initialEnrolled,
  initialReaction,
  initialComment,
  firstName,
  customerWhatsappContext,
}: {
  initialEnrolled: boolean;
  initialReaction: ReactionKind;
  initialComment: string;
  firstName?: string;
  customerWhatsappContext?: WhatsAppCustomerContext;
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
    startTransition(async () => {
      const res = await setBirthdayReactionAction(kind, null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setReaction(kind);
    });
  };

  const onSendComment = () => {
    if (!enrolled) {
      setError('Unite al club primero.');
      return;
    }
    const trimmed = loveComment.trim();
    if (!trimmed) {
      setError('Escribí un comentario antes de enviar.');
      return;
    }
    setError(null);
    const reactionToSend = reaction ?? 'love';
    startTransition(async () => {
      const res = await sendBirthdayClubCommentAction(trimmed, reactionToSend);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setComment(trimmed);
      if (!reaction) setReaction('love');
    });
  };

  return (
    <div className="space-y-6">
      {!enrolled ? (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 text-center">
          <p className="text-sm text-muted">
            Confirmá tu fecha de cumpleaños en tu perfil y unite al club para recibir tu saludo y
            paquete de celebración.
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
          <article className="overflow-hidden rounded-2xl border border-gold/25 bg-surface">
            <header className="relative border-b border-gold/20 bg-gold/5 px-4 py-4 sm:px-5">
              <div
                className="pointer-events-none absolute -right-1 -top-1 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 sm:right-3 sm:top-3 sm:h-16 sm:w-16"
                aria-hidden
              >
                <Cake className="h-7 w-7 text-gold sm:h-8 sm:w-8" strokeWidth={1.5} />
              </div>

              <h3 className="pr-12 font-serif text-lg font-medium uppercase tracking-[0.14em] text-gradient-gold sm:pr-16 sm:text-xl">
                {BIRTHDAY_CLUB_PACKAGE.name}
              </h3>
              <p className="mt-3 text-xs font-light leading-relaxed text-pearl">
                {birthdayGreeting(firstName)}
              </p>
              <p className="mt-3 text-[11px] font-light leading-snug text-muted">
                {BIRTHDAY_CLUB_PACKAGE.scheduleNote}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link
                  href="/reservar"
                  className="inline-flex text-[11px] font-medium text-gold hover:underline"
                >
                  Reservar mi visita de cumpleaños →
                </Link>
                <CustomerServiceWhatsAppButton
                  href={buildWhatsAppCustomerUrl('cumpleanos', customerWhatsappContext)}
                />
              </div>
            </header>

            <div className="space-y-4 px-4 py-3 sm:px-5 sm:py-4">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Descuentos por tu cumpleaños
                </p>
                <p className="mb-2 text-[11px] font-light leading-relaxed text-muted">
                  {birthdayPackageIntro(firstName)}
                </p>
                <ul className="grid gap-0.5 sm:grid-cols-2">
                  {BIRTHDAY_CLUB_PACKAGE.serviceDiscounts.map((item) => (
                    <li
                      key={item.title}
                      className="flex min-h-0 items-start gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/60" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium leading-snug text-pearl">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-light leading-snug text-muted">
                          {item.detail}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
                  <Gift className="h-3.5 w-3.5" aria-hidden />
                  Obsequios incluidos
                </p>
                <p className="mb-2 text-[11px] font-light leading-relaxed text-muted">
                  {BIRTHDAY_CLUB_PACKAGE.giftsIntro}
                </p>
                <ul className="grid gap-0.5 sm:grid-cols-2">
                  {BIRTHDAY_CLUB_PACKAGE.gifts.map((item) => (
                    <li
                      key={item.title}
                      className="flex min-h-0 items-start gap-2 rounded-lg border border-border bg-charcoal/50 px-2.5 py-1.5"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium leading-snug text-pearl">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-light leading-snug text-muted">
                          {item.detail}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </>
      )}

      <div className="rounded-2xl border border-border bg-charcoal p-6">
        <div className="flex items-center gap-2 text-gold">
          <Cake className="h-5 w-5" />
          <h2 className="text-lg font-light text-cream">¿Te emociona tu día especial?</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          Esta reseña es tu comentario de satisfacción por compartir tu tiempo y tu día especial en{' '}
          <span className="font-serif font-medium uppercase tracking-[0.12em] text-gradient-gold">
            Salón Andreas
          </span>
          .
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

        {enrolled ? (
          <div className="mt-4">
            <label className="mb-2 block text-xs uppercase tracking-widest text-muted">
              Comentario (opcional)
            </label>
            <textarea
              value={loveComment}
              onChange={(e) => setLoveComment(e.target.value)}
              placeholder="Me encanta…"
              rows={2}
              disabled={pending}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground outline-none focus:border-gold disabled:opacity-60"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onSendComment}
                disabled={pending || !loveComment.trim()}
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
