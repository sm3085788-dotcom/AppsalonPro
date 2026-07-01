'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  ensureClienteFromAuth,
  getClienteByUserId,
  isProfileComplete,
  updateClienteProfile,
  type ClienteProfileInput,
  type ClienteRow,
} from '@/lib/data/cliente';

export async function syncClienteFichaAction(): Promise<{
  row: ClienteRow | null;
  error: string | null;
  complete: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null, error: 'No autenticado.', complete: false };

  const { row, error } = await ensureClienteFromAuth(supabase, user);
  revalidatePath('/cuenta');
  revalidatePath('/cuenta/perfil');
  return { row, error, complete: isProfileComplete(row) };
}

export async function saveClienteProfileAction(
  input: ClienteProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  await ensureClienteFromAuth(supabase, user);

  const { row, error } = await updateClienteProfile(supabase, user.id, input);
  if (error || !row) return { ok: false, error: error ?? 'No se pudo guardar.' };

  await supabase.auth.updateUser({
    data: {
      full_name: row.nombre,
      first_name: input.nombre.trim(),
      last_name: input.apellido.trim(),
    },
  });

  revalidatePath('/cuenta');
  revalidatePath('/cuenta/perfil');
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function getClienteSessionAction(): Promise<{
  row: ClienteRow | null;
  complete: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { row: null, complete: false };

  let row = await getClienteByUserId(supabase, user.id);
  if (!row) {
    const ensured = await ensureClienteFromAuth(supabase, user);
    row = ensured.row;
  }
  return { row, complete: isProfileComplete(row) };
}

export async function redirectIfProfileIncomplete(from: string) {
  const { complete } = await getClienteSessionAction();
  if (!complete) redirect(`/cuenta/perfil?from=${encodeURIComponent(from)}`);
}
