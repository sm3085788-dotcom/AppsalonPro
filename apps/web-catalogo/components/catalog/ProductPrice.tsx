import { formatQ } from '@/lib/format';
import type { Product } from '@/lib/types/db';

export function ProductPrice({
  product,
  size = 'card',
}: {
  product: Product;
  size?: 'card' | 'detail' | 'compact';
}) {
  if (product.precioVariable) {
    return (
      <span
        className={
          size === 'detail'
            ? 'text-lg font-light text-muted'
            : 'shrink-0 text-sm font-light text-muted sm:text-base'
        }
      >
        {product.priceLabel || 'Precio variable'}
      </span>
    );
  }

  if (!(product.precio > 0)) {
    return (
      <span
        className={
          size === 'detail'
            ? 'text-lg font-light text-muted'
            : 'shrink-0 text-sm font-light text-muted sm:text-base'
        }
      >
        Consultar en salón
      </span>
    );
  }

  const priceClass =
    size === 'detail'
      ? 'text-2xl font-medium text-gold'
      : size === 'compact'
        ? 'text-lg font-medium text-gold'
        : 'text-base font-medium text-gold';

  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      {product.compareAt != null && product.compareAt > product.precio ? (
        <span className="text-xs text-muted line-through sm:text-sm">
          {formatQ(product.compareAt)}
        </span>
      ) : null}
      <span className={priceClass}>{formatQ(product.precio)}</span>
    </span>
  );
}

export function ProductPromoBadge({ product }: { product: Product }) {
  if (!product.promoBadge) return null;
  const isPromo = product.promoVigente;
  return (
    <span
      className={`absolute left-2 top-2 z-10 max-w-[70%] sm:left-3 sm:top-3 ${
        isPromo
          ? 'inline-flex items-center rounded-full border border-emerald-400/50 bg-emerald-600/90 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.04em] text-white shadow-sm sm:px-2.5 sm:py-1 sm:text-[10px]'
          : 'text-[9px] font-normal uppercase leading-none tracking-[0.12em] text-neutral-500 sm:text-[10px]'
      }`}
    >
      {product.promoBadge}
    </span>
  );
}
