import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { getProductById } from '@/lib/data/catalog';
import { getSelectedBranchId } from '@/lib/data/selectedBranch';
import { ProductPurchase } from '@/components/catalog/ProductPurchase';
import { StarRatingDisplay } from '@/components/ui/StarRating';

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const branchId = await getSelectedBranchId();
  const product = await getProductById(id, branchId);

  if (!product) notFound();

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
    </div>
  );
}
