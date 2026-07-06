import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { validateCartAndTotal } from '../_shared/paymentCart.ts';

function paymentEnv() {
  return {
    merchantId: Deno.env.get('QPAYPRO_MERCHANT_ID') ?? '',
    apiKey: Deno.env.get('QPAYPRO_API_KEY') ?? '',
    apiSecret: Deno.env.get('QPAYPRO_API_SECRET') ?? '',
    checkoutBaseUrl: Deno.env.get('QPAYPRO_CHECKOUT_BASE_URL') ?? '',
    currency: (Deno.env.get('PAYMENT_CURRENCY') ?? 'gtq').toLowerCase(),
  };
}

function isConfigured(env: ReturnType<typeof paymentEnv>) {
  return Boolean(env.merchantId && env.apiKey && env.apiSecret && env.checkoutBaseUrl);
}

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

    const body = await req.json();
    const kind = String(body?.kind || 'tienda_domicilio');
    const env = paymentEnv();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (kind === 'membership') {
      const codigo = String(body?.codigo || '').trim();
      const { data: preview, error: previewErr } = await supabaseUser.rpc('preview_membresia_codigo', {
        p_codigo: codigo,
      });
      if (previewErr || !preview?.ok) {
        return jsonResponse({ error: preview?.error || 'Código inválido.' }, 400);
      }
      const amount = Number(preview.price_gtq) || 0;
      const sessionId = `qpay_mem_${crypto.randomUUID()}`;
      const { data: draft } = await supabaseAdmin.from('payment_checkout_drafts').insert({
        kind: 'membership',
        client_user_id: user.id,
        amount_gtq: amount,
        currency: env.currency,
        metadata: { kind: 'membership', codigo, nivel: preview.nivel },
        session_id: sessionId,
        payment_provider: 'qpaypro',
      }).select('id').single();

      if (!isConfigured(env)) {
        await supabaseAdmin.from('payment_checkout_drafts').update({
          status: 'paid',
          payment_reference: `demo_${sessionId}`,
        }).eq('id', draft.id);
        return jsonResponse({
          sessionId,
          draftId: draft?.id,
          amount,
          currency: env.currency,
          demo: true,
          nivel: preview.nivel,
          label: preview.nivel,
        });
      }

      const redirectUrl = `${env.checkoutBaseUrl.replace(/\/$/, '')}?session_id=${sessionId}&amount=${amount}`;
      return jsonResponse({
        sessionId,
        draftId: draft?.id,
        redirectUrl,
        amount,
        currency: env.currency,
        demo: false,
        nivel: preview.nivel,
      });
    }

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

    const sessionId = `qpay_tienda_${crypto.randomUUID()}`;
    const { data: draft, error: draftErr } = await supabaseAdmin
      .from('payment_checkout_drafts')
      .insert({
        kind: 'tienda_domicilio',
        client_user_id: user.id,
        sucursal_id: cartCheck.sucursalId,
        amount_gtq: cartCheck.serverTotal,
        currency: env.currency,
        metadata: {
          kind: 'tienda_domicilio',
          cart_json: cartCheck.lines,
          ship_id: shipId,
          customer_name: clienteNombre?.trim() || 'Cliente tienda',
          customer_phone: clienteTelefono?.trim() || '—',
        },
        session_id: sessionId,
        payment_provider: 'qpaypro',
        status: 'pending',
      })
      .select('id')
      .single();

    if (draftErr || !draft?.id) {
      return jsonResponse({ error: draftErr?.message || 'No se pudo preparar el checkout.' }, 500);
    }

    if (!isConfigured(env)) {
      await supabaseAdmin.from('payment_checkout_drafts').update({
        status: 'paid',
        payment_reference: `demo_${sessionId}`,
      }).eq('session_id', sessionId);
      return jsonResponse({
        sessionId,
        draftId: draft.id,
        amount: cartCheck.serverTotal,
        currency: env.currency,
        demo: true,
      });
    }

    const redirectUrl = `${env.checkoutBaseUrl.replace(/\/$/, '')}?session_id=${sessionId}&amount=${cartCheck.serverTotal}`;
    return jsonResponse({
      sessionId,
      redirectUrl,
      draftId: draft.id,
      amount: cartCheck.serverTotal,
      currency: env.currency,
      demo: false,
    });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
