import { NextResponse, type NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  bookingRefundEligible,
  mergeBookingNotas,
  parseBookingNotas,
  bookingRefundTooLateMessage,
} from '@/lib/bookingPolicy';

/** Cancela cita con reembolso automático del anticipo (plazo: BOOKING_REFUND_HOURS_BEFORE). */
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
      .select('id,cliente_id,estado,fecha_hora,notas_servicio,servicio')
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

    const { meta } = parseBookingNotas(cita.notas_servicio);
    const paymentIntentId = String(meta.payment_intent_id || '').trim();
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Esta cita no tiene anticipo reembolsable en línea.' },
        { status: 400 },
      );
    }

    if (meta.refunded) {
      return NextResponse.json({ error: 'El anticipo ya fue reembolsado.' }, { status: 400 });
    }

    if (!bookingRefundEligible(cita.fecha_hora)) {
      return NextResponse.json(
        { error: bookingRefundTooLateMessage() },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 });
    }

    await stripe.refunds.create({ payment_intent: paymentIntentId });

    const admin = createSupabaseAdminClient();
    const { staff } = parseBookingNotas(cita.notas_servicio);
    const nextNotas = mergeBookingNotas(
      `${staff}\nCancelada por el cliente · reembolso automático`.trim(),
      { ...meta, refunded: true, refunded_at: new Date().toISOString() },
    );

    const { error: upErr } = await admin
      .from('citas')
      .update({
        estado: 'cancelada',
        notas_servicio: nextNotas,
      })
      .eq('id', citaId);

    if (upErr) {
      console.error('[booking/cancel] update cita', upErr);
      return NextResponse.json(
        { error: 'Reembolso procesado pero no se pudo actualizar la cita. Contactá al salón.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, refunded: true });
  } catch (err) {
    console.error('[booking/cancel]', err);
    return NextResponse.json(
      { error: 'No se pudo cancelar la cita.' },
      { status: 500 },
    );
  }
}
