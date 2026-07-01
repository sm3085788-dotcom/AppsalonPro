import Link from 'next/link';
import { Scissors, Clock, ArrowUpRight } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { formatQ } from '@/lib/format';
import {
  PRECIO_A_TU_MEDIDA_HINT,
  PRECIO_A_TU_MEDIDA_LABEL,
} from '@/lib/bookingPolicy';
import type { Service } from '@/lib/types/db';

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2 ring-gold-hover sm:aspect-[3/4] sm:rounded-2xl">
        {service.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.imagenUrl}
            alt={service.nombre}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Scissors className="h-8 w-8 text-border-strong sm:h-10 sm:w-10" strokeWidth={1} />
          </div>
        )}
        {service.categoria && (
          <span className="absolute left-2 top-2 rounded-full border border-border-strong glass px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-cream sm:left-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.18em]">
            {service.categoria}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-2 sm:pt-5">
        <div className="mt-0.5 flex flex-col gap-1 sm:mt-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <h3 className="line-clamp-2 text-sm font-light leading-snug text-pearl transition-colors group-hover:text-gold sm:text-lg">
            {service.nombre}
          </h3>
          {service.precioVariable ? (
            <div className="shrink-0 text-right sm:max-w-[9rem]">
              <span className="block text-sm font-light text-gold sm:text-base">
                {PRECIO_A_TU_MEDIDA_LABEL}
              </span>
              <span className="mt-0.5 hidden text-[10px] font-light leading-snug text-muted sm:block">
                {PRECIO_A_TU_MEDIDA_HINT}
              </span>
            </div>
          ) : (
            <span className="shrink-0 text-sm font-light text-gold sm:text-base">
              {formatQ(service.precio)}
            </span>
          )}
        </div>
        {service.precioVariable && (
          <p className="mt-1 text-[10px] font-light leading-snug text-muted sm:hidden">
            {PRECIO_A_TU_MEDIDA_HINT}
          </p>
        )}
        {service.descripcion && (
          <p className="mt-1.5 line-clamp-2 hidden text-sm font-light leading-relaxed text-muted sm:block">
            {service.descripcion}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-3 text-xs font-light text-muted sm:mt-3 sm:gap-4">
          {service.duracionMin ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.25} />
              {service.duracionMin} min
            </span>
          ) : null}
          <StarRatingDisplay
            value={service.rating}
            count={service.reviewCount}
            size={12}
          />
        </div>
        <div className="mt-2 sm:mt-auto sm:pt-5">
          <Link
            href={`/reservar?servicio=${encodeURIComponent(service.id)}`}
            className="link-underline inline-flex items-center gap-1 text-[11px] font-light uppercase tracking-[0.14em] text-cream group-hover:text-gold sm:gap-1.5 sm:text-[13px] sm:tracking-[0.18em]"
          >
            Reservar
            <ArrowUpRight className="hidden h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:inline" />
          </Link>
        </div>
      </div>
    </article>
  );
}
