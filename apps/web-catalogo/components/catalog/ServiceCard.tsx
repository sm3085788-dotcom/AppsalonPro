import Link from 'next/link';
import { Scissors, Clock } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { formatQ } from '@/lib/format';
import type { Service } from '@/lib/types/db';

export function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-gold/50">
      <div className="relative h-44 w-full overflow-hidden bg-surface-2">
        {service.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imagenUrl}
            alt={service.nombre}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Scissors className="h-10 w-10 text-border" />
          </div>
        )}
        {service.categoria && (
          <span className="absolute left-3 top-3 rounded-full bg-charcoal/80 px-3 py-1 text-[10px] uppercase tracking-wide text-gold">
            {service.categoria}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-medium text-cream">{service.nombre}</h3>
        {service.descripcion && (
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            {service.descripcion}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
          {service.duracionMin ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {service.duracionMin} min
            </span>
          ) : null}
          <StarRatingDisplay
            value={service.rating}
            count={service.reviewCount}
            size={13}
          />
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-lg font-light text-gold">
            {formatQ(service.precio)}
          </span>
          <Link
            href={`/reservar?servicio=${encodeURIComponent(service.id)}`}
            className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-charcoal transition-colors hover:bg-gold-soft"
          >
            Reservar
          </Link>
        </div>
      </div>
    </div>
  );
}
