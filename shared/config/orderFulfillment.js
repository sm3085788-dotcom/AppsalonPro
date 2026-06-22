function parseCheckoutSnapshot(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isHomeDeliveryOrder(order) {
  const ful = String(order?.fulfillment_type || '').trim().toLowerCase();
  if (ful === 'domicilio' || ful === 'delivery' || ful.includes('domicilio') || ful.includes('envio')) {
    return true;
  }
  return Boolean(String(order?.delivery_address || '').trim());
}

export function isRetiroSalonOrder(order) {
  if (isHomeDeliveryOrder(order)) return false;
  const ful = String(order?.fulfillment_type || '').trim().toLowerCase();
  return ful === 'retiro_salon' || ful.includes('retiro') || !ful;
}

export function isCashPayment(order) {
  const pay = String(order?.payment_method || '').toLowerCase();
  return ['efectivo', 'cash', 'efectivo_al_retirar'].includes(pay);
}

export function isCardPayment(order) {
  const pay = String(order?.payment_method || '').toLowerCase();
  return pay === 'tarjeta' || pay === 'card';
}

export function isPaymentCapturedInSnapshot(order) {
  const snap = parseCheckoutSnapshot(order?.checkout_snapshot);
  return snap?.payment_captured === true;
}

/** Domicilio pagado con tarjeta en la app (sin QR ni cobro pendiente en salón). */
export function isPedidoTarjetaDomicilioCapturado(order) {
  if (!isHomeDeliveryOrder(order) || !isCardPayment(order)) return false;
  if (isPaymentCapturedInSnapshot(order)) return true;
  const st = String(order?.status || '');
  return st === 'confirmed' || st === 'prepared';
}

export function isPendingCashOrder(order) {
  return String(order?.status || '') === 'pending' && isCashPayment(order);
}

/** QR solo para retiro en salón con efectivo pendiente. */
export function needsPickupQr(order) {
  return isRetiroSalonOrder(order) && isPendingCashOrder(order) && Boolean(order?.tracking_code);
}

export function canSalonConfirmarEntregaPedido(order) {
  const st = String(order?.status || '');
  if (st === 'pending' && isCashPayment(order)) return true;
  if (isPedidoTarjetaDomicilioCapturado(order) && (st === 'confirmed' || st === 'prepared')) return true;
  return false;
}
