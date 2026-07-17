import { BadgeCheck } from 'lucide-react';
import { StarRatingDisplay } from '@/components/ui/StarRating';
import { formatFechaHora } from '@/lib/format';
import type { Review } from '@/lib/types/db';

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
        Aún no hay reseñas verificadas. Si ya recibiste este producto en el salón, podés ser la primera
        en opinar.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-cream">
                {r.autor_nombre?.trim() || 'Cliente'}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-300">
                <BadgeCheck className="h-3.5 w-3.5" /> Compra verificada
              </span>
            </div>
            <span className="text-xs text-muted">
              {formatFechaHora(r.created_at)}
            </span>
          </div>
          <div className="mt-2">
            <StarRatingDisplay value={r.rating} size={14} />
          </div>
          {r.comentario && (
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {r.comentario}
            </p>
          )}
          {r.foto_urls?.length > 0 && (
            <div className="mt-3 flex gap-2">
              {r.foto_urls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Foto de reseña"
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
