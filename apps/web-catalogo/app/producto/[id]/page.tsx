import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShoppingBag, BadgeCheck } from 'lucide-react';
import { getProductById } from '@/lib/data/catalog';
import { getSelectedBranchId } from '@/lib/data/selectedBranch';
import { getReviews, canReview, userHasReviewed } from '@/lib/data/reviews';
import { getCurrentUser, getClienteDisplayName } from '@/lib/auth';
import { ProductPurchase } from '@/components/catalog/ProductPurchase';
import { ProductReviewsSection } from '@/components/reviews/ProductReviewsSection';
import { StarRatingDisplay } from '@/components/ui/StarRating';

function averageRating(reviews: { rating: number }[], fallback: number | null): number | null {
  if (reviews.length === 0) return fallback;
  const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const branchId = await getSelectedBranchId();
  const [product, reviews, user] = await Promise.all([
    getProductById(id, branchId),
    getReviews(id),
    getCurrentUser(),
  ]);

  if (!product) notFound();

  const [eligible, hasReviewed, autorNombre] = user
    ? await Promise.all([
        canReview(id),
        userHasReviewed(id, user.id),
        getClienteDisplayName(user.id, user),
      ])
    : [false, false, ''];

  const displayRating = averageRating(reviews, product.rating);
  const displayCount = reviews.length > 0 ? reviews.length : product.reviewCount;
  const showReviewForm = Boolean(user && eligible && !hasReviewed);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/productos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a productos
      </Link>

      <div className="grid gap-12 lg:grid-cols-2">
        <div className="flex justify-center lg:justify-start">
          <div
            className={`product-detail-media overflow-hidden rounded-[28px] border border-border${
              product.imagenUrl ? '' : ' product-detail-media--empty w-full bg-surface-2'
            }`}
          >
            {product.imagenUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imagenUrl} alt={product.nombre} />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ShoppingBag className="h-16 w-16 text-border-strong" strokeWidth={1} />
              </div>
            )}
          </div>
        </div>

        <div className="lg:pt-4">
          {product.categoria && (
            <p className="eyebrow">{product.categoria}</p>
          )}
          <h1 className="mt-3 text-balance text-4xl font-light tracking-tight text-cream">
            {product.nombre}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StarRatingDisplay value={displayRating} count={displayCount} />
            {reviews.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {reviews.length} {reviews.length === 1 ? 'reseña verificada' : 'reseñas verificadas'}
              </span>
            ) : null}
          </div>
          {product.descripcion && (
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">
              {product.descripcion}
            </p>
          )}
          <div className="mt-4">
            <ProductPurchase product={product} />
          </div>
        </div>
      </div>

      <ProductReviewsSection
        inventarioId={product.id}
        reviews={reviews}
        rating={displayRating}
        reviewCount={displayCount}
        showForm={showReviewForm}
        autorNombre={autorNombre}
        loggedIn={Boolean(user)}
        canReview={eligible}
        hasReviewed={hasReviewed}
      />
    </div>
  );
}
