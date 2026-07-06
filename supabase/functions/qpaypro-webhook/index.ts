import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createOrderFromPaymentDraft } from '../_shared/paymentOrder.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get('QPAYPRO_WEBHOOK_SECRET') ?? '';
    const signature = req.headers.get('x-qpaypro-signature') ?? '';
    const raw = await req.text();

    if (secret && signature !== secret) {
      return jsonResponse({ error: 'Firma inválida.' }, 400);
    }

    const payload = JSON.parse(raw);
    const status = String(payload.status || payload.event || '').toLowerCase();
    const sessionId = String(payload.session_id || payload.sessionId || '');
    const paymentReference = String(payload.payment_reference || payload.transaction_id || sessionId);

    if (!sessionId || !['paid', 'success', 'approved'].includes(status)) {
      return jsonResponse({ received: true, ignored: true });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: draft } = await supabaseAdmin
      .from('payment_checkout_drafts')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (draft) {
      await supabaseAdmin
        .from('payment_checkout_drafts')
        .update({
          status: 'paid',
          payment_reference: paymentReference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft.id);

      if (draft.kind === 'tienda_domicilio') {
        await createOrderFromPaymentDraft(supabaseAdmin, draft, sessionId, paymentReference);
      }
    }

    if (payload.metadata?.kind === 'gift_card' || payload.draft_id) {
      await supabaseAdmin.rpc('finalize_gift_card_payment', {
        p_payment_intent_id: paymentReference,
        p_payment_session_id: sessionId,
        p_payment_provider: 'qpaypro',
      });
    }

    return jsonResponse({ received: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
