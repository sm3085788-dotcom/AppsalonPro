import { Cake } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import type { ClientReview } from '@/lib/data/googleReviews';

function VerifiedExperienceBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
      Experiencia verificada
    </span>
  );
}

export function BirthdayClubTestimonials({ reviews }: { reviews: ClientReview[] }) {
  if (reviews.length === 0) return null;

  const avgRating =
    Math.round(
      (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length) * 10,
    ) / 10;

  return (
    <section className="mt-14 border-t border-border pt-12">
      <div className="flex items-center gap-2">
        <Cake className="h-5 w-5 text-gold" aria-hidden />
        <h2 className="text-lg font-light text-cream">Clientas contentas</h2>
      </div>
      <p className="mt-2 text-sm font-light text-muted">
        Comentarios reales de quienes ya probaron el Club Tu Cumpleaños en la web.
      </p>
      <div className="mt-3">
        <StarRatingDisplay value={avgRating} count={reviews.length} size={14} />
      </div>

      <ul className="mt-6 space-y-4">
        {reviews.slice(0, 8).map((review) => (
          <li
            key={review.id}
            className="rounded-xl border border-border/80 bg-charcoal/40 px-4 py-4 sm:px-5"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <VerifiedExperienceBadge />
              <span className="text-sm font-medium text-pearl">{review.authorName}</span>
              <span className="text-xs text-muted">{review.relativeTime}</span>
            </div>
            <div className="mt-2">
              <StarRatingDisplay value={review.rating} size={12} />
            </div>
            <p className="mt-3 text-sm font-light leading-relaxed text-muted">
              {review.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
