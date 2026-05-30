import { isPedidoAppEfectivoRetiroSalon, isPedidoAppTarjetaDelivery } from './andreasPremios.js';
import { getArticuloTipo } from './inventarioMeta.js';

/** Pedidos en curso: ya suman en la barra de Premios hasta entrega en salón. */
export const ANDREAS_ORDER_STATUSES_PENDIENTES = new Set([
  'pending',
  'confirmed',
  'prepared',
  'ready',
]);

export const CITA_ESTADOS_PENDIENTES_PREMIO = new Set(['confirmado', 'confirmada']);

export function parseReferidoInvitadoState(andreasPremios) {
  const ap =
    andreasPremios && typeof andreasPremios === 'object' && !Array.isArray(andreasPremios)
      ? andreasPremios
      : {};
  return {
    invitado: Boolean(ap.referido_invitado),
    invitadoEn: ap.referido_invitado_en || null,
  };
}

/**
 * Cuenta unidades de producto por regla ANDREAS según estado del pedido.
 */
export function tallyAndreasProductoPuntos(orders, lines, orderById) {
  const out = {
    efectivoRetiro: 0,
    tarjetaDelivery: 0,
    efectivoRetiroPendiente: 0,
    tarjetaDeliveryPendiente: 0,
  };
  if (!Array.isArray(lines)) return out;

  for (const line of lines) {
    if (getArticuloTipo(line.product) !== 'producto') continue;
    const qty = Math.max(0, Math.floor(Number(line.qty) || 0));
    if (qty < 1) continue;
    const ord = orderById.get(String(line.order_id));
    if (!ord) continue;
    const st = String(ord.status || '').toLowerCase();
    if (st === 'delivered') {
      if (isPedidoAppEfectivoRetiroSalon(ord)) out.efectivoRetiro += qty;
      if (isPedidoAppTarjetaDelivery(ord)) out.tarjetaDelivery += qty;
    } else if (ANDREAS_ORDER_STATUSES_PENDIENTES.has(st)) {
      if (isPedidoAppEfectivoRetiroSalon(ord)) out.efectivoRetiroPendiente += qty;
      if (isPedidoAppTarjetaDelivery(ord)) out.tarjetaDeliveryPendiente += qty;
    }
  }
  return out;
}

/**
 * Citas ANDREAS: verificada = completada o visita escaneada en salón.
 * En camino = confirmada por el salón, aún sin validar visita (QR en Historial).
 */
export function countCitasPremios(citas) {
  let verificadas = 0;
  let pendientes = 0;
  if (!Array.isArray(citas)) return { verificadas, pendientes };
  for (const c of citas) {
    const st = String(c.estado || '').toLowerCase();
    const visitaOk = Boolean(c.visita_validada_en);
    if (st === 'completada' || st === 'completado' || visitaOk) {
      verificadas += 1;
    } else if (CITA_ESTADOS_PENDIENTES_PREMIO.has(st) && !visitaOk) {
      pendientes += 1;
    }
  }
  return { verificadas, pendientes };
}

export const REFERIDO_PREMIOS_COPY = {
  bienvenida:
    'Entraste con invitación ANDREAS: cada compra y cita suman puntos en tu cuenta Estándar.',
  compraPendiente:
    'Tu pedido suma puntos en Premios. Se confirman al retirar o recibir en el salón.',
  compraVerificada: 'Tu compra verificada en salón sumó puntos en Premios ANDREAS.',
  citaSolicitada:
    'Tu cita quedó registrada. Cuando el salón la confirme y valides la visita, sumará en Premios.',
  citaConfirmada:
    'Cita confirmada: mostrá tu QR de visita en Historial. Al validar en salón sumás el punto en Premios.',
};
