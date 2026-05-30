/** Snapshot de progreso ANDREAS para alerta campanita en Inicio → Premios. */

export const PREMIOS_PROGRESS_STORAGE_KEY = '@appsalon/clientes/premios_progress_ack';

function n(v) {
  const x = Math.floor(Number(v) || 0);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

/** Totales visibles en Premios (verificados + en camino). */
export function buildPremiosProgressSnapshot(resumen) {
  if (!resumen || typeof resumen !== 'object') return null;
  return {
    efectivo:
      n(resumen.productosAppEfectivoRetiro) + n(resumen.productosAppEfectivoRetiroPendiente),
    tarjeta:
      n(resumen.productosAppTarjetaDelivery) + n(resumen.productosAppTarjetaDeliveryPendiente),
    citas: n(resumen.citasVerificadas) + n(resumen.citasPendientes),
    salon: n(resumen.productosSalonFisico),
    referidos: n(resumen.referidosPrimeraCompra),
  };
}

export function premiosProgressIncreased(prev, next) {
  if (!prev || !next) return false;
  return (
    next.efectivo > (prev.efectivo ?? 0) ||
    next.tarjeta > (prev.tarjeta ?? 0) ||
    next.citas > (prev.citas ?? 0) ||
    next.salon > (prev.salon ?? 0) ||
    next.referidos > (prev.referidos ?? 0)
  );
}
