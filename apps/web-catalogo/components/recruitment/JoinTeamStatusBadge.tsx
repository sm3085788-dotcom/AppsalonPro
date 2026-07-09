import { CheckCircle2 } from 'lucide-react';
import { ESTADO_LABELS, type JoinTeamEstado } from '@/lib/recruitment/constants';

export function JoinTeamStatusBadge({ estado }: { estado: JoinTeamEstado }) {
  const isReviewed = estado === 'revisado';
  const base =
    'inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium';
  return (
    <span
      className={
        isReviewed
          ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-400`
          : `${base} border-gold/30 bg-gold/10 text-gold`
      }
    >
      {isReviewed ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {ESTADO_LABELS[estado]}
    </span>
  );
}
