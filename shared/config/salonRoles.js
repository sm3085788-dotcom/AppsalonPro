/** Normaliza rol de profiles para comparar sin mayúsculas ni tildes. */
export function normalizeProfileRole(role) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Admin global (matriz): ve todas las sucursales y catálogo completo. */
export function isSalonGlobalAdmin(role) {
  const r = normalizeProfileRole(role);
  return r === 'admin' || r === 'admin_global';
}

/** Admin de una sucursal: operación local limitada. */
export function isSalonSucursalAdmin(role) {
  return normalizeProfileRole(role) === 'admin_sucursal';
}

/** Cuentas que pueden entrar a App Salón. */
export function canAccessSalonApp(role) {
  return isSalonGlobalAdmin(role) || isSalonSucursalAdmin(role);
}

/** @deprecated usar isSalonGlobalAdmin — compat con código existente */
export function isSalonAdminRole(role) {
  return canAccessSalonApp(role);
}
