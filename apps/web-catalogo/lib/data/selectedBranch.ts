import { cookies } from 'next/headers';
import { listBranches } from '@/lib/data/branches';
import type { Branch, UUID } from '@/lib/types/db';

const COOKIE = 'appsalon.sucursal';

/**
 * Resuelve la sucursal activa para SSR: cookie elegida por el usuario o, en su
 * defecto, la matriz / primera activa.
 */
export async function getSelectedBranch(): Promise<Branch | null> {
  const store = await cookies();
  const fromCookie = store.get(COOKIE)?.value ?? null;
  const branches = await listBranches();
  if (branches.length === 0) return null;
  if (fromCookie) {
    const match = branches.find((b) => b.id === fromCookie);
    if (match) return match;
  }
  return branches.find((b) => b.es_matriz) ?? branches[0];
}

export async function getSelectedBranchId(): Promise<UUID | null> {
  const branch = await getSelectedBranch();
  return branch?.id ?? null;
}
