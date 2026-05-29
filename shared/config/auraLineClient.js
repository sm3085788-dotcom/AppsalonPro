import { db, supabase } from './supabaseClient.js';

const SALON_OUTBOUND_TYPES = new Set([
  'chat',
  'broadcast_promo',
  'incident_report',
  'cita_confirmacion',
]);

export function isSalonOutboundMessage(row) {
  const ct = String(row?.content_type || '');
  return SALON_OUTBOUND_TYPES.has(ct);
}

export function sortAuraMessages(rows) {
  return [...(rows || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

/** Inserta o actualiza un mensaje en la lista ordenada por fecha. */
export function mergeAuraMessage(prev, row) {
  if (!row?.id) return prev || [];
  const list = [...(prev || [])];
  const id = String(row.id);
  const idx = list.findIndex((m) => String(m.id) === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...row };
  } else {
    list.push(row);
  }
  return sortAuraMessages(list);
}

const SALON_UNREAD_CONTENT_TYPES = [
  'chat',
  'broadcast_promo',
  'incident_report',
  'cita_confirmacion',
];

/** Mensajes Andreas Pro del cliente autenticado (RPC con fallback). */
export async function fetchClientAuraMessages(limit = 200) {
  const { data: rpcData, error: rpcError } = await supabase.rpc('client_aura_messages', {
    p_limit: limit,
  });
  if (!rpcError && Array.isArray(rpcData)) {
    return { data: sortAuraMessages(rpcData), error: null };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData?.session?.user?.id;
  if (!uid) return { data: [], error: rpcError || { message: 'Sin sesión' } };
  const { data: cliente } = await db.clientes.getByUserId(uid);
  if (!cliente?.id) return { data: [], error: { message: 'Sin ficha de cliente' } };
  const { data, error } = await db.marketingDirectMessages.getByClient(cliente.id);
  return { data: sortAuraMessages(data), error: rpcError || error };
}

export async function fetchClientAuraUnreadCount() {
  const { data, error } = await supabase.rpc('client_aura_unread_count');
  if (!error && Number.isFinite(Number(data))) {
    return { count: Number(data), error: null };
  }
  const { data: rows, error: listErr } = await fetchClientAuraMessages(300);
  if (listErr) return { count: 0, error: listErr };
  const n = (rows || []).filter((m) => {
    if (m.status !== 'pending_sync') return false;
    const ct = String(m.content_type || '');
    return SALON_UNREAD_CONTENT_TYPES.includes(ct) || isSalonOutboundMessage(m);
  }).length;
  return { count: n, error: null };
}

export async function markClientAuraDelivered(messageIds = []) {
  const ids = (messageIds || []).filter((id) => id != null);
  if (!ids.length) return { data: 0, error: null };
  const { data, error } = await supabase.rpc('client_mark_aura_delivered', {
    p_ids: ids,
  });
  if (!error) return { data, error: null };
  for (const id of ids) {
    await db.marketingDirectMessages.markAsDelivered(id);
  }
  return { data: ids.length, error: null };
}

export async function sendClientAuraChat(content, clientMeta = {}, media = {}) {
  const text = String(content || '').trim();
  const mediaUrl = media?.mediaUrl || null;
  const mediaKind = media?.mediaKind || null;
  if (!text && !mediaUrl) return { data: null, error: { message: 'Escribí un mensaje.' } };

  const { data: rpcRow, error: rpcError } = await supabase.rpc('client_send_aura_chat', {
    p_content: text || (mediaUrl ? 'Imagen' : ''),
    p_client_name: clientMeta.clientName || null,
    p_client_phone: clientMeta.clientPhone || null,
    p_media_url: mediaUrl,
    p_media_kind: mediaKind,
  });
  if (!rpcError && rpcRow) return { data: rpcRow, error: null };

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData?.session?.user?.id;
  if (!uid) return { data: null, error: { message: 'Iniciá sesión para chatear.' } };
  const { data: cliente } = await db.clientes.getByUserId(uid);
  if (!cliente?.id) return { data: null, error: { message: 'Sin ficha de cliente' } };
  const { data, error } = await db.marketingDirectMessages.create({
    client_id: cliente.id,
    client_name: clientMeta.clientName || cliente.nombre || 'Cliente',
    client_phone: clientMeta.clientPhone || cliente.telefono || null,
    content: text || (mediaUrl ? 'Imagen' : ''),
    content_type: 'chat',
    media_url: mediaUrl,
    media_kind: mediaKind,
    status: 'delivered',
    created_by: uid,
    created_by_name: clientMeta.clientName || cliente.nombre || 'Cliente',
  });
  if (error?.message?.includes('row-level security')) {
    return {
      data: null,
      error: {
        message:
          'Permiso denegado. Ejecutá supabase-aura-line-client-chat-media.sql en Supabase.',
      },
    };
  }
  return { data, error };
}
