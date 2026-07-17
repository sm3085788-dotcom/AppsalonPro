import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { clientePuedeModificarCita } from '@/lib/citaCliente';
import {
  bookingSlotValidationError,
  getSlotStartFromInstant,
  instantFromDateAndSlotGT,
  zonedCalendarDateString,
} from '@/lib/bookingSlots';
import { emitSalonBookingBroadcast } from '@/lib/realtime/emitSalonBooking';

/** Reprograma cita web (solo pendiente) y notifica App Salón. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { citaId?: string; fechaHora?: string };
    const citaId = body.citaId?.trim();
    const fechaHora = body.fechaHora?.trim();
    if (!citaId || !fechaHora) {
      return NextResponse.json({ error: 'Cita y nueva fecha son obligatorias.' }, { status: 400 });
    }

    const nueva = new Date(fechaHora);
    if (Number.isNaN(nueva.getTime())) {
      return NextResponse.json({ error: 'Fecha u hora inválida.' }, { status: 400 });
    }
    const slotErr = bookingSlotValidationError(nueva);
    if (slotErr) {
      return NextResponse.json({ error: slotErr }, { status: 400 });
    }

    const slot = getSlotStartFromInstant(nueva);
    if (!slot) {
      return NextResponse.json({ error: 'Fecha u hora inválida.' }, { status: 400 });
    }

    const normalized = instantFromDateAndSlotGT(
      zonedCalendarDateString(nueva),
      slot,
    )!;
    const normalizedIso = normalized.toISOString();

    if (normalized.getTime() < Date.now() + 30 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Elegí una fecha y hora al menos 30 minutos en el futuro.' },
        { status: 400 },
      );
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
      .select('id,cliente_id,estado,sucursal_id')
      .eq('id', citaId)
      .eq('cliente_id', cliente.id)
      .maybeSingle();

    if (citaErr || !cita) {
      return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });
    }

    if (!clientePuedeModificarCita(cita.estado)) {
      return NextResponse.json(
        { error: 'Solo podés reagendar citas pendientes de confirmación.' },
        { status: 400 },
      );
    }

    const patch = {
      fecha_hora: normalizedIso,
      estado: 'pendiente',
    };

    let updated = null;
    let upErr = null;

    const sessionRes = await supabase
      .from('citas')
      .update(patch)
      .eq('id', citaId)
      .eq('cliente_id', cliente.id)
      .select('id, estado, sucursal_id, fecha_hora')
      .single();
    updated = sessionRes.data;
    upErr = sessionRes.error;

    if (upErr && isSupabaseAdminConfigured) {
      try {
        const admin = createSupabaseAdminClient();
        const adminRes = await admin
          .from('citas')
          .update(patch)
          .eq('id', citaId)
          .eq('cliente_id', cliente.id)
          .select('id, estado, sucursal_id, fecha_hora')
          .single();
        updated = adminRes.data;
        upErr = adminRes.error;
      } catch (adminEx) {
        console.error('[booking/reschedule] admin fallback', adminEx);
      }
    }

    if (upErr || !updated) {
      console.error('[booking/reschedule] update failed', upErr);
      return NextResponse.json(
        {
          error:
            upErr?.message ||
            'No se pudo reagendar la cita. Verificá tu sesión o contactá al salón.',
        },
        { status: 500 },
      );
    }

    await emitSalonBookingBroadcast(
      updated.sucursal_id ?? cita.sucursal_id,
      citaId,
      'pendiente',
    );

    return NextResponse.json({ ok: true, fecha_hora: updated.fecha_hora });
  } catch (err) {
    console.error('[booking/reschedule]', err);
    return NextResponse.json({ error: 'No se pudo reagendar la cita.' }, { status: 500 });
  }
}
