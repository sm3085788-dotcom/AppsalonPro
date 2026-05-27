/** Metas del programa ANDREAS (Premios). */
export const ANDREAS_META = {
  /** App clientes · pago en efectivo · retiro en salón (pedido delivered). */
  appEfectivoRetiro: 8,
  /** App clientes · pago con tarjeta · envío a domicilio (pedido delivered). */
  appTarjetaDelivery: 8,
  citas: 8,
  salon: 8,
  referidos: 3,
};

/** Pedido de tienda app verificable para puntos efectivo + retiro en salón. */
export function isPedidoAppEfectivoRetiroSalon(order) {
  if (!order) return false;
  const pay = String(order.payment_method || '').trim().toLowerCase();
  const ful = String(order.fulfillment_type || '').trim().toLowerCase();
  const efectivo = pay === 'efectivo' || pay === 'cash';
  const retiro =
    ful === 'retiro_salon' ||
    ful === 'pickup' ||
    ful === 'retiro' ||
    ful.includes('retiro');
  return efectivo && retiro;
}

/** Pedido de tienda app verificable para puntos tarjeta + envío a domicilio. */
export function isPedidoAppTarjetaDelivery(order) {
  if (!order) return false;
  const pay = String(order.payment_method || '').trim().toLowerCase();
  const ful = String(order.fulfillment_type || '').trim().toLowerCase();
  const tarjeta =
    pay === 'tarjeta' ||
    pay === 'card' ||
    pay.includes('tarjeta') ||
    pay.includes('card');
  const domicilio =
    ful === 'domicilio' ||
    ful === 'delivery' ||
    ful.includes('domicilio') ||
    ful.includes('envio') ||
    ful.includes('envío');
  return tarjeta && domicilio;
}

export function parseSalonFisicoUnidades(andreasPremios) {
  if (!andreasPremios || typeof andreasPremios !== 'object' || Array.isArray(andreasPremios)) return 0;
  const n = Number(andreasPremios.salon_fisico_unidades);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function mergeAndreasPremiosSalonFisico(andreasPremios, unidades) {
  const base =
    andreasPremios && typeof andreasPremios === 'object' && !Array.isArray(andreasPremios)
      ? { ...andreasPremios }
      : {};
  base.salon_fisico_unidades = Math.max(0, Math.floor(Number(unidades) || 0));
  return base;
}
