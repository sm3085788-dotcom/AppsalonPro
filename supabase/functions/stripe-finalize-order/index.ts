import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createOrderFromDraft, findExistingOrder } from '../_shared/stripeOrder.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!stripeSecret) {
      return jsonResponse({ error: 'STRIPE_SECRET_KEY no configurada.' }, 500);
    }

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

    const { payment_intent_id: paymentIntentId } = await req.json();
    if (!paymentIntentId) {
      return jsonResponse({ error: 'payment_intent_id required' }, 400);
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const pi = await stripe.paymentIntents.retrieve(String(paymentIntentId), {
      expand: ['latest_charge.payment_method_details'],
    });

    if (pi.metadata?.client_user_id && pi.metadata.client_user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    if (pi.status !== 'succeeded') {
      return jsonResponse({ error: 'El pago aún no está confirmado en Stripe.' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const existing = await findExistingOrder(supabaseAdmin, String(paymentIntentId));
    if (existing) {
      return jsonResponse({
        ok: true,
        order: existing,
        trackingCode: existing.tracking_code,
        total: existing.total_amount,
        cardLast4: existing.card_last4,
        idempotent: true,
      });
    }

    const { data: draft, error: draftErr } = await supabaseAdmin
      .from('stripe_checkout_drafts')
      .select('*')
      .eq('payment_intent_id', String(paymentIntentId))
      .eq('client_user_id', user.id)
      .maybeSingle();

    if (draftErr || !draft) {
      return jsonResponse({ error: 'Checkout no encontrado para este pago.' }, 404);
    }

    const charge = pi.latest_charge;
    const chargeObj = typeof charge === 'object' && charge ? charge : null;
    const pmd = chargeObj?.payment_method_details;
    const card = pmd && 'card' in pmd ? pmd.card : null;

    const { order } = await createOrderFromDraft(supabaseAdmin, draft, {
      paymentIntentId: String(paymentIntentId),
      chargeId: chargeObj?.id ? String(chargeObj.id) : null,
      last4: card?.last4 ? String(card.last4) : null,
      brand: card?.brand ? String(card.brand) : null,
    });

    return jsonResponse({
      ok: true,
      order,
      trackingCode: order.tracking_code,
      total: order.total_amount,
      cardLast4: order.card_last4,
      cardBrand: card?.brand ?? null,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
