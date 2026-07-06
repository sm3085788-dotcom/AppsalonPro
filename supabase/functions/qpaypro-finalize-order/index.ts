import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createOrderFromPaymentDraft, findExistingOrderBySession } from '../_shared/paymentOrder.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { session_id: sessionId } = await req.json();
    if (!sessionId) {
      return jsonResponse({ error: 'session_id required' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const existing = await findExistingOrderBySession(supabaseAdmin, String(sessionId));
    if (existing) {
      return jsonResponse({
        ok: true,
        order: existing,
        trackingCode: existing.tracking_code,
        total: existing.total_amount,
        idempotent: true,
      });
    }

    const { data: draft, error: draftErr } = await supabaseAdmin
      .from('payment_checkout_drafts')
      .select('*')
      .eq('session_id', String(sessionId))
      .eq('client_user_id', user.id)
      .maybeSingle();

    if (draftErr || !draft) {
      return jsonResponse({ error: 'Checkout no encontrado para este pago.' }, 404);
    }

    if (draft.status !== 'paid' && !String(sessionId).startsWith('demo_')) {
      return jsonResponse({ error: 'El pago aún no está confirmado.' }, 400);
    }

    const paymentReference = draft.payment_reference || String(sessionId);
    const { order } = await createOrderFromPaymentDraft(
      supabaseAdmin,
      draft,
      String(sessionId),
      String(paymentReference),
    );

    return jsonResponse({
      ok: true,
      order,
      trackingCode: order.tracking_code,
      total: order.total_amount,
      cardLast4: order.card_last4,
      idempotent: false,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
