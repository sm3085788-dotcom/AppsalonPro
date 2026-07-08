'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensureClienteFromAuth } from '@/lib/data/cliente';
import { getCurrentUser } from '@/lib/auth';
import type { JoinTeamModalidad } from '@/lib/recruitment/constants';

export async function submitJoinTeamAction(payload: {
  experiencia: Record<string, boolean>;
  modalidad: JoinTeamModalidad;
  mensaje: string;
  aceptaValores: boolean;
}): Promise<
  | { ok: true; solicitud: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Inicia sesión para enviar tu solicitud.' };

  const supabase = await createSupabaseServerClient();
  await ensureClienteFromAuth(supabase, user);

  const { data, error } = await supabase.rpc('submit_unete_equipo_solicitud', {
    p_experiencia: payload.experiencia,
    p_modalidad: payload.modalidad,
    p_mensaje: payload.mensaje?.trim() || '',
    p_acepta_valores: payload.aceptaValores,
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok?: boolean; error?: string; solicitud?: Record<string, unknown> };
  if (!result?.ok) {
    return { ok: false, error: result?.error || 'No se pudo enviar la solicitud.' };
  }

  revalidatePath('/unete-al-equipo');
  revalidatePath('/cuenta');

  return { ok: true, solicitud: result.solicitud || {} };
}
