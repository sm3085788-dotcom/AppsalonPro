import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { mergeBookingNotas, parseBookingNotas } from '@/lib/bookingPolicy';

/** Cancela cita web (sin reembolso en línea — reservas sin anticipo). */
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
      .select('id,cliente_id,estado,notas_servicio')
      .eq('id', citaId)
      .eq('cliente_id', cliente.id)
      .maybeSingle();

    if (citaErr || !cita) {
      return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });
    }

    if (cita.estado === 'cancelada') {
      return NextResponse.json({ error: 'Esta cita ya está cancelada.' }, { status: 400 });
    }

    if (cita.estado === 'completada') {
      return NextResponse.json({ error: 'No se puede cancelar una cita completada.' }, { status: 400 });
    }

    const { staff, meta } = parseBookingNotas(cita.notas_servicio);
    const admin = createSupabaseAdminClient();
    const nextNotas = mergeBookingNotas(
      `${staff}\nCancelada por el cliente (web)`.trim(),
      { ...meta, cancelled_at: new Date().toISOString() },
    );

    const { error: upErr } = await admin
      .from('citas')
      .update({ estado: 'cancelada', notas_servicio: nextNotas })
      .eq('id', citaId);

    if (upErr) {
      return NextResponse.json({ error: 'No se pudo cancelar la cita.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[booking/cancel]', err);
    return NextResponse.json({ error: 'No se pudo cancelar la cita.' }, { status: 500 });
  }
}
