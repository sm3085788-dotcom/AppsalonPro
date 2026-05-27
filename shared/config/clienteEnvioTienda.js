/**
 * Bloque JSON al final de `clientes.notas` para dirección de envío a domicilio (App Clientes · tienda).
 * Las notas “de salón” quedan antes del marcador; el cliente solo actualiza el bloque JSON.
 */
export const CLIENTE_ENVIO_JSON_MARK = '\n\n__APP_CLIENTES_ENVIO_DOMICILIO__\n';

/**
 * @param {string | null | undefined} raw
 * @returns {{ staffNotas: string, envio: object | null }}
 */
export function splitClienteNotasEnvio(raw) {
  const s = String(raw ?? '');
  const i = s.indexOf(CLIENTE_ENVIO_JSON_MARK);
  if (i === -1) return { staffNotas: s.trim(), envio: null };
  const staffNotas = s.slice(0, i).trim();
  let envio = null;
  try {
    const parsed = JSON.parse(s.slice(i + CLIENTE_ENVIO_JSON_MARK.length).trim() || 'null');
    if (parsed && typeof parsed === 'object') envio = parsed;
  } catch {
    /* ignore */
  }
  return { staffNotas, envio };
}

/**
 * @param {string | null | undefined} staffNotas
 * @param {object | null} envio
 * @returns {string | null}
 */
export function mergeClienteNotasEnvio(staffNotas, envio) {
  const staff = String(staffNotas ?? '').trim();
  if (!envio || typeof envio !== 'object') return staff || null;
  const tail = JSON.stringify(envio);
  return `${staff}${CLIENTE_ENVIO_JSON_MARK}${tail}`;
}

/**
 * @param {object | null | undefined} raw
 * @returns {{ tipo: 'casa'|'trabajo', contacto: string, telefono: string, direccion: string } | null}
 */
export function normalizeEnvioGuardado(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const contacto = String(raw.contacto ?? '').trim();
  const telefono = String(raw.telefono ?? '').trim();
  const direccion = String(raw.direccion ?? '').trim();
  const tipo = raw.tipo === 'trabajo' ? 'trabajo' : 'casa';
  if (!contacto && !telefono && !direccion) return null;
  return { tipo, contacto, telefono, direccion };
}
