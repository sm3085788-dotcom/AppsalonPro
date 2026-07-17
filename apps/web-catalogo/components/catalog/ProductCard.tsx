import Link from 'next/link';
import { ShoppingBag, Store, QrCode } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { ProductPrice, ProductPromoBadge } from '@/components/catalog/ProductPrice';
import { ProductQuickAddButton } from '@/components/catalog/ProductQuickAddButton';
import { TIENDA_WEB_PICKUP_LABEL } from '@/lib/tiendaPickup';
import type { Product } from '@/lib/types/db';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/producto/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong sm:rounded-2xl"
    >
      <div
        className={`product-card-media relative w-full overflow-hidden border-b border-border bg-[#F4F4F4]${
          product.imagenUrl ? '' : ' product-card-media--empty'
        }`}
      >
        {product.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imagenUrl} alt={product.nombre} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-neutral-400 sm:h-10 sm:w-10" strokeWidth={1.4} />
          </div>
        )}
        <ProductPromoBadge product={product} />
      </div>

      <div className="relative flex flex-1 flex-col p-3 pb-10 sm:p-4 sm:pb-11">
        <ProductQuickAddButton product={product} />
        {product.brandLine ? (
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted">{product.brandLine}</p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-[1.3] text-cream sm:min-h-[2.75rem] sm:text-sm">
          {product.nombre}
        </h3>

        <div className="mt-2">
          <ProductPrice product={product} />
        </div>

        <div className="mt-2">
          <StarRatingDisplay value={product.rating} count={product.reviewCount} size={12} />
        </div>

        <div className="mt-2 flex items-start gap-1.5">
          <span className="mt-0.5 flex shrink-0 items-center gap-0.5" aria-hidden>
            <Store className="h-3 w-3 text-muted" strokeWidth={2} />
            <QrCode className="h-3 w-3 text-gold/80" strokeWidth={2} />
          </span>
          <p className="text-[10px] leading-snug text-muted">
            {product.shippingLabel || TIENDA_WEB_PICKUP_LABEL}
          </p>
        </div>

        {product.stockHint ? (
          <p
            className={`mt-1.5 text-[10px] leading-snug ${
              product.enStock ? 'text-gold' : 'text-muted'
            }`}
          >
            {product.stockHint}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
