/** Nombre completo ↔ campos de registro / perfil. */
export function splitFullName(full) {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { nombre: '', apellido: '' };
  if (parts.length === 1) return { nombre: parts[0], apellido: '' };
  return { nombre: parts[0], apellido: parts.slice(1).join(' ') };
}

export function joinFullName(nombre, apellido) {
  return `${String(nombre || '').trim()} ${String(apellido || '').trim()}`.trim();
}

export function displayNameFromAuthUser(user) {
  const md = user?.user_metadata || {};
  const full = String(md.full_name || '').trim();
  if (full) return full;
  const joined = joinFullName(md.first_name, md.last_name);
  if (joined) return joined;
  return user?.email?.split('@')[0] || 'Cliente';
}

/** Nombre + apellido para Editar perfil (ficha DB + metadata Auth). */
export function profileNameFromClienteAndAuth(clienteRow, sessionUser) {
  const md = sessionUser?.user_metadata || {};
  const firstMeta = String(md.first_name || '').trim();
  const lastMeta = String(md.last_name || '').trim();
  const fullAuth = sessionUser ? displayNameFromAuthUser(sessionUser) : '';
  const fullRow = String(clienteRow?.nombre || '').trim();

  const pickFull = [fullAuth, fullRow].sort(
    (a, b) => b.split(/\s+/).filter(Boolean).length - a.split(/\s+/).filter(Boolean).length,
  )[0];

  let { nombre, apellido } = splitFullName(pickFull);
  if (firstMeta) nombre = firstMeta;
  if (lastMeta) apellido = lastMeta;
  if (!apellido && lastMeta) apellido = lastMeta;
  if (!nombre && firstMeta) nombre = firstMeta;

  return { nombre, apellido };
}

export function isFullerName(incoming, existing) {
  const a = String(incoming || '').trim();
  const b = String(existing || '').trim();
  if (!a) return false;
  if (!b) return true;
  return a.split(/\s+/).filter(Boolean).length > b.split(/\s+/).filter(Boolean).length;
}
