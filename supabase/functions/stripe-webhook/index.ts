import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { createOrderFromDraft, findExistingOrder } from '../_shared/stripeOrder.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!stripeSecret || !webhookSecret) {
      return jsonResponse({ error: 'Stripe webhook no configurado.' }, 500);
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    const signature = req.headers.get('stripe-signature');
    if (!signature) return jsonResponse({ error: 'Missing stripe-signature' }, 400);

    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type !== 'payment_intent.succeeded') {
      return jsonResponse({ received: true, ignored: event.type });
    }

    const pi = event.data.object as Stripe.PaymentIntent;
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const existing = await findExistingOrder(supabaseAdmin, pi.id);
    if (existing) {
      return jsonResponse({ received: true, order_id: existing.id, idempotent: true });
    }

    const { data: draft } = await supabaseAdmin
      .from('stripe_checkout_drafts')
      .select('*')
      .eq('payment_intent_id', pi.id)
      .maybeSingle();

    if (!draft) {
      return jsonResponse({ received: true, reason: 'draft_not_found' });
    }

    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;
    let last4: string | null = null;
    let brand: string | null = null;
    if (chargeId) {
      const charge = await stripe.charges.retrieve(String(chargeId));
      last4 = charge.payment_method_details?.card?.last4 ?? null;
      brand = charge.payment_method_details?.card?.brand ?? null;
    }

    const { order } = await createOrderFromDraft(supabaseAdmin, draft, {
      paymentIntentId: pi.id,
      chargeId: chargeId ? String(chargeId) : null,
      last4,
      brand,
    });

    return jsonResponse({ received: true, order_id: order.id });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
