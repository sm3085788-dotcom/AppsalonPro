'use client';

import { MapPin, ChevronDown } from 'lucide-react';
import { useBranch } from './BranchContext';

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

  return (
    <label
      className={`group flex items-center gap-2 border border-border text-sm font-light transition-colors hover:border-border-strong focus-within:border-gold ${
        isField
          ? 'w-full rounded-xl bg-surface-2 px-4 py-3'
          : `rounded-full bg-surface/60 px-3.5 ${compact ? 'py-1.5' : 'py-2'}`
      }`}
    >
      <MapPin className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.25} aria-hidden />
      <span className="sr-only">Sucursal</span>
      <select
        value={selectedBranchId ?? ''}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className={`min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-5 text-foreground outline-none ${
          isField ? 'text-sm' : ''
        }`}
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id} className="bg-surface text-foreground">
            {b.nombre}
            {b.es_matriz ? ' (Matriz)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown
        className="-ml-5 h-4 w-4 text-muted group-hover:text-gold"
        aria-hidden
      />
    </label>
  );
}
