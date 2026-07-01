import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { formatQ } from '@/lib/format';
import type { Product } from '@/lib/types/db';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/producto/${product.id}`} className="group flex flex-col">
      <div className="media-3-4 ring-gold-hover rounded-2xl border border-border bg-surface-2">
        {product.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imagenUrl} alt={product.nombre} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-border-strong" strokeWidth={1} />
          </div>
        )}
        <span
          className={`absolute right-4 top-4 rounded-full border px-3 py-1 text-[10px] font-light uppercase tracking-[0.14em] ${
            product.enStock
              ? 'border-border-strong glass text-cream'
              : 'border-red-400/30 bg-red-500/10 text-red-300'
          }`}
        >
          {product.enStock ? `Stock · ${product.stock}` : 'Agotado'}
        </span>
      </div>

      <div className="flex flex-1 flex-col pt-5">
        {product.categoria && (
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
            {product.categoria}
          </p>
        )}
        <div className="mt-1.5 flex items-start justify-between gap-4">
          <h3 className="text-lg font-light text-pearl transition-colors group-hover:text-gold">
            {product.nombre}
          </h3>
          <span className="shrink-0 text-base font-light text-gold">
            {formatQ(product.precio)}
          </span>
        </div>
        <div className="mt-3">
          <StarRatingDisplay
            value={product.rating}
            count={product.reviewCount}
            size={13}
          />
        </div>
        <div className="mt-auto pt-5">
          <span className="link-underline text-[13px] font-light uppercase tracking-[0.18em] text-cream group-hover:text-gold">
            Ver detalle
          </span>
        </div>
      </div>
    </Link>
  );
}
