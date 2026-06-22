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

/** Resumen único en catálogo (ficha sucursal): canje + regla promo en pocas líneas. */
export function buildTiendaCanjeCatalogSummary(avisos) {
  if (!Array.isArray(avisos) || !avisos.length) return '';
  const lineas = avisos.map((a) => {
    const pct = formatPctCanje(a.descuento_pct);
    const rid = String(a.ruleId || '').trim();
    if (rid === 'p_app_efectivo_retiro') return `${pct} · efectivo y retiro en salón`;
    if (rid === 'p_app_tarjeta_delivery') return `${pct} · tarjeta y envío a domicilio`;
    const copy = getTiendaCanjeReglaCopy(rid);
    return `${pct} · ${copy?.metodo || 'tienda app'}`;
  });
  const canjes =
    lineas.length === 1
      ? lineas[0]
      : lineas.length === 2
        ? lineas.join(' · ')
        : 'canje disponible en tienda';
  return `Premio ANDREAS: ${canjes}. Se aplica al confirmar el pedido con el mismo pago y envío. No aplica en productos en promoción.`;
}

/** @deprecated Usar buildTiendaCanjeCatalogSummary (sin modal duplicado). */
export function buildTiendaCanjeAlertMessage(avisos) {
  return buildTiendaCanjeCatalogSummary(avisos);
}

/** Banner corto en catálogo. */
export function buildTiendaCanjeBannerText(avisos) {
  return buildTiendaCanjeCatalogSummary(avisos);
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
