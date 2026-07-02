/** Id de sucursal en filas transaccionales (citas, ventas, etc.). */
export function rowSucursalId(row) {
  return row?.sucursal_id ?? row?.creado_en_sucursal_id ?? null;
}

/** Filtra filas con sucursal_id (o creado_en_sucursal_id). Datos legacy sin sucursal cuentan como matriz. */
export function filterRowsBySucursal(rows, sucursalId, { matrizId = null } = {}) {
  if (!sucursalId) return rows || [];
  return (rows || []).filter((row) => {
    const sid = rowSucursalId(row);
    if (sid == null || sid === '') {
      return matrizId != null && String(sucursalId) === String(matrizId);
    }
    return String(sid) === String(sucursalId);
  });
}

const NOTAS_WEB_MARKERS = ['reserva web', 'anticipo con tarjeta'];
const NOTAS_APP_MARKER = 'solicitud desde app clientes';

/** Canal de origen de una cita: app clientes, web catálogo, o null (salón manual). */
export function resolveCitaCanal(cita) {
  const notas = String(cita?.notas_servicio || '').toLowerCase();
  const tipo = String(cita?.cliente?.tipo_registro || '').toLowerCase();

  if (NOTAS_WEB_MARKERS.some((m) => notas.includes(m)) || tipo === 'web_catalogo') {
    return 'web';
  }
  if (notas.includes(NOTAS_APP_MARKER) || tipo === 'app_clientes') {
    return 'app';
  }
  return null;
}

/** Oculta prefijos técnicos de origen en notas cuando ya hay badge de canal. */
export function formatCitaNotasDisplay(notas, canal) {
  const raw = String(notas || '').trim();
  if (!raw) return null;

  let cleaned = raw;
  if (canal === 'app') {
    cleaned = cleaned
      .replace(/^Solicitud desde app clientes(?:\s*·\s*inventario_id=[^\s·]+)?\s*·?\s*/i, '')
      .replace(/^Solicitud desde app clientes\s*·?\s*/i, '')
      .trim();
  } else if (canal === 'web') {
    cleaned = cleaned
      .replace(/^Reserva web(?:\s*·\s*anticipo con tarjeta \(Stripe\))?\s*·?\s*/i, '')
      .trim();
  }

  return cleaned || null;
}
