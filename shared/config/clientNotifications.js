import { supabase } from './supabaseClient.js';
import { upsertPushDeviceToken } from './pushTokens.js';
import { isClienteAppVerificado } from './clienteAppMeta.js';
import { REFERIDO_PREMIOS_COPY } from './referidoPremios.js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const APP_SLUG = 'clientes';

export const CLIENT_NOTIF_PREF_KEYS = {
  recordatorios: 'recordatorios',
  promociones: 'promociones',
  cambiosAgenda: 'cambiosAgenda',
  mensajes: 'mensajes',
  pedidos: 'pedidos',
};

export const DEFAULT_CLIENT_NOTIF_PREFS_REMOTE = {
  recordatorios: true,
  promociones: false,
  cambiosAgenda: true,
  mensajes: true,
  pedidos: true,
};

/** Sincroniza preferencias locales a Supabase (para triggers y push). */
export async function syncClientNotifPrefsToServer(userId, prefs) {
  if (!userId) return { error: null };
  const merged = { ...DEFAULT_CLIENT_NOTIF_PREFS_REMOTE, ...prefs };
  const { error } = await supabase.from('client_notif_prefs').upsert(
    {
      user_id: userId,
      prefs: merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return { error };
}

export async function upsertClientPushToken(userId, expoPushToken) {
  return upsertPushDeviceToken(userId, expoPushToken, APP_SLUG);
}

export async function enqueueClientNotification({
  clientUserId,
  clienteId = null,
  tipo,
  titulo,
  mensaje,
  targetScreen = null,
  targetId = null,
}) {
  if (!clientUserId) return { data: null, error: { message: 'Sin usuario' } };
  const { data, error } = await supabase.rpc('enqueue_client_notification', {
    p_client_user_id: clientUserId,
    p_cliente_id: clienteId,
    p_tipo: tipo,
    p_titulo: titulo,
    p_mensaje: mensaje,
    p_target_screen: targetScreen,
    p_target_id: targetId != null ? String(targetId) : null,
  });
  if (error) return { data: null, error };

  const notificationId = typeof data === 'number' ? data : Number(data);
  if (Number.isFinite(notificationId) && notificationId > 0) {
    void invokeClientPushSend(notificationId);
  }
  return { data: notificationId, error: null };
}

async function invokeClientPushSend(notificationId) {
  const body = { notification_id: notificationId };
  try {
    const { error } = await supabase.functions.invoke('send-client-push', { body });
    if (!error) return;
    if (__DEV__) console.warn('[push dispatch] invoke', error.message || error);
  } catch (err) {
    if (__DEV__) console.warn('[push dispatch] invoke', err);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/send-client-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok && __DEV__) {
      const text = await res.text().catch(() => '');
      console.warn('[push dispatch] fetch', res.status, text);
    }
  } catch (err) {
    if (__DEV__) console.warn('[push dispatch] fetch', err);
  }
}

/**
 * Push al confirmar cita: app → Premios/QR; web/PWA → aviso simple en Mis citas.
 */
export async function notifyClientCitaConfirmadaPush({ clienteId, clienteUserId, cliente, citaId }) {
  if (!clienteId) return { data: null, error: { message: 'Sin cliente' } };

  let uid = clienteUserId || null;
  let row = cliente && typeof cliente === 'object' ? { ...cliente } : {};

  if (!uid || row.tipo_registro == null) {
    const { data } = await supabase
      .from('clientes')
      .select('id, user_id, tipo_registro')
      .eq('id', clienteId)
      .maybeSingle();
    if (data) {
      row = { ...row, ...data };
      uid = uid || data.user_id;
    }
  }

  if (!uid) return { data: null, error: { message: 'Cliente sin cuenta vinculada' } };

  const targetId = citaId != null ? String(citaId) : null;

  if (isClienteAppVerificado(row)) {
    const { db } = await import('./supabaseClient.js');
    return db.premiosAndreas.notifyReferidoAccion({
      clientUserId: uid,
      clienteId,
      titulo: 'Cita confirmada',
      mensaje: REFERIDO_PREMIOS_COPY.citaConfirmada,
      targetScreen: 'premios',
    });
  }

  return enqueueClientNotification({
    clientUserId: uid,
    clienteId,
    tipo: 'cita',
    titulo: 'Tu cita está confirmada',
    mensaje: 'El salón confirmó tu cita. Revisá fecha y detalles en Mi cuenta → Mis citas.',
    targetScreen: 'citas',
    targetId,
  });
}

export async function fetchClientNotifications(limit = 40) {
  const { data, error } = await supabase
    .from('client_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));
  return { data: data || [], error };
}

export async function fetchClientNotificationsUnreadCount() {
  const { data, error } = await supabase.rpc('client_notifications_unread_count');
  if (error) return { count: 0, error };
  return { count: Number(data) || 0, error: null };
}

/** No leídas que alimentan campana de Mensajes (no incluye pedidos). */
export async function fetchClientInboxUnreadCount() {
  const { count, error } = await supabase
    .from('client_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('leida', false)
    .in('tipo', ['mensaje', 'cita', 'promo']);
  if (error) return { count: 0, error };
  return { count: Number(count) || 0, error: null };
}

export async function markClientNotificationsRead(ids = []) {
  const { data, error } = await supabase.rpc('client_notifications_mark_read', {
    p_ids: ids.map((id) => Number(id)).filter(Number.isFinite),
  });
  return { data, error };
}

export async function markAllClientNotificationsRead() {
  const { data, error } = await supabase.rpc('client_notifications_mark_all_read');
  return { data, error };
}

/** Resuelve user_id desde ficha cliente. */
export async function resolveClientUserIdFromClienteId(clienteId) {
  if (!clienteId) return null;
  const { data } = await supabase.from('clientes').select('user_id').eq('id', clienteId).maybeSingle();
  return data?.user_id || null;
}

/**
 * Encola notificación desde el id del mensaje (RPC en servidor; evita fallos de RLS en app).
 */
export async function notifyClientFromMdmId(mdmId) {
  const id = Number(mdmId);
  if (!Number.isFinite(id) || id <= 0) {
    return { data: null, error: { message: 'Mensaje inválido' } };
  }
  const { data, error } = await supabase.rpc('notify_client_from_mdm_message', {
    p_mdm_id: id,
  });
  if (error) return { data: null, error };

  const notificationId = typeof data === 'number' ? data : Number(data);
  if (Number.isFinite(notificationId) && notificationId > 0) {
    void invokeClientPushSend(notificationId);
  }
  return { data: notificationId || null, error: null };
}

export async function notifyClientSalonMessage({
  clienteId,
  contentType,
  previewText,
  targetId = null,
}) {
  if (targetId != null) {
    const fromMdm = await notifyClientFromMdmId(targetId);
    if (!fromMdm.error) return fromMdm;
  }

  const userId = await resolveClientUserIdFromClienteId(clienteId);
  if (!userId) return { data: null, error: { message: 'Cliente sin cuenta en App Clientes' } };

  let tipo = 'mensaje';
  let titulo = 'Andreas Pro';
  let mensaje = previewText || 'Tenés un mensaje nuevo del salón.';
  const screen = 'mensajes';

  const ct = String(contentType || '');
  if (ct === 'cita_confirmacion') {
    tipo = 'cita';
    titulo = 'Tu cita está confirmada';
    mensaje = previewText || 'El salón confirmó tu cita. Revisá los detalles en Mensajes.';
  } else if (ct === 'broadcast_promo' || ct === 'promo_inventario') {
    tipo = 'promo';
    titulo = 'Novedad del salón';
    mensaje = previewText || 'Tenés una promoción en Mensajes.';
  }

  return enqueueClientNotification({
    clientUserId: userId,
    clienteId,
    tipo,
    titulo,
    mensaje,
    targetScreen: screen,
    targetId: targetId != null ? String(targetId) : null,
  });
}

export async function notifyClientPedidoStatus({ clientUserId, order, titulo, mensaje }) {
  if (!clientUserId || !order?.id) return { data: null, error: null };
  return enqueueClientNotification({
    clientUserId,
    tipo: 'pedido',
    titulo: titulo || 'Tu pedido',
    mensaje: mensaje || `Pedido ${order.tracking_code || order.id}`,
    targetScreen: 'mis_pedidos',
    targetId: order.id,
  });
}
