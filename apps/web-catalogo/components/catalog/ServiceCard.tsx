import Link from 'next/link';
import { Scissors, Clock, ArrowUpRight } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { formatQ } from '@/lib/format';
import type { Service } from '@/lib/types/db';

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group flex flex-col">
      <div className="media-3-4 rounded-2xl border border-border bg-surface-2">
        {service.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.imagenUrl} alt={service.nombre} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Scissors className="h-10 w-10 text-border-strong" strokeWidth={1} />
          </div>
        )}
        {service.categoria && (
          <span className="absolute left-4 top-4 rounded-full border border-border-strong glass px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cream">
            {service.categoria}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-light text-cream">{service.nombre}</h3>
          <span className="shrink-0 text-base font-light text-gold">
            {formatQ(service.precio)}
          </span>
        </div>
        {service.descripcion && (
          <p className="mt-2 line-clamp-2 text-sm font-light leading-relaxed text-muted">
            {service.descripcion}
          </p>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs font-light text-muted">
          {service.duracionMin ? (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" strokeWidth={1.25} />{' '}
              {service.duracionMin} min
            </span>
          ) : null}
          <StarRatingDisplay
            value={service.rating}
            count={service.reviewCount}
            size={13}
          />
        </div>
        <div className="mt-auto pt-5">
          <Link
            href={`/reservar?servicio=${encodeURIComponent(service.id)}`}
            className="link-underline inline-flex items-center gap-1.5 text-[13px] font-light uppercase tracking-[0.18em] text-cream group-hover:text-gold"
          >
            Reservar
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
