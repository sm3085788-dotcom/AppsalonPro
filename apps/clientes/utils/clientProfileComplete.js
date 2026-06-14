/**
 * Perfil completo = datos mínimos para citas, pedidos y contacto del salón.
 */
export function isClienteProfileComplete(clienteRow) {
  if (!clienteRow?.id) return false;
  const nombre = String(clienteRow.nombre || '').trim();
  const tel = String(clienteRow.telefono || '').replace(/\D/g, '');
  const direccion = String(clienteRow.direccion || '').trim();
  const cumple = clienteRow.cumpleanos;
  const nombreOk = nombre.length >= 4 && /\s/.test(nombre);
  const telOk = tel.length >= 8;
  const dirOk = direccion.length >= 5;
  const birthOk = Boolean(cumple && String(cumple).trim());
  return nombreOk && telOk && dirOk && birthOk;
}

export function getClienteProfileMissing(clienteRow) {
  const missing = [];
  const nombre = String(clienteRow?.nombre || '').trim();
  const tel = String(clienteRow?.telefono || '').replace(/\D/g, '');
  const direccion = String(clienteRow?.direccion || '').trim();
  if (nombre.length < 4 || !/\s/.test(nombre)) {
    missing.push('nombre y apellido');
  }
  if (tel.length < 8) missing.push('teléfono');
  if (direccion.length < 5) missing.push('dirección');
  if (!clienteRow?.cumpleanos) missing.push('fecha de nacimiento');
  return missing;
}
