import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  displayNameFromUser,
  isFullerName,
  joinFullName,
} from '@/lib/clientDisplayName';
import {
  isValidClientPhone,
  normalizeClientAuthPhone,
  toClientPhoneE164,
  type ClientAuthCountry,
} from '@/lib/phone/clientAuthPhone';

export interface ClienteRow {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  cumpleanos: string | null;
  user_id: string | null;
  categoria: string | null;
  tipo_registro: string | null;
}

export interface ClienteProfileInput {
  nombre: string;
  apellido: string;
  /** E.164 (+502… / +1…). Prefer over country+local when set. */
  telefono?: string | null;
  telefonoCountry?: ClientAuthCountry;
  telefonoLocal?: string | null;
  email: string | null;
  direccion: string | null;
  cumpleanos: string | null;
}

const CLIENTE_COLUMNS =
  'id,nombre,telefono,email,direccion,cumpleanos,user_id,categoria,tipo_registro';

export function isProfileComplete(row: ClienteRow | null): boolean {
  if (!row) return false;
  const full = String(row.nombre || '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || full.length < 4) return false;
  if (!isValidClientPhone(row.telefono)) return false;
  if (!String(row.cumpleanos || '').trim()) return false;
  return true;
}

export function profileMissingLabels(row: ClienteRow | null): string[] {
  const missing: string[] = [];
  if (!row) return ['nombre', 'teléfono', 'fecha de nacimiento'];
  const parts = String(row.nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) missing.push('apellido');
  if (!isValidClientPhone(row.telefono)) missing.push('teléfono');
  if (!String(row.cumpleanos || '').trim())
    missing.push('fecha de nacimiento');
  if (!String(row.direccion || '').trim()) missing.push('dirección');
  return missing;
}

async function patchNombreIfFuller(
  supabase: SupabaseClient,
  row: ClienteRow,
  incoming: string,
): Promise<ClienteRow> {
  const nom = String(incoming || '').trim();
  if (!nom || !isFullerName(nom, row.nombre)) return row;
  const { data, error } = await supabase
    .from('clientes')
    .update({ nombre: nom })
    .eq('id', row.id)
    .select(CLIENTE_COLUMNS)
    .single();
  if (error || !data) return row;
  return data as ClienteRow;
}

/** Crea o enlaza la ficha en public.clientes (misma lógica que App Clientes). */
export async function ensureClienteFromAuth(
  supabase: SupabaseClient,
  user: User,
): Promise<{ row: ClienteRow | null; error: string | null }> {
  const displayName = displayNameFromUser(user);
  const email = user.email?.trim() || null;
  const telefono = user.phone?.trim() || null;
  const telefonoE164 = toClientPhoneE164(telefono);

  const { data: existing, error: findErr } = await supabase
    .from('clientes')
    .select(CLIENTE_COLUMNS)
    .eq('user_id', user.id)
    .maybeSingle();

  if (findErr) {
    return { row: null, error: 'No se pudo leer tu ficha de cliente.' };
  }

  if (existing) {
    const patch: Record<string, string> = {};
    if (email && !String(existing.email || '').trim()) patch.email = email;
    if (telefonoE164 && !String(existing.telefono || '').trim())
      patch.telefono = telefonoE164;
    const md = (user.user_metadata ?? {}) as Record<string, unknown>;
    const signupSource = String(md.signup_source || '').toLowerCase();
    const tipo = String(existing.tipo_registro || '').toLowerCase();
    if (tipo === 'app_clientes' && signupSource !== 'app_clientes') {
      patch.tipo_registro = 'web_catalogo';
    }
    let row = existing as ClienteRow;
    if (Object.keys(patch).length) {
      const { data, error } = await supabase
        .from('clientes')
        .update(patch)
        .eq('id', existing.id)
        .select(CLIENTE_COLUMNS)
        .single();
      if (error) return { row: null, error: error.message };
      row = (data ?? existing) as ClienteRow;
    }
    row = await patchNombreIfFuller(supabase, row, displayName);
    return { row, error: null };
  }

  const nom =
    displayName.trim() || email?.split('@')[0] || 'Cliente';

  const { data: inserted, error: insErr } = await supabase
    .from('clientes')
    .insert({
      user_id: user.id,
      nombre: nom,
      email,
      telefono: telefonoE164,
      tipo_registro: 'web_catalogo',
      categoria: 'Nuevo',
    })
    .select(CLIENTE_COLUMNS)
    .single();

  if (inserted) {
    let row = inserted as ClienteRow;
    row = await patchNombreIfFuller(supabase, row, displayName);
    return { row, error: null };
  }

  if (insErr) {
    const { data: retry } = await supabase
      .from('clientes')
      .select(CLIENTE_COLUMNS)
      .eq('user_id', user.id)
      .maybeSingle();
    if (retry) {
      let row = retry as ClienteRow;
      row = await patchNombreIfFuller(supabase, row, displayName);
      return { row, error: null };
    }
    return { row: null, error: insErr.message };
  }

  return { row: null, error: 'No se pudo crear tu ficha de cliente.' };
}

export async function getClienteByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClienteRow | null> {
  const { data } = await supabase
    .from('clientes')
    .select(CLIENTE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();
  return (data as ClienteRow) ?? null;
}

export async function updateClienteProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ClienteProfileInput,
): Promise<{ row: ClienteRow | null; error: string | null }> {
  const nom = String(input.nombre || '').trim();
  const ape = String(input.apellido || '').trim();
  const fullName = joinFullName(nom, ape);

  if (nom.length < 2) {
    return { row: null, error: 'El nombre debe tener al menos 2 caracteres.' };
  }
  if (ape.length < 2) {
    return { row: null, error: 'El apellido debe tener al menos 2 caracteres.' };
  }

  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing?.id) {
    return {
      row: null,
      error: 'Tu cuenta aún no está enlazada. Cierra sesión e ingresa de nuevo.',
    };
  }

  const rawTelefono =
    input.telefono?.trim() ||
    (input.telefonoCountry && input.telefonoLocal != null
      ? normalizeClientAuthPhone(input.telefonoCountry, input.telefonoLocal)
      : null);

  const telefono = toClientPhoneE164(rawTelefono);

  if (!telefono) {
    return {
      row: null,
      error: 'Ingresa un teléfono válido (Guatemala 8 dígitos o EE.UU./Canadá 10).',
    };
  }

  const { data, error } = await supabase
    .from('clientes')
    .update({
      nombre: fullName,
      telefono,
      email: input.email?.trim() || null,
      direccion: input.direccion?.trim() || null,
      cumpleanos: input.cumpleanos || null,
    })
    .eq('id', existing.id)
    .select(CLIENTE_COLUMNS)
    .single();

  if (error) return { row: null, error: error.message };
  return { row: data as ClienteRow, error: null };
}
