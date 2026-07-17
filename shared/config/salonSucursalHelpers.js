/** Id de sucursal en filas transaccionales (citas, ventas, etc.). */
import { splitBookingNotas, BOOKING_META_MARK } from './reservaCheckout.js';

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
const NOTAS_WEB_JSON_MARK = BOOKING_META_MARK.trim().toLowerCase();

/** Canal de origen de una cita: app clientes, web catálogo, o null (salón manual). */
export function resolveCitaCanal(cita) {
  const notas = String(cita?.notas_servicio || '').toLowerCase();
  const tipo = String(cita?.cliente?.tipo_registro || '').toLowerCase();

  if (
    NOTAS_WEB_MARKERS.some((m) => notas.includes(m)) ||
    notas.includes(NOTAS_WEB_JSON_MARK) ||
    tipo === 'web_catalogo'
  ) {
    return 'web';
  }
  if (notas.includes(NOTAS_APP_MARKER) || tipo === 'app_clientes') {
    return 'app';
  }
  return null;
}

function formatGtq(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `Q ${n.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Resumen legible de metadata web (sin JSON crudo). */
export function formatCitaWebReservaHint(notas) {
  const { meta } = splitBookingNotas(notas);
  const deposit = formatGtq(meta?.deposit_gtq);
  if (deposit) return `Reserva web · anticipo ${deposit}`;
  if (meta?.refunded) return 'Reserva web · anticipo reembolsado';
  return 'Reserva web · catálogo';
}

/** Oculta prefijos técnicos de origen en notas cuando ya hay badge de canal. */
export function formatCitaNotasDisplay(notas, canal) {
  const raw = String(notas || '');
  if (!raw.trim()) return null;

  const { staff, meta } = splitBookingNotas(raw);
  let cleaned = staff;

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

  cleaned = cleaned.replace(/__WEB_RESERVA_JSON__[\s\S]*$/i, '').trim();

  if (cleaned) return cleaned;

  if (
    canal === 'web' &&
    (meta?.deposit_gtq != null || meta?.payment_intent_id || meta?.refunded)
  ) {
    return formatCitaWebReservaHint(raw);
  }

  return null;
}
