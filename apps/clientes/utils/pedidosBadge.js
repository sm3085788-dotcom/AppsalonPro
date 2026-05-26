const ACTIVE_PEDIDO_STATUSES = new Set(['pending', 'confirmed', 'prepared']);

/** Pedidos en curso (no entregados ni cancelados) para el badge verde en Inicio. */
export function countActivePedidos(orders) {
  if (!Array.isArray(orders)) return 0;
  return orders.filter((o) => ACTIVE_PEDIDO_STATUSES.has(String(o?.status || ''))).length;
}
