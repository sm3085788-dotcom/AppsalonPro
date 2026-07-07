'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cake, ChevronLeft, ChevronRight, Gift, Star, X } from 'lucide-react';
import { GiftCardReviewPanel } from '@/components/gift-card/GiftCardReviewPanel';
import type { GiftCardReviewStatus } from '@/app/gift-card-review/actions';
import type { ClientReview, GoogleReviewsPayload } from '@/lib/data/googleReviews';

function GoogleMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex justify-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="h-4 w-4 text-[#FBBC05]"
          fill={i <= rating ? '#FBBC05' : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function ReviewAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        className="h-14 w-14 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1a4d3e] text-lg font-medium text-white">
      {initial}
    </div>
  );
}

function ReviewCard({
  review,
  mapsUrl,
}: {
  review: ClientReview;
  mapsUrl: string;
}) {
  const isGoogle = review.source === 'google';
  const isBirthdayClub = review.source === 'birthday_club';
  const isGiftCard = review.source === 'gift_card';
  const isVerifiedWeb = isBirthdayClub || isGiftCard;

  return (
    <article className="flex h-full min-h-[280px] flex-col rounded-xl bg-white px-5 py-6 text-center shadow-lg sm:min-h-[300px] sm:px-6 sm:py-7">
      <div className="mx-auto">
        <ReviewAvatar name={review.authorName} photoUrl={review.authorPhotoUrl} />
      </div>
      <div className="mt-4">
        {isVerifiedWeb ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 sm:text-[11px]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            Experiencia verificada
          </span>
        ) : (
          <ReviewStars rating={review.rating} />
        )}
      </div>
      <p className="mt-4 line-clamp-5 flex-1 text-[13px] leading-relaxed text-[#333] sm:text-sm">
        {review.text}
      </p>
      {isGoogle ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-[11px] font-medium text-[#1a73e8] hover:underline sm:text-xs"
        >
          Leer la reseña completa &gt;
        </a>
      ) : null}
      <footer className="mt-5 flex flex-col items-center justify-center gap-1 border-t border-[#eee] pt-4 text-[10px] text-[#666] sm:text-[11px]">
        <div className="flex items-center justify-center gap-1.5">
          {isGoogle ? <GoogleMark className="h-3.5 w-3.5 shrink-0" /> : null}
          {isBirthdayClub ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1a4d3e]/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#1a4d3e] sm:text-[10px]">
              <Cake className="h-3 w-3" aria-hidden />
              Club Tu Cumpleaños
            </span>
          ) : null}
          {isGiftCard ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1a4d3e]/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#1a4d3e] sm:text-[10px]">
              <Gift className="h-3 w-3" aria-hidden />
              Tarjeta regalo
            </span>
          ) : null}
          <span>
            {review.authorName} · {review.relativeTime}
          </span>
        </div>
      </footer>
    </article>
  );
}

function headerSubtitle(source: GoogleReviewsPayload['source'], totalReviews: number) {
  if (source === 'google') {
    return `${totalReviews} reseñas en Google`;
  }
  if (source === 'birthday_club') {
    return `${totalReviews} clientas contentas con el Club Tu Cumpleaños`;
  }
  if (source === 'gift_card') {
    return `${totalReviews} clientas contentas con Tarjeta Regalo`;
  }
  if (source === 'mixed') {
    return `${totalReviews} reseñas de clientas y Google`;
  }
  return 'Sé la primera en compartir tu experiencia';
}

function HeaderSourceIcon({ source }: { source: GoogleReviewsPayload['source'] }) {
  if (source === 'google' || source === 'mixed') {
    return <GoogleMark className="h-5 w-5" />;
  }
  if (source === 'gift_card') {
    return <Gift className="h-5 w-5 text-gold" strokeWidth={1.5} />;
  }
  return <Cake className="h-5 w-5 text-gold" strokeWidth={1.5} />;
}

