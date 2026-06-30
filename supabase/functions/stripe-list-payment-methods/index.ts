import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

async function syncCardsCache(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  customerId: string,
  methods: Array<{ id: string; card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number } }>,
) {
  await supabaseAdmin.from('stripe_saved_cards').delete().eq('client_user_id', userId);
  if (!methods.length) return;
  const defaultPm = methods.find((m) => m.id)?.id ?? methods[0]?.id;
  const rows = methods.map((pm, idx) => ({
    client_user_id: userId,
    stripe_customer_id: customerId,
    payment_method_id: pm.id,
    brand: pm.card?.brand ?? null,
    last4: pm.card?.last4 ?? null,
    exp_month: pm.card?.exp_month ?? null,
    exp_year: pm.card?.exp_year ?? null,
    is_default: pm.id === defaultPm || idx === 0,
  }));
  await supabaseAdmin.from('stripe_saved_cards').insert(rows);
}

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: cliente } = await supabaseAdmin
      .from('clientes')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const customerId = String(cliente?.stripe_customer_id || '').trim();
    if (!customerId) {
      return jsonResponse({ ok: true, cards: [] });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-12-18.acacia' });
    const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
    const cards = (list.data || []).map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? 'card',
      last4: pm.card?.last4 ?? '****',
      expMonth: pm.card?.exp_month ?? null,
      expYear: pm.card?.exp_year ?? null,
      label: `${(pm.card?.brand ?? 'Tarjeta').replace(/^./, (c) => c.toUpperCase())} ··· ${pm.card?.last4 ?? '****'}`,
    }));

    await syncCardsCache(supabaseAdmin, user.id, customerId, list.data || []);

    return jsonResponse({ ok: true, cards, customerId });
  } catch (e) {
    return jsonResponse({ error: e?.message || String(e) }, 500);
  }
});
