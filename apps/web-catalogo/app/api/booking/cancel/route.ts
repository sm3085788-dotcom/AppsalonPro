import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { mergeBookingNotas, parseBookingNotas } from '@/lib/bookingPolicy';
import { clientePuedeModificarCita, normalizeEstadoCita } from '@/lib/citaCliente';
import { emitSalonBookingBroadcast } from '@/lib/realtime/emitSalonBooking';

function buildCancelNotas(raw: string | null | undefined): string {
  const { staff, meta } = parseBookingNotas(raw);
  const line = 'Cancelada por el cliente (web catálogo)';
  const staffNext = staff ? `${staff}\n${line}` : line;
  return mergeBookingNotas(staffNext, {
    ...meta,
    cancelled_at: new Date().toISOString(),
  });
}

async function updateCitaCancel(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  citaId: string,
  clienteId: string,
  nextNotas: string,
) {
  return supabase
    .from('citas')
    .update({ estado: 'cancelada', notas_servicio: nextNotas })
    .eq('id', citaId)
    .eq('cliente_id', clienteId)
    .select('id, estado, sucursal_id')
    .single();
}

/** Cancela cita web (pendiente) y notifica App Salón por broadcast. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { citaId?: string };
    const citaId = body.citaId?.trim();
    if (!citaId) {
      return NextResponse.json({ error: 'Cita no indicada.' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!cliente?.id) {
      return NextResponse.json({ error: 'Perfil de cliente no encontrado.' }, { status: 403 });
    }

    const { data: cita, error: citaErr } = await supabase
      .from('citas')
      .select('id,cliente_id,estado,notas_servicio,sucursal_id')
      .eq('id', citaId)
      .eq('cliente_id', cliente.id)
      .maybeSingle();

    if (citaErr || !cita) {
      return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });
    }

    const estadoNorm = normalizeEstadoCita(cita.estado);
    if (estadoNorm === 'cancelada' || estadoNorm === 'cancelado') {
      return NextResponse.json({ error: 'Esta cita ya está cancelada.' }, { status: 400 });
    }

    if (estadoNorm === 'completada' || estadoNorm === 'completado') {
      return NextResponse.json({ error: 'No se puede cancelar una cita completada.' }, { status: 400 });
    }

    if (!clientePuedeModificarCita(cita.estado)) {
      return NextResponse.json(
        { error: 'Solo podés cancelar citas pendientes de confirmación del salón.' },
        { status: 400 },
      );
    }

    const nextNotas = buildCancelNotas(cita.notas_servicio);

    let updated = null;
    let upErr = null;

    const sessionRes = await updateCitaCancel(supabase, citaId, cliente.id, nextNotas);
    updated = sessionRes.data;
    upErr = sessionRes.error;

    if (upErr && isSupabaseAdminConfigured) {
      try {
        const admin = createSupabaseAdminClient();
        const adminRes = await admin
          .from('citas')
          .update({ estado: 'cancelada', notas_servicio: nextNotas })
          .eq('id', citaId)
          .eq('cliente_id', cliente.id)
          .select('id, estado, sucursal_id')
          .single();
        updated = adminRes.data;
        upErr = adminRes.error;
      } catch (adminEx) {
        console.error('[booking/cancel] admin fallback', adminEx);
      }
    }

    if (upErr || !updated) {
      console.error('[booking/cancel] update failed', upErr);
      return NextResponse.json(
        {
          error:
            upErr?.message ||
            'No se pudo cancelar la cita. Verificá que tu sesión esté activa o contactá al salón.',
        },
        { status: 500 },
      );
    }

    await emitSalonBookingBroadcast(
      updated.sucursal_id ?? cita.sucursal_id,
      citaId,
      'cancelada',
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[booking/cancel]', err);
    return NextResponse.json({ error: 'No se pudo cancelar la cita.' }, { status: 500 });
  }
}
