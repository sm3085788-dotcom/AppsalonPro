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
