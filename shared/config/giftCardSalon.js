/** RPCs de tarjetas de regalo VIP — App Salón + web. */

import { supabase } from './supabaseClient.js';

/** Consulta parece código de tarjeta (GC-/ACT-) para búsqueda staff. */
export function looksLikeGiftCardQuery(raw) {
  const t = String(raw || '').trim();
  if (t.length < 3) return false;
  const up = t.toUpperCase();
  if (up.startsWith('GC-') || up.startsWith('ACT-')) return true;
  if (t.includes('-') && /^[A-Za-z0-9-]+$/.test(t)) return true;
  return false;
}

export async function searchGiftCardsStaff(query, limit = 8) {
  const q = String(query || '').trim();
  if (q.length < 3) return { ok: true, results: [] };

  const { data, error } = await supabase.rpc('search_gift_cards_staff', {
    p_query: q,
    p_limit: limit,
  });
  if (error) return { ok: false, error: error.message, results: [] };

  const payload = data ?? {};
  const results = Array.isArray(payload.results) ? payload.results : [];
  return { ok: Boolean(payload.ok), results, error: payload.error };
}

export async function lookupGiftCardStaff(codigo) {
  const { data, error } = await supabase.rpc('lookup_gift_card_staff', {
    p_codigo: codigo,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function listGiftCardsStaff(limit = 30) {
  const { data, error } = await supabase.rpc('list_gift_cards_staff', {
    p_limit: limit,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function activateGiftCardAtSalon(codigo, sucursalId = null) {
  const { data, error } = await supabase.rpc('activate_gift_card_at_salon', {
    p_codigo: codigo,
    p_sucursal_id: sucursalId,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function verifyGiftCardBirthday(codigo) {
  const { data, error } = await supabase.rpc('verify_gift_card_birthday', {
    p_codigo: codigo,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function registerGiftCardUse(codigo, monto, notas = null, ventaId = null) {
  const { data, error } = await supabase.rpc('register_gift_card_use', {
    p_codigo: codigo,
    p_monto: monto,
    p_notas: notas,
    p_venta_id: ventaId,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function linkGiftCardToCliente(codigo, clienteId) {
  const { data, error } = await supabase.rpc('link_gift_card_to_cliente', {
    p_codigo: codigo,
    p_cliente_id: clienteId,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function unlinkGiftCardFromCliente(codigo) {
  const { data, error } = await supabase.rpc('unlink_gift_card_from_cliente', {
    p_codigo: codigo,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function lookupGiftCardForCliente(clienteId) {
  const { data, error } = await supabase.rpc('lookup_gift_card_for_cliente', {
    p_cliente_id: clienteId,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function lookupGiftCardPublic(codigo) {
  const { data, error } = await supabase.rpc('lookup_gift_card_public', {
    p_codigo: codigo,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export function normalizeGtWhatsappPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 8) return `502${digits}`;
  if (digits.startsWith('502') && digits.length === 11) return digits;
  return null;
}

export async function createGiftCardActivationCode({
  monto,
  paraNombre,
  deNombre,
  mensaje = '',
  compradorTelefono,
}) {
  const { data, error } = await supabase.rpc('create_gift_card_activation_code', {
    p_monto: monto,
    p_para_nombre: paraNombre,
    p_de_nombre: deNombre,
    p_mensaje: mensaje || null,
    p_comprador_telefono: compradorTelefono,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function listGiftCardActivationCodesStaff(limit = 20) {
  const { data, error } = await supabase.rpc('list_gift_card_activation_codes_staff', {
    p_limit: limit,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function deleteGiftCardStaff(id) {
  const { data, error } = await supabase.rpc('delete_gift_card_staff', { p_id: id });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function deleteGiftCardActivationCodeStaff(id) {
  const { data, error } = await supabase.rpc('delete_gift_card_activation_code_staff', { p_id: id });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function restoreGiftCardStaff(snapshot) {
  const { data, error } = await supabase.rpc('restore_gift_card_staff', { p_snapshot: snapshot });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function restoreGiftCardActivationCodeStaff(snapshot) {
  const { data, error } = await supabase.rpc('restore_gift_card_activation_code_staff', {
    p_snapshot: snapshot,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}
