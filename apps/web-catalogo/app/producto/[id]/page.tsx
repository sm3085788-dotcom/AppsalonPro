import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { getProductById } from '@/lib/data/catalog';
import { getSelectedBranchId } from '@/lib/data/selectedBranch';
import { getReviews, canReview, userHasReviewed } from '@/lib/data/reviews';
import { getCurrentUser, getClienteNombre } from '@/lib/auth';
import { ProductPurchase } from '@/components/catalog/ProductPurchase';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewForm } from '@/components/reviews/ReviewForm';

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const branchId = await getSelectedBranchId();
  const product = await getProductById(id, branchId);

  if (!product) notFound();

  const [reviews, user] = await Promise.all([getReviews(id), getCurrentUser()]);
  const [puedeResenar, yaReseno, nombre] = await Promise.all([
    user ? canReview(id) : Promise.resolve(false),
    user ? userHasReviewed(id, user.id) : Promise.resolve(false),
    user ? getClienteNombre(user.id) : Promise.resolve(''),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/productos"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a productos
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface-2">
          {product.imagenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imagenUrl}
              alt={product.nombre}
              className="h-full max-h-[480px] w-full object-cover"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center">
              <ShoppingBag className="h-16 w-16 text-border" />
            </div>
          )}
        </div>

        <div>
          {product.categoria && (
            <p className="text-xs uppercase tracking-[0.3em] text-gold">
              {product.categoria}
            </p>
          )}
          <h1 className="mt-2 text-3xl font-light text-cream">
            {product.nombre}
          </h1>
          <div className="mt-3">
            <StarRatingDisplay
              value={product.rating}
              count={product.reviewCount}
            />
          </div>
          {product.descripcion && (
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">
              {product.descripcion}
            </p>
          )}
          <div className="mt-6">
            <ProductPurchase product={product} />
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-light text-cream">Reseñas</h2>

        {!user ? (
          <p className="mb-6 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
            <Link href="/login" className="text-gold hover:underline">
              Inicia sesión
            </Link>{' '}
            para ver y escribir reseñas verificadas.
          </p>
        ) : puedeResenar && !yaReseno ? (
          <div className="mb-8">
            <ReviewForm inventarioId={id} autorNombre={nombre} />
          </div>
        ) : (
          <p className="mb-6 rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
            {yaReseno
              ? 'Ya dejaste tu reseña para este producto. ¡Gracias!'
              : 'Solo quienes recibieron este producto pueden reseñarlo.'}
          </p>
        )}

        <ReviewList reviews={reviews} />
      </section>
    </div>
  );
}
