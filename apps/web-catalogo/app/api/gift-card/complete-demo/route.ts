import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/** Finaliza tarjeta en modo demo (sin Stripe). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { draftId?: string };
    const draftId = String(body.draftId || '').trim();
    if (!draftId) {
      return NextResponse.json({ error: 'Falta borrador.' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('finalize_gift_card_draft_demo', {
      p_draft_id: draftId,
    });

    if (error) {
      console.error('[gift-card/complete-demo]', error);
      return NextResponse.json(
        { error: error.message || 'No se pudo generar la tarjeta demo.' },
        { status: 500 },
      );
    }

    if (!data?.ok) {
      return NextResponse.json(
        { error: data?.error || 'No se pudo generar la tarjeta.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      codigo: data.codigo,
      giftCardId: data.gift_card_id,
      venceEn: data.vence_en,
    });
  } catch (err) {
    console.error('[gift-card/complete-demo]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
