import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { formatQ } from '@/lib/format';
import type { Product } from '@/lib/types/db';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/producto/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-gold/50"
    >
      <div className="relative h-44 w-full overflow-hidden bg-surface-2">
        {product.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imagenUrl}
            alt={product.nombre}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-border" />
          </div>
        )}
        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-medium ${
            product.enStock
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-red-500/15 text-red-300'
          }`}
        >
          {product.enStock ? `Stock: ${product.stock}` : 'Agotado'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-medium text-cream">{product.nombre}</h3>
        {product.categoria && (
          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted">
            {product.categoria}
          </p>
        )}
        <div className="mt-2">
          <StarRatingDisplay
            value={product.rating}
            count={product.reviewCount}
            size={13}
          />
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-lg font-light text-gold">
            {formatQ(product.precio)}
          </span>
          <span className="text-xs text-muted group-hover:text-gold">
            Ver detalle →
          </span>
        </div>
      </div>
    </Link>
  );
}
