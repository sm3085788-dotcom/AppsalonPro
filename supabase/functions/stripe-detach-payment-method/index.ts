import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!stripeSecret) return jsonResponse({ error: 'STRIPE_SECRET_KEY no configurada.' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const paymentMethodId = String(body?.paymentMethodId || body?.payment_method_id || '').trim();
    if (!paymentMethodId) return jsonResponse({ error: 'paymentMethodId requerido' }, 400);

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-12-18.acacia' });
    await stripe.paymentMethods.detach(paymentMethodId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    await supabaseAdmin
      .from('stripe_saved_cards')
      .delete()
      .eq('client_user_id', user.id)
      .eq('payment_method_id', paymentMethodId);

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: e?.message || String(e) }, 500);
  }
});
