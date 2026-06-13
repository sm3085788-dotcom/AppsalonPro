import { isSalonGlobalAdmin, isSalonSucursalAdmin } from './salonRoles.js';

let _profile = null;

export function setSalonSessionProfile(profile) {
  _profile = profile || null;
}

export function getSalonSessionProfile() {
  return _profile;
}

export function clearSalonSessionProfile() {
  _profile = null;
}

/** Nombre visible de la sucursal (admin_sucursal). */
export function getSalonBranchDisplayName(profile = getSalonSessionProfile()) {
  if (!profile) return null;
  const nombre = String(profile.sucursal_nombre || '').trim();
  if (nombre) return nombre;
  const codigo = String(profile.sucursal_codigo || '').trim();
  return codigo || null;
}

export async function enrichSalonSessionProfile(profile, listSucursales) {
  if (!profile?.sucursal_id || !isSalonSucursalAdmin(profile.role)) return profile;
  const { data } = await listSucursales();
  const row = (data || []).find((s) => String(s.id) === String(profile.sucursal_id));
  if (!row) return profile;
  return {
    ...profile,
    sucursal_nombre: row.nombre || null,
    sucursal_codigo: row.codigo || null,
  };
}

/** @returns {{ isGlobal: boolean, sucursalId: string|null, role: string|null }} */
export function getSalonSucursalScope() {
  const p = _profile;
  if (!p) {
    return { isGlobal: false, sucursalId: null, role: null };
  }
  const role = p.role || null;
  if (isSalonGlobalAdmin(role)) {
    return { isGlobal: true, sucursalId: p.sucursal_id || null, role };
  }
  return {
    isGlobal: false,
    sucursalId: p.sucursal_id || null,
    role,
  };
}

export function requireSalonSucursalId() {
  const { isGlobal, sucursalId } = getSalonSucursalScope();
  if (isGlobal && !sucursalId) return null;
  return sucursalId;
}
