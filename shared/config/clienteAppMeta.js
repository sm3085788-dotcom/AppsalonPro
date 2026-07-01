/** Ficha creada en panel salón (sin cuenta App Clientes). */
export function isClienteManual(row) {
  const t = String(row?.tipo_registro || '').toLowerCase();
  if (t.includes('manual')) return true;
  return !row?.user_id;
}

/** Registro desde catálogo web (aún no ingresó en App Clientes). */
export function isClienteWeb(row) {
  const t = String(row?.tipo_registro || '').toLowerCase();
  return t.includes('web');
}

/** Cliente con cuenta App Clientes vinculada (auth.users → clientes.user_id). */
export function isClienteAppVerificado(row) {
  return Boolean(row?.user_id) && !isClienteManual(row) && !isClienteWeb(row);
}

/** Etiqueta corta en listado Clientes (Salón). */
export function clienteOrigenLabel(row) {
  if (isClienteManual(row)) return 'Manual';
  if (isClienteWeb(row)) return 'Web';
  if (isClienteAppVerificado(row)) return 'App';
  return row?.user_id ? 'App' : 'Manual';
}

export const CLIENTE_MANUAL_AURA = {
  border: '#A5D6A7',
  bg: '#E8F5E9',
  chip: '#C8E6C9',
  chipText: '#1B5E20',
  avatarRing: ['#81C784', '#A5D6A7'],
};

export const CLIENTE_WEB_AURA = {
  chip: '#BBDEFB',
  chipText: '#0D47A1',
};

export const CLIENTE_APP_AURA = {
  chip: null,
  chipText: null,
};
