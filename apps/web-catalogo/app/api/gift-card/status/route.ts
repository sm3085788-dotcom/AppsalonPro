import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** @deprecated Usa GET /api/payments/status?sessionId=... */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')?.trim();
  const legacyPi = request.nextUrl.searchParams.get('payment_intent_id')?.trim();
  const paymentRef = sessionId || legacyPi;

  if (!paymentRef) {
    return NextResponse.json({ error: 'Falta sessionId o payment_intent_id.' }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from('gift_cards')
      .select('codigo, vence_en, monto_inicial, para_nombre, de_nombre, mensaje, emitida_en, estado')
      .or(`payment_session_id.eq.${paymentRef},stripe_payment_intent_id.eq.${paymentRef}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, ready: true, card: existing });
    }

    const { data: finalized, error } = await admin.rpc('finalize_gift_card_payment', {
      p_payment_intent_id: paymentRef,
    });

    if (error) {
      return NextResponse.json({ ok: false, ready: false, error: error.message }, { status: 500 });
    }

    if (!finalized?.ok) {
      return NextResponse.json({ ok: false, ready: false, pending: true });
    }

    const { data: card } = await admin
      .from('gift_cards')
      .select('codigo, vence_en, monto_inicial, para_nombre, de_nombre, mensaje, emitida_en, estado')
      .or(`payment_session_id.eq.${paymentRef},stripe_payment_intent_id.eq.${paymentRef}`)
      .maybeSingle();

    return NextResponse.json({ ok: true, ready: true, card });
  } catch (err) {
    console.error('[gift-card/status]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
