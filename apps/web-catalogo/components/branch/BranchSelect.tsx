'use client';

import { MapPin, ChevronDown } from 'lucide-react';
import { useBranch } from './BranchContext';

/** Selector de sucursal (Req 2: el usuario web elige branch_id antes de reservar). */
export function BranchSelect({ compact = false }: { compact?: boolean }) {
  const { branches, selectedBranchId, setSelectedBranchId } = useBranch();

  if (branches.length === 0) {
    return (
      <span className="text-xs text-muted">Sucursales no disponibles</span>
    );
  }

  return (
    <label
      className={`group flex items-center gap-2 rounded-full border border-border bg-surface px-3 ${
        compact ? 'py-1.5' : 'py-2'
      } text-sm`}
    >
      <MapPin className="h-4 w-4 text-gold" aria-hidden />
      <span className="sr-only">Sucursal</span>
      <select
        value={selectedBranchId ?? ''}
        onChange={(e) => setSelectedBranchId(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-5 text-foreground outline-none"
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
