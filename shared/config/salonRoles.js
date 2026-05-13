/** Normaliza rol de profiles para comparar sin mayúsculas ni tildes. */
export function normalizeProfileRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Cuentas que pueden operar la app salón (debe coincidir con check_rol_types: admin). */
export function isSalonAdminRole(role) {
  return normalizeProfileRole(role) === 'admin';
}
