/**
 * Mensajes que cuentan como actividad del cliente (no envíos del staff).
 * Usado en alertas del home y badges de la bandeja Andreas Pro.
 */
export function isSalonInboundClientMessage(row, staffUserId) {
  if (!row?.client_id || !staffUserId) return false;
  const by = row.created_by ? String(row.created_by) : '';
  if (!by || by === String(staffUserId)) return false;
  const ct = String(row.content_type || 'chat');
  if (ct === 'broadcast_promo' || ct === 'cita_confirmacion') return false;
  return true;
}
