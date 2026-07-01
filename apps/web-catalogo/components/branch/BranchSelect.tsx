'use client';

import { MapPin, ChevronDown } from 'lucide-react';
import { useBranch } from './BranchContext';
import type { Branch } from '@/lib/types/db';

function branchHeaderLabel(b: Branch): string {
  if (b.es_matriz) return 'Matriz';
  const name = b.nombre.trim();
  return name.length <= 14 ? name : `${name.slice(0, 13)}…`;
}

/** Selector de sucursal (Req 2: el usuario web elige branch_id antes de reservar). */
export function BranchSelect({
  compact = false,
  variant = 'pill',
}: {
  compact?: boolean;
  /** pill = header; field = formularios a ancho completo */
  variant?: 'pill' | 'field';
}) {
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch();

  if (branches.length === 0) {
    return (
      <span className="text-xs text-muted">Sucursales no disponibles</span>
    );
  }

  const isField = variant === 'field';
  const isHeaderCompact = compact && !isField;

  return (
    <label
      className={`group flex min-w-0 items-center gap-1.5 border border-border font-light transition-colors hover:border-border-strong focus-within:border-gold ${
        isField
          ? 'w-full rounded-xl bg-surface-2 px-4 py-3 text-sm'
          : `max-w-[7.25rem] rounded-full bg-surface/60 min-[400px]:max-w-[8.75rem] sm:max-w-none ${
              isHeaderCompact ? 'px-2 py-1.5 text-xs sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-sm' : 'px-3.5 py-2 text-sm'
            }`
      }`}
    >
      <MapPin
        className={`shrink-0 text-gold ${isHeaderCompact ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-4 w-4'}`}
        strokeWidth={1.25}
        aria-hidden
      />
      <span className="sr-only">Sucursal</span>
      <select
        value={selectedBranchId ?? ''}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className={`min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent pr-4 text-foreground outline-none sm:pr-5 ${
          isField ? 'text-sm' : isHeaderCompact ? 'text-xs sm:text-sm' : ''
        }`}
        title={branches.find((b) => b.id === selectedBranchId)?.nombre}
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id} className="bg-surface text-foreground">
            {isHeaderCompact
              ? branchHeaderLabel(b)
              : `${b.nombre}${b.es_matriz ? ' (Matriz)' : ''}`}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`-ml-4 shrink-0 text-muted group-hover:text-gold sm:-ml-5 ${
          isHeaderCompact ? 'h-3.5 w-3.5 sm:h-4 sm:w-4' : 'h-4 w-4'
        }`}
        aria-hidden
      />
    </label>
  );
}
