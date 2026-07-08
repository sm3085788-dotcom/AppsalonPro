import { CheckCircle2 } from 'lucide-react';
import { ESTADO_LABELS, type JoinTeamEstado } from '@/lib/recruitment/constants';

export function JoinTeamStatusBadge({ estado }: { estado: JoinTeamEstado }) {
  const isReviewed = estado === 'revisado';
  return (
    <span
      className={
        isReviewed
          ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400'
          : 'inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold'
      }
    >
      {isReviewed ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {ESTADO_LABELS[estado]}
    </span>
  );
}
