import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { formatQ } from '@/lib/format';
import type { Product } from '@/lib/types/db';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/producto/${product.id}`} className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2 ring-gold-hover sm:aspect-[3/4] sm:rounded-2xl">
        {product.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-border-strong sm:h-10 sm:w-10" strokeWidth={1} />
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[9px] font-light uppercase tracking-[0.12em] sm:right-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.14em] ${
            product.enStock
              ? 'border-border-strong glass text-cream'
              : 'border-red-400/30 bg-red-500/10 text-red-300'
          }`}
        >
          {product.enStock ? (
            <>
              <span className="sm:hidden">{product.stock}</span>
              <span className="hidden sm:inline">{`Stock · ${product.stock}`}</span>
            </>
          ) : (
            'Agotado'
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col pt-2 sm:pt-5">
        {product.categoria && (
          <p className="hidden text-[11px] uppercase tracking-[0.2em] text-muted sm:block">
            {product.categoria}
          </p>
        )}
        <div className="mt-0.5 flex flex-col gap-1 sm:mt-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h3 className="line-clamp-2 text-sm font-light leading-snug text-pearl transition-colors group-hover:text-gold sm:text-lg">
            {product.nombre}
          </h3>
          <span className="shrink-0 text-sm font-light text-gold sm:text-base">
            {formatQ(product.precio)}
          </span>
        </div>
        <div className="mt-1.5 sm:mt-3">
          <StarRatingDisplay
            value={product.rating}
            count={product.reviewCount}
            size={12}
          />
        </div>
        <div className="mt-auto hidden pt-5 sm:block">
          <span className="link-underline text-[13px] font-light uppercase tracking-[0.18em] text-cream group-hover:text-gold">
            Ver detalle
          </span>
        </div>
      </div>
    </Link>
  );
}
