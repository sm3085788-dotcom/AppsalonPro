/** Club Tu Cumpleaños — web + staff. */

import { supabase } from './supabaseClient.js';

export async function enrollBirthdayClub() {
  const { data, error } = await supabase.rpc('enroll_birthday_club');
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function getBirthdayClubStatus() {
  const { data, error } = await supabase.rpc('get_birthday_club_status');
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function setBirthdayClubReaction(reaction, comment = null, rating = null) {
  const { data, error } = await supabase.rpc('set_birthday_club_reaction', {
    p_reaction: reaction,
    p_comment: comment,
    ...(rating != null ? { p_rating: rating } : {}),
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function verifyBirthdayClubId(clienteId) {
  const { data, error } = await supabase.rpc('verify_birthday_club_id', {
    p_cliente_id: clienteId,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}

export async function getBirthdayClubEnrollmentForCliente(clienteId) {
  const { data, error } = await supabase.rpc('get_birthday_club_enrollment_for_cliente', {
    p_cliente_id: clienteId,
  });
  if (error) return { ok: false, error: error.message };
  return data ?? { ok: false, error: 'Sin respuesta.' };
}
