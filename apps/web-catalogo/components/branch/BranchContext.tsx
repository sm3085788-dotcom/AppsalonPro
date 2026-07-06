'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Branch, UUID } from '@/lib/types/db';

interface BranchContextValue {
  branches: Branch[];
  selectedBranchId: UUID | null;
  selectedBranch: Branch | null;
  setSelectedBranchId: (id: UUID) => void;
}

const BranchContext = createContext<BranchContextValue | null>(null);
const STORAGE_KEY = 'appsalon.sucursal';

/** Persiste la sucursal en cookie para que el SSR pueda leerla (stock por sucursal). */
function writeBranchCookie(id: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${STORAGE_KEY}=${id}; path=/; max-age=31536000; samesite=lax`;
}

export function BranchProvider({
  branches,
  initialBranchId = null,
  children,
}: {
  branches: Branch[];
  /** Sucursal leída en SSR (cookie) para que el primer render coincida con el cliente. */
  initialBranchId?: UUID | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [selectedBranchId, setSelected] = useState<UUID | null>(initialBranchId);

  // Restaura la sucursal elegida o usa la matriz / primera activa.
  useEffect(() => {
    if (branches.length === 0) return;
    const stored =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    const valid = stored && branches.some((b) => b.id === stored);
    if (valid) {
      setSelected(stored);
      writeBranchCookie(stored);
    } else {
      const matriz = branches.find((b) => b.es_matriz) ?? branches[0];
      setSelected(matriz.id);
      writeBranchCookie(matriz.id);
    }
  }, [branches]);

  const setSelectedBranchId = (id: UUID) => {
    setSelected(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    writeBranchCookie(id);
    router.refresh();
  };

  const value = useMemo<BranchContextValue>(() => {
    return {
      branches,
      selectedBranchId,
      selectedBranch:
        branches.find((b) => b.id === selectedBranchId) ?? null,
      setSelectedBranchId,
    };
  }, [branches, selectedBranchId]);

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranch(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranch debe usarse dentro de <BranchProvider>');
  }
  return ctx;
}
