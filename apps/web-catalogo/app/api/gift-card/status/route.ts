import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Consulta estado post-pago y finaliza vía webhook si aún no existe tarjeta. */
export async function GET(request: NextRequest) {
  const pi = request.nextUrl.searchParams.get('payment_intent_id')?.trim();
  if (!pi) {
    return NextResponse.json({ error: 'Falta payment_intent_id.' }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();

    const { data: existing } = await admin
      .from('gift_cards')
      .select('codigo, vence_en, monto_inicial, para_nombre, de_nombre, mensaje, emitida_en, estado')
      .eq('stripe_payment_intent_id', pi)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, ready: true, card: existing });
    }

    const { data: finalized, error } = await admin.rpc('finalize_gift_card_payment', {
      p_payment_intent_id: pi,
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
      .eq('stripe_payment_intent_id', pi)
      .maybeSingle();

    return NextResponse.json({ ok: true, ready: true, card });
  } catch (err) {
    console.error('[gift-card/status]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
