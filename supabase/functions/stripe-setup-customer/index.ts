import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) return null;
  return user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!stripeSecret) return jsonResponse({ error: 'STRIPE_SECRET_KEY no configurada.' }, 500);
    const user = await getAuthUser(req);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: cliente } = await supabaseAdmin
      .from('clientes')
      .select('id, nombre, email, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-12-18.acacia' });
    let customerId = cliente?.stripe_customer_id?.trim() || '';

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = '';
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? cliente?.email ?? undefined,
        name: cliente?.nombre?.trim() || undefined,
        metadata: { supabase_user_id: user.id, cliente_id: cliente?.id ?? '' },
      });
      customerId = customer.id;
      if (cliente?.id) {
        await supabaseAdmin
          .from('clientes')
          .update({ stripe_customer_id: customerId })
          .eq('id', cliente.id);
      }
    }

    return jsonResponse({ ok: true, customerId });
  } catch (e) {
    return jsonResponse({ error: e?.message || String(e) }, 500);
  }
});
