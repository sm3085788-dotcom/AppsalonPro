/** RPCs de tarjetas de regalo VIP — App Salón + web. */

import { supabase } from './supabaseClient.js';

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

export async function registerGiftCardUse(codigo, monto, notas = null) {
  const { data, error } = await supabase.rpc('register_gift_card_use', {
    p_codigo: codigo,
    p_monto: monto,
    p_notas: notas,
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