export function GoogleReviewsSection({
  data,
  giftReviewStatus,
}: {
  data: GoogleReviewsPayload;
  giftReviewStatus?: GiftCardReviewStatus;
}) {
  const { reviews, rating, totalReviews, placeName, googleMapsUrl, source } = data;
  const hasGoogle = source === 'google' || source === 'mixed';
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(1);
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);

  const canAddGiftReview = Boolean(giftReviewStatus?.loggedIn && giftReviewStatus?.eligible);
  const showGiftHint =
    giftReviewStatus?.loggedIn === true && giftReviewStatus?.eligible === false;
  const showLoginHint = giftReviewStatus?.loggedIn === false;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setVisible(mq.matches ? 3 : 1);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const pages = Math.max(1, reviews.length);

  const visibleReviews = useMemo(() => {
    if (reviews.length === 0) return [];
    return Array.from({ length: Math.min(visible, reviews.length) }, (_, i) => {
      return reviews[(index + i) % reviews.length];
    });
  }, [index, reviews, visible]);

  const goPrev = useCallback(() => {
    setIndex((prev) => (prev <= 0 ? reviews.length - 1 : prev - 1));
  }, [reviews.length]);

  const goNext = useCallback(() => {
    setIndex((prev) => (prev >= reviews.length - 1 ? 0 : prev + 1));
  }, [reviews.length]);

  useEffect(() => {
    if (reviews.length <= visible) return;
    const timer = setInterval(goNext, 7000);
    return () => clearInterval(timer);
  }, [goNext, reviews.length, visible]);

  const roundedRating = rating.toFixed(1);
  const subtitle = headerSubtitle(source, totalReviews);
  const hasWebVerifiedReviews =
    source === 'birthday_club' || source === 'gift_card' || source === 'mixed';

  return (
    <section
      id="resenas"
      className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-4 pt-5 sm:px-6 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-[29px]">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-salon.png"
            alt=""
            className="h-full w-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-charcoal/75" />
        </div>

        <div className="relative px-5 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <header className="text-center">
            <h2 className="text-balance text-2xl font-light text-white sm:text-3xl lg:text-[2rem]">
              Descubre lo que dicen nuestros clientes
            </h2>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-white">
              <HeaderSourceIcon source={source} />
              <span className="text-3xl font-light tabular-nums sm:text-4xl">
                {roundedRating}
              </span>
              <span className="text-sm font-light text-white/90 sm:text-base">
                {placeName}
              </span>
              <div className="flex w-full justify-center gap-0.5 sm:w-auto">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${hasGoogle ? 'text-[#FBBC05]' : 'text-gold'}`}
                    fill={i <= Math.round(rating) ? (hasGoogle ? '#FBBC05' : '#D4AF37') : 'transparent'}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              {hasGoogle ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-sm text-white/80 hover:text-white hover:underline sm:w-auto"
                >
                  {subtitle}
                </a>
              ) : (
                <span className="w-full text-sm text-white/75 sm:w-auto">
                  {subtitle}
                </span>
              )}
            </div>

            {canAddGiftReview ? (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setGiftPanelOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold transition-colors hover:border-gold/60 hover:bg-gold/15"
                >
                  <Gift className="h-4 w-4" aria-hidden />
                  Agregar reseña · Tarjeta regalo
                </button>
              </div>
            ) : null}

            {showGiftHint ? (
              <p className="mt-4 text-xs font-light text-white/60">
                Vinculá tu tarjeta en salón para compartir tu experiencia.
              </p>
            ) : null}

            {showLoginHint ? (
              <p className="mt-4 text-xs font-light text-white/60">
                <Link href="/login?redirect=/#resenas" className="text-gold hover:underline">
                  Iniciá sesión
                </Link>{' '}
                para dejar tu reseña de Tarjeta Regalo.
              </p>
            ) : null}
          </header>

          <div className="relative mt-7 sm:mt-9">
            {reviews.length === 0 ? (
              <p className="text-center text-sm font-light text-white/70">
                Las clientas del Club Tu Cumpleaños y Tarjeta Regalo comparten aquí su experiencia
                real.{' '}
                <a href="/tu-cumpleanos" className="text-gold hover:underline">
                  Únete y deja tu comentario
                </a>
                .
              </p>
            ) : (
              <>
                {reviews.length > visible ? (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Reseña anterior"
                      className="absolute -left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:-left-2 sm:block"
                    >
                      <ChevronLeft className="h-8 w-8" strokeWidth={1.25} />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Siguiente reseña"
                      className="absolute -right-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full p-2 text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:-right-2 sm:block"
                    >
                      <ChevronRight className="h-8 w-8" strokeWidth={1.25} />
                    </button>
                  </>
                ) : null}

                <div className="overflow-hidden px-1 sm:px-8">
                  <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
                    {visibleReviews.map((review) => (
                      <ReviewCard
                        key={`${review.id}-${index}`}
                        review={review}
                        mapsUrl={googleMapsUrl}
                      />
                    ))}
                  </div>
                </div>

                {pages > 1 ? (
                  <div className="mt-8 flex justify-center gap-2">
                    {reviews.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Reseña ${i + 1}`}
                        onClick={() => setIndex(i)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === index
                            ? 'w-6 bg-white'
                            : 'w-2 bg-white/35 hover:bg-white/55'
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            )}

            {hasWebVerifiedReviews ? (
              <p className="mt-8 text-center text-[11px] font-light leading-relaxed text-white/55 sm:text-xs">
                Las reseñas con etiqueta Club Tu Cumpleaños o Tarjeta regalo son comentarios
                reales de clientas que vivieron la experiencia en la web.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {giftPanelOpen && giftReviewStatus?.eligible ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gift-review-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-charcoal p-6 shadow-2xl">
            <div className="mb-1 flex justify-end">
              <button
                type="button"
                onClick={() => setGiftPanelOpen(false)}
                className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-cream"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <GiftCardReviewPanel
              initialReaction={giftReviewStatus.initialReaction ?? null}
              initialComment={giftReviewStatus.initialComment ?? ''}
              giftCardCodigo={giftReviewStatus.giftCardCodigo}
              onClose={() => setGiftPanelOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
