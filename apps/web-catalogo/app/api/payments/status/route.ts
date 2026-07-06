import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  const draftId = request.nextUrl.searchParams.get('draftId');
  if (!sessionId && !draftId) {
    return NextResponse.json({ error: 'Falta sessionId o draftId.' }, { status: 400 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ status: 'unknown', demo: true });
  }

  const admin = createSupabaseAdminClient();

  if (draftId) {
    const { data: giftDraft } = await admin
      .from('gift_card_checkout_drafts')
      .select('status, gift_card_id, payment_session_id')
      .eq('id', draftId)
      .maybeSingle();
    if (giftDraft) {
      if (giftDraft.status === 'completed' && giftDraft.gift_card_id) {
        const { data: card } = await admin
          .from('gift_cards')
          .select('codigo, monto, para_nombre, de_nombre')
          .eq('id', giftDraft.gift_card_id)
          .maybeSingle();
        return NextResponse.json({ status: 'paid', giftCard: card });
      }
      return NextResponse.json({ status: giftDraft.status || 'pending' });
    }
  }

  if (sessionId) {
    const { data: draft } = await admin
      .from('payment_checkout_drafts')
      .select('status, kind, payment_reference')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (draft) {
      return NextResponse.json({
        status: draft.status,
        kind: draft.kind,
        paymentReference: draft.payment_reference,
      });
    }

    const { data: giftBySession } = await admin
      .from('gift_card_checkout_drafts')
      .select('status, id')
      .eq('payment_session_id', sessionId)
      .maybeSingle();
    if (giftBySession) {
      return NextResponse.json({ status: giftBySession.status, draftId: giftBySession.id });
    }
  }

  return NextResponse.json({ status: 'pending' });
}
