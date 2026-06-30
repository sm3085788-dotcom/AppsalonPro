/**
 * Listener de citas por sucursal para el APK (App Salon).
 *
 * Req 2 — ahorro de datos moviles: la web emite por Broadcast un payload
 * minimo { booking_id, estado } en el canal `branch:<sucursal_id>`.
 * El APK escucha SOLO su sucursal asignada, recibe el id liviano y consulta
 * el detalle por su cuenta. Esto evita transmitir toda la cita en cada evento
 * (hasta ~80% menos consumo frente a difundir la fila completa).
 *
 * Incluye reconexion automatica con backoff exponencial.
 */
import { supabase } from '../config/supabaseClient.js';

export const BOOKING_EVENT = 'booking';

/** Mismo formato de canal que usa la web (useBranchBookingsRealtime). */
export function branchChannelName(branchId) {
  return `branch:${branchId}`;
}

/**
 * Trae el detalle completo de una cita por id (lo hace el propio APK).
 * Devuelve la fila o null.
 */
export async function fetchBookingDetail(bookingId) {
  if (!bookingId) return null;
  const { data, error } = await supabase
    .from('citas')
    .select('*')
    .eq('id', bookingId)
    .single();
  if (error) return null;
  return data;
}

/**
 * Inicia la escucha en tiempo real para una sucursal.
 *
 * @param {Object} params
 * @param {string} params.branchId            Sucursal asignada al APK.
 * @param {(detail: any, evt: {booking_id: string, estado: string}) => void} [params.onDetail]
 *        Se invoca con el detalle ya consultado por id.
 * @param {(evt: {booking_id: string, estado: string}) => void} [params.onEvent]
 *        Se invoca con el payload liviano crudo (antes del fetch de detalle).
 * @param {(state: 'connecting'|'connected'|'reconnecting'|'error') => void} [params.onStatus]
 * @returns {() => void} funcion para detener la escucha.
 */
export function startBranchBookingListener({
  branchId,
  onDetail,
  onEvent,
  onStatus,
}) {
  if (!branchId) {
    return () => {};
  }

  let cancelled = false;
  let channel = null;
  let retries = 0;
  let reconnectTimer = null;

  const setStatus = (s) => {
    if (!cancelled && typeof onStatus === 'function') onStatus(s);
  };

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    clearReconnect();
    retries = Math.min(retries + 1, 6);
    const delay = Math.min(1000 * 2 ** (retries - 1), 30000);
    reconnectTimer = setTimeout(() => {
      if (cancelled) return;
      if (channel) supabase.removeChannel(channel);
      connect();
    }, delay);
  };

  const connect = () => {
    if (cancelled) return;
    setStatus(retries === 0 ? 'connecting' : 'reconnecting');

    channel = supabase.channel(branchChannelName(branchId), {
      // El APK solo escucha; no necesita recibir su propio eco.
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: BOOKING_EVENT }, async ({ payload }) => {
      if (cancelled || !payload || !payload.booking_id) return;
      if (typeof onEvent === 'function') onEvent(payload);
      // El APK consulta el detalle por su cuenta (payload liviano -> fetch puntual).
      const detail = await fetchBookingDetail(payload.booking_id);
      if (!cancelled && typeof onDetail === 'function') onDetail(detail, payload);
    });

    channel.subscribe((status) => {
      if (cancelled) return;
      if (status === 'SUBSCRIBED') {
        retries = 0;
        setStatus('connected');
        return;
      }
      if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        setStatus('reconnecting');
        scheduleReconnect();
      }
    });
  };

  connect();

  return function stop() {
    cancelled = true;
    clearReconnect();
    if (channel) supabase.removeChannel(channel);
    channel = null;
  };
}
