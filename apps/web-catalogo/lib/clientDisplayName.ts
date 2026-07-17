import type { User } from '@supabase/supabase-js';

/** Capitaliza cada palabra mientras se escribe (nombre y apellido). */
export function formatPersonNameInput(raw: string): string {
  return raw.replace(/(^|[\s])(\S*)/g, (_, sep: string, word: string) => {
    if (!word) return sep;
    return (
      sep +
      word.charAt(0).toLocaleUpperCase('es') +
      word.slice(1).toLocaleLowerCase('es')
    );
  });
}

export function splitFullName(full: string) {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { nombre: '', apellido: '' };
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}

export function joinFullName(nombre: string, apellido: string) {
  return `${String(nombre || '').trim()} ${String(apellido || '').trim()}`.trim();
}

export function displayNameFromUser(user: User | null | undefined): string {
  if (!user) return '';
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const full = String(md.full_name ?? md.nombre ?? '').trim();
  if (full) return full;
  const joined = joinFullName(
    String(md.first_name ?? ''),
    String(md.last_name ?? ''),
  );
  if (joined) return joined;
  return user.email?.split('@')[0] ?? 'Cliente';
}

export function profileNameFromClienteAndAuth(
  clienteRow: { nombre?: string | null } | null,
  user: User | null | undefined,
) {
  const md = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const firstMeta = String(md.first_name ?? '').trim();
  const lastMeta = String(md.last_name ?? '').trim();
  const fullAuth = user ? displayNameFromUser(user) : '';
  const fullRow = String(clienteRow?.nombre ?? '').trim();

  const pickFull = [fullAuth, fullRow].sort(
    (a, b) =>
      b.split(/\s+/).filter(Boolean).length -
      a.split(/\s+/).filter(Boolean).length,
  )[0];

  let { nombre, apellido } = splitFullName(pickFull);
  if (firstMeta) nombre = firstMeta;
  if (lastMeta) apellido = lastMeta;
  if (!apellido && lastMeta) apellido = lastMeta;
  if (!nombre && firstMeta) nombre = firstMeta;

  return { nombre, apellido };
}

export function isFullerName(incoming: string, existing: string) {
  const a = String(incoming || '').trim();
  const b = String(existing || '').trim();
  if (!a) return false;
  if (!b) return true;
  return (
    a.split(/\s+/).filter(Boolean).length >
    b.split(/\s+/).filter(Boolean).length
  );
}
