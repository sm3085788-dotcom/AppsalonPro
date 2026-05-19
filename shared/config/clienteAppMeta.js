/** Ficha creada en panel salón (sin cuenta App Clientes). */
export function isClienteManual(row) {
  const t = String(row?.tipo_registro || '').toLowerCase();
  if (t.includes('manual')) return true;
  return !row?.user_id;
}

/** Cliente con cuenta App Clientes vinculada (auth.users → clientes.user_id). */
export function isClienteAppVerificado(row) {
  return Boolean(row?.user_id) && !isClienteManual(row);
}

export const CLIENTE_MANUAL_AURA = {
  border: '#A5D6A7',
  bg: '#E8F5E9',
  chip: '#C8E6C9',
  chipText: '#1B5E20',
  avatarRing: ['#81C784', '#A5D6A7'],
};
