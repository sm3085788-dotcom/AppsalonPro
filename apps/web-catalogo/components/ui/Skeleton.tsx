/** Bloque de carga con shimmer dorado sobre negro (Req 10). */
export function Skeleton({
  className = '',
  rounded = 'md',
}: {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}) {
  const radius =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === 'lg'
        ? 'rounded-2xl'
        : rounded === 'sm'
          ? 'rounded'
          : 'rounded-lg';
  return <div className={`skeleton ${radius} ${className}`} aria-hidden />;
}

/** Tarjeta de producto/servicio en carga. */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <Skeleton className="h-44 w-full" rounded="sm" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
