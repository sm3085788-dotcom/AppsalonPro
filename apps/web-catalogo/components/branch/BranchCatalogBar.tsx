'use client';

import { BranchSelect } from './BranchSelect';
import { useBranch } from './BranchContext';

/** Selector de sucursal visible en listados (productos, etc.). */
export function BranchCatalogBar() {
  const { branches, selectedBranch } = useBranch();

  if (branches.length === 0) return null;

  return (
    <div className="mb-8 max-w-md">
      <label className="mb-2 block text-sm text-muted">Sucursal</label>
      <BranchSelect variant="field" />
      {selectedBranch && (
        <p className="mt-2 text-xs text-muted">
          Mostrando disponibilidad para {selectedBranch.nombre}.
        </p>
      )}
    </div>
  );
}
