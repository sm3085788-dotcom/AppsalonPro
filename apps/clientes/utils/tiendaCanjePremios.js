/** Textos de canje ANDREAS para la tienda (productos en app). */

const REGLAS_TIENDA = {
  p_app_efectivo_retiro: {
    titulo: 'Canje en producto · efectivo y retiro',
    metodo: 'pago en efectivo y retiro en Salon Andreas',
    envio: 'retiro en salón',
  },
  p_app_tarjeta_delivery: {
    titulo: 'Canje en producto · tarjeta y envío',
    metodo: 'pago con tarjeta y envío a domicilio',
    envio: 'envío a domicilio',
  },
};

export function getTiendaCanjeReglaCopy(ruleId) {
  return REGLAS_TIENDA[String(ruleId || '').trim()] || null;
}

export function formatPctCanje(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${n}%`;
}

/** Aviso al abrir la tienda (una o dos reglas de producto). */
export function buildTiendaCanjeAlertMessage(avisos) {
  if (!Array.isArray(avisos) || !avisos.length) return '';
  const lines = avisos.map((a) => {
    const copy = getTiendaCanjeReglaCopy(a.ruleId);
    const pct = formatPctCanje(a.descuento_pct);
    const modo = copy?.metodo || 'tienda app';
    return `· ${pct} de descuento en un producto (${modo})`;
  });
  return [
    'Tenés un premio ANDREAS listo para canjear en la tienda:',
    '',
    ...lines,
    '',
    'El descuento se aplica automáticamente al confirmar el pedido si elegís el mismo método de pago y tipo de envío.',
    'Los puntos del programa se actualizan cuando el salón entrega o confirma tu compra.',
  ].join('\n');
}

/** Banner corto en catálogo. */
export function buildTiendaCanjeBannerText(avisos) {
  if (!avisos?.length) return '';
  if (avisos.length === 1) {
    const a = avisos[0];
    const copy = getTiendaCanjeReglaCopy(a.ruleId);
    return `Premio ANDREAS: ${formatPctCanje(a.descuento_pct)} en producto (${copy?.metodo || 'tienda'}). Se aplica al confirmar el pedido.`;
  }
  return 'Premio ANDREAS: tenés canje para producto en tienda (efectivo+retiro o tarjeta+envío). Revisá el total al pagar.';
}

/** Texto en pantalla «Pedido enviado» tras aplicar canje. */
export function buildTiendaCanjeSuccessNote(andreasCanje) {
  if (!andreasCanje) return null;
  const copy = getTiendaCanjeReglaCopy(andreasCanje.ruleId);
  const pct = formatPctCanje(andreasCanje.descuento_pct);
  const ahorro = Number(andreasCanje.descuento_monto);
  const antes = Number(andreasCanje.subtotal_antes);
  const ahorroStr = Number.isFinite(ahorro) ? `Q ${ahorro.toFixed(2)}` : '—';
  const antesStr = Number.isFinite(antes) ? `Q ${antes.toFixed(2)}` : '—';
  return [
    `Canje ANDREAS aplicado en este pedido (${copy?.titulo || 'producto en tienda'}).`,
    `Subtotal productos ${antesStr} · descuento ${pct} (−${ahorroStr}) · total cobrado según tu método de pago.`,
    `Al entregar o confirmar en salón (${copy?.envio || 'según envío elegido'}) se reinicia tu ciclo de puntos en Premios.`,
  ].join('\n');
}

export async function fetchTiendaProductoCanjesPendientes(clienteId, db) {
  if (!clienteId) return [];
  const { data: row, error } = await db.clientes.getById(clienteId);
  if (error || !row) return [];
  const [efectivo, tarjeta] = await Promise.all([
    db.premiosAndreas.getCanjeCheckout({
      clienteRow: row,
      shipId: 'ship-salon',
      payment_method: 'efectivo',
    }),
    db.premiosAndreas.getCanjeCheckout({
      clienteRow: row,
      shipId: 'ship-home',
      payment_method: 'tarjeta',
    }),
  ]);
  const avisos = [];
  if (efectivo?.data?.ruleId) avisos.push(efectivo.data);
  if (tarjeta?.data?.ruleId) avisos.push(tarjeta.data);
  return avisos;
}
