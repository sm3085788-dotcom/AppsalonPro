import { isSalonGlobalAdmin } from '@appsalon/shared-config';

/** Módulos permitidos para admin_sucursal (1 por local). */
export const SUCURSAL_ADMIN_MODULE_IDS = new Set([
  'agenda',
  'cajas',
  'clients',
  'empleados',
  'goals',
  'inventory',
  'papeleria',
  'pedidos',
  'vender',
]);

/** Solo admin global. */
export const GLOBAL_ONLY_MODULE_IDS = new Set([
  'reportes',
  'marketing',
  'mensajes',
  'panel',
  'incidentes',
  'sucursales',
]);

export function filterSalonModulesForProfile(modules, profile) {
  if (!profile) return [];
  if (isSalonGlobalAdmin(profile.role)) return modules;
  return modules.filter((m) => SUCURSAL_ADMIN_MODULE_IDS.has(m.id));
}

export function canOpenSalonModule(moduleId, profile) {
  if (!profile) return false;
  if (isSalonGlobalAdmin(profile.role)) return true;
  return SUCURSAL_ADMIN_MODULE_IDS.has(moduleId);
}
