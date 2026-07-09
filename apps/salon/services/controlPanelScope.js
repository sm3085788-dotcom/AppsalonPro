import { filterRowsBySucursal } from '@appsalon/shared-config';

/** Módulos del panel cuyos listados/borrados masivos respetan sucursal seleccionada. */
export const PANEL_BRANCH_SCOPED_ACTIONS = new Set([
  'papeleria',
  'ventas_chain',
  'caja_chain',
  'pedidos',
  'citas',
  'tarjetas_regalo',
]);

export function panelScopeFrom(opts = {}) {
  return {
    sucursalId: opts.sucursalId || null,
    matrizId: opts.matrizId || null,
  };
}

export function scopePanelRows(rows, actionId, scope) {
  if (!scope?.sucursalId) return rows || [];
  if (!PANEL_BRANCH_SCOPED_ACTIONS.has(actionId)) return rows || [];
  return filterRowsBySucursal(rows || [], scope.sucursalId, { matrizId: scope.matrizId });
}

export function scopePanelRawRows(rows, scope) {
  if (!scope?.sucursalId) return rows || [];
  return filterRowsBySucursal(rows || [], scope.sucursalId, { matrizId: scope.matrizId });
}

export function basureroEntryMatchesScope(entry, scope) {
  if (!scope?.sucursalId) return true;
  const snap = entry?.snapshot;
  if (!snap || typeof snap !== 'object') return false;
  return filterRowsBySucursal([snap], scope.sucursalId, { matrizId: scope.matrizId }).length > 0;
}
