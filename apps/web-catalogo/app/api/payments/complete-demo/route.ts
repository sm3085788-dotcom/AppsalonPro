import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { handlePaymentWebhookEvent } from '@/lib/payments/handlers';

/** Modo demo sin credenciales QPayPro. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { draftId?: string; kind?: string; sessionId?: string };
    if (!body.draftId) {
      return NextResponse.json({ error: 'draftId requerido.' }, { status: 400 });
    }
    if (!isSupabaseAdminConfigured) {
      return NextResponse.json({ error: 'Servidor no configurado.' }, { status: 503 });
    }

    const admin = createSupabaseAdminClient();
    const kind = body.kind || 'gift_card';
    const sessionId = body.sessionId || `demo_${body.draftId}`;

    if (kind === 'gift_card') {
      const { data, error } = await admin.rpc('finalize_gift_card_draft_demo', {
        p_draft_id: body.draftId,
      });
      if (error) {
        return NextResponse.json({ error: 'No se pudo finalizar demo.' }, { status: 500 });
      }
      if (!data?.ok) {
        return NextResponse.json({ error: data?.error || 'Error demo.' }, { status: 400 });
      }
      return NextResponse.json({ ok: true, codigo: data.codigo, redirectTo: `/tarjeta-regalo/exito/${data.codigo}` });
    }

    const { data: draft } = await admin
      .from('payment_checkout_drafts')
      .select('id, kind, metadata, session_id')
      .eq('id', body.draftId)
      .maybeSingle();

    const draftMeta = (draft?.metadata || {}) as Record<string, string>;
    const eventMeta: Record<string, string> =
      kind === 'product' || kind === 'membership'
        ? { ...draftMeta, kind: draftMeta.kind || kind }
        : { kind, draft_id: body.draftId };

    await handlePaymentWebhookEvent(admin, {
      status: 'paid',
      sessionId: draft?.session_id || sessionId,
      paymentReference: `demo_${draft?.session_id || sessionId}`,
      metadata: eventMeta,
    });

    await admin
      .from('payment_checkout_drafts')
      .update({ status: 'paid', payment_reference: `demo_${draft?.session_id || sessionId}` })
      .eq('id', body.draftId);

    return NextResponse.json({ ok: true, redirectTo: '/checkout/exito' });
  } catch (err) {
    console.error('[payments/complete-demo]', err);
    return NextResponse.json({ error: 'Error demo.' }, { status: 500 });
  }
}
