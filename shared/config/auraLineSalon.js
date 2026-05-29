import { db, supabase } from './supabaseClient.js';

const STAFF_CHAT_TYPES = new Set(['chat', 'broadcast_promo', 'incident_report', 'cita_confirmacion']);

/**
 * Envío desde App Salón (RPC security definer; evita fallos .single() tras INSERT).
 */
export async function sendSalonAuraMessage(payload) {
  const clientId = payload?.client_id;
  if (!clientId) return { data: null, error: { message: 'Cliente no válido.' } };

  const contentType = String(payload?.content_type || 'chat');
  if (!STAFF_CHAT_TYPES.has(contentType)) {
    return { data: null, error: { message: 'Tipo de mensaje no soportado.' } };
  }

  const { data: rpcRow, error: rpcError } = await supabase.rpc('salon_send_aura_message', {
    p_client_id: clientId,
    p_content: String(payload?.content || '').trim() || (payload?.media_url ? 'Imagen' : ''),
    p_client_name: payload?.client_name || null,
    p_client_phone: payload?.client_phone || null,
    p_content_type: contentType,
    p_media_url: payload?.media_url || null,
    p_media_kind: payload?.media_kind || null,
    p_status: payload?.status || 'pending_sync',
    p_created_by_name: payload?.created_by_name || null,
  });

  if (!rpcError && rpcRow?.id) {
    return { data: rpcRow, error: null };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData?.session?.user?.id;
  const { data, error } = await db.marketingDirectMessages.create({
    client_id: clientId,
    client_name: payload?.client_name || 'Cliente',
    client_phone: payload?.client_phone || null,
    content: String(payload?.content || '').trim() || (payload?.media_url ? 'Imagen' : ''),
    content_type: contentType,
    media_url: payload?.media_url || null,
    media_kind: payload?.media_kind || null,
    status: payload?.status || 'pending_sync',
    created_by: uid,
    created_by_name: payload?.created_by_name || 'Equipo salón',
  });

  if (data?.id) return { data, error: null };
  return { data: null, error: error || rpcError || { message: 'No se pudo enviar el mensaje.' } };
}
