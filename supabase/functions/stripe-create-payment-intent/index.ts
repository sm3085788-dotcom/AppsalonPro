import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { gtqToStripeAmount, validateCartAndTotal } from '../_shared/stripeCart.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
/** Quetzales (GTQ). Override solo para pruebas: STRIPE_CURRENCY en Supabase secrets. */
const stripeCurrency = (Deno.env.get('STRIPE_CURRENCY') ?? 'gtq').toLowerCase();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!stripeSecret) {
      return jsonResponse({ error: 'STRIPE_SECRET_KEY no configurada en Supabase.' }, 500);
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

    const body = await req.json();
    const {
      cartItems,
      total_amount,
      sucursalId,
      checkout_snapshot,
      clienteNombre,
      clienteTelefono,
      shipId = 'ship-home',
      homeAddressType,
      deliveryAddress,
    } = body ?? {};

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const cartCheck = await validateCartAndTotal(
      supabaseAdmin,
      cartItems,
      String(sucursalId || ''),
      checkout_snapshot ?? null,
      Number(total_amount),
    );
    if (!cartCheck.ok) {
      return jsonResponse({ error: cartCheck.message }, 400);
    }

    const { data: draft, error: draftErr } = await supabaseAdmin
      .from('stripe_checkout_drafts')
      .insert({
        client_user_id: user.id,
        sucursal_id: cartCheck.sucursalId,
        cart_json: cartCheck.lines,
        checkout_snapshot: checkout_snapshot ?? null,
        total_amount: cartCheck.serverTotal,
        server_total_amount: cartCheck.serverTotal,
        customer_name: clienteNombre?.trim() || 'Cliente tienda',
        customer_phone: clienteTelefono?.trim() || '—',
        ship_id: shipId,
        home_address_type: homeAddressType ?? null,
        delivery_address: deliveryAddress ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (draftErr || !draft?.id) {
      return jsonResponse({ error: draftErr?.message || 'No se pudo preparar el checkout.' }, 500);
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: gtqToStripeAmount(cartCheck.serverTotal),
        currency: stripeCurrency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          draft_id: draft.id,
          client_user_id: user.id,
          sucursal_id: cartCheck.sucursalId,
          ship_id: shipId,
          currency: stripeCurrency,
          amount_gtq: String(cartCheck.serverTotal),
        },
      });
    } catch (stripeErr) {
      const msg = String(stripeErr);
      if (/currency/i.test(msg)) {
        return jsonResponse(
          {
            error:
              'Stripe no acepta GTQ en esta cuenta. En Dashboard verificá país Guatemala y moneda quetzal, o contactá a Stripe.',
          },
          400,
        );
      }
      throw stripeErr;
    }

    const { error: linkErr } = await supabaseAdmin
      .from('stripe_checkout_drafts')
      .update({
        payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft.id);

    if (linkErr) {
      return jsonResponse({ error: linkErr.message }, 500);
    }

    return jsonResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      draftId: draft.id,
      amount: cartCheck.serverTotal,
      currency: stripeCurrency,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
