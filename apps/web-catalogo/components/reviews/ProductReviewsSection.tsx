import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import type { Review, UUID } from '@/lib/types/db';

export function ProductReviewsSection({
  inventarioId,
  reviews,
  rating,
  reviewCount,
  showForm,
  autorNombre,
  loggedIn,
  canReview,
  hasReviewed,
}: {
  inventarioId: UUID;
  reviews: Review[];
  rating: number | null;
  reviewCount: number;
  showForm: boolean;
  autorNombre: string;
  loggedIn: boolean;
  canReview: boolean;
  hasReviewed: boolean;
}) {
  return (
    <section className="mt-12 border-t border-border pt-10">
      <div className="mb-6">
        <p className="eyebrow">Opiniones verificadas</p>
        <h2 className="mt-1 text-xl font-light text-cream">Reseñas de clientes</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StarRatingDisplay value={rating} count={reviewCount} />
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Compra verificada
          </span>
        </div>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted">
          Solo clientas que recibieron este producto (pedido entregado) pueden publicar una reseña.
        </p>
      </div>

      <ReviewList reviews={reviews} />

      {showForm ? (
        <div className="mt-6">
          <ReviewForm inventarioId={inventarioId} autorNombre={autorNombre} />
        </div>
      ) : loggedIn && hasReviewed ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-muted">
          Ya publicaste tu reseña para este producto. ¡Gracias!
        </p>
      ) : loggedIn && !canReview ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-muted">
          Cuando recibas este producto en el salón podrás dejar tu reseña verificada.
        </p>
      ) : !loggedIn ? (
        <p className="mt-6 text-sm text-muted">
          <Link href={`/login?redirect=/producto/${inventarioId}`} className="text-gold hover:underline">
            Iniciá sesión
          </Link>{' '}
          para opinar después de tu compra entregada.
        </p>
      ) : null}
    </section>
  );
}
