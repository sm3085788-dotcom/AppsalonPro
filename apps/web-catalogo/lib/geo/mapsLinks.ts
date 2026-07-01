import type { Branch } from '@/lib/types/db';

/** Abre Google Maps con búsqueda de dirección (no requiere API key). */
export function buildGoogleMapsUrl(query: string): string {
  const q = query.trim();
  if (!q) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function branchMapsQuery(branch: Pick<Branch, 'nombre' | 'direccion'>): string {
  const dir = branch.direccion?.trim();
  if (dir) return dir;
  return `${branch.nombre}, Guatemala`;
}

export function branchGoogleMapsUrl(branch: Pick<Branch, 'nombre' | 'direccion'>): string {
  return buildGoogleMapsUrl(branchMapsQuery(branch));
}
