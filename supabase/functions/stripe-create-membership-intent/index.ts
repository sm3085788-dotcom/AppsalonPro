import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { gtqToStripeAmount } from '../_shared/stripeCartMath.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const stripeCurrency = (Deno.env.get('STRIPE_CURRENCY') ?? 'gtq').toLowerCase();

const MEMBRESIA_MONTHLY_GTQ: Record<string, number> = {
  bronce: 350,
  plata: 850,
  vip: 2400,
};

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
    const codigo = String(body?.codigo || '').trim().toUpperCase();
    const nivelHint = String(body?.nivel || '').toLowerCase().trim();

    if (!codigo) {
      return jsonResponse({ error: 'Código de membresía requerido.' }, 400);
    }

    const { data: previewRaw, error: previewErr } = await supabaseUser.rpc('preview_membresia_codigo', {
      p_codigo: codigo,
    });
    if (previewErr) {
      return jsonResponse({ error: previewErr.message || 'No se pudo validar el código.' }, 400);
    }
    const preview = previewRaw && typeof previewRaw === 'object' ? previewRaw : {};
    if (preview.ok === false) {
      return jsonResponse({ error: String(preview.error || 'Código inválido.') }, 400);
    }

    const nivel = String(preview.nivel || nivelHint || '').toLowerCase();
    const amount = MEMBRESIA_MONTHLY_GTQ[nivel];
    if (!amount) {
      return jsonResponse({ error: 'Nivel de membresía no válido.' }, 400);
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: gtqToStripeAmount(amount),
        currency: stripeCurrency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          kind: 'membresia',
          codigo,
          nivel,
          client_user_id: user.id,
          currency: stripeCurrency,
          amount_gtq: String(amount),
        },
      });
    } catch (stripeErr) {
      const msg = String(stripeErr);
      if (/currency/i.test(msg)) {
        return jsonResponse(
          {
            error:
              'Stripe no acepta GTQ en esta cuenta. Verificá moneda quetzal en Dashboard o contactá a Stripe.',
          },
          400,
        );
      }
      throw stripeErr;
    }

    return jsonResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: stripeCurrency,
      nivel,
      label: preview.label || nivel,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
