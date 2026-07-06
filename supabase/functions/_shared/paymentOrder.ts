import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type SupabaseAdmin = ReturnType<typeof createClient>;

export async function findExistingOrderBySession(supabaseAdmin: SupabaseAdmin, sessionId: string) {
  const { data } = await supabaseAdmin
    .from('ecommerce_orders')
    .select('*')
    .eq('payment_session_id', sessionId)
    .maybeSingle();
  return data;
}

export async function createOrderFromPaymentDraft(
  supabaseAdmin: SupabaseAdmin,
  draft: Record<string, unknown>,
  sessionId: string,
  paymentReference: string,
) {
  const existing = await findExistingOrderBySession(supabaseAdmin, sessionId);
  if (existing) {
    return { order: existing, created: false };
  }

  const meta = (draft.metadata || {}) as Record<string, unknown>;
  const shipId = String(meta.ship_id || 'ship-home');
  const fulfillment_type = shipId === 'ship-home' ? 'domicilio' : 'retiro_salon';
  const lines = Array.isArray(meta.cart_json) ? meta.cart_json : [];

  const { data: order, error: oErr } = await supabaseAdmin
    .from('ecommerce_orders')
    .insert({
      customer_name: meta.customer_name || 'Cliente tienda',
      customer_phone: meta.customer_phone || '—',
      notes: 'Pedido app clientes · QPayPro confirmado · envío a domicilio',
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      total_amount: draft.amount_gtq,
      payment_method: 'tarjeta',
      client_user_id: draft.client_user_id,
      fulfillment_type,
      checkout_snapshot: {
        payment_provider: 'qpaypro',
        payment_session_id: sessionId,
        payment_reference: paymentReference,
        payment_captured: true,
      },
      sucursal_id: draft.sucursal_id,
      payment_provider: 'qpaypro',
      payment_session_id: sessionId,
      payment_reference: paymentReference,
      source: 'mobile-client',
    })
    .select('*')
    .single();

  if (oErr || !order) {
    throw new Error(oErr?.message || 'No se pudo crear el pedido.');
  }

  const bulk = lines.map((l: Record<string, unknown>) => ({
    order_id: order.id,
    product_id: l.id,
    product_name: l.title,
    unit_price: Number(l.unit_price || 0),
    qty: Number(l.qty || 0),
  }));

  const { error: iErr } = await supabaseAdmin.from('ecommerce_order_items').insert(bulk);
  if (iErr) throw new Error(iErr.message);

  await supabaseAdmin
    .from('payment_checkout_drafts')
    .update({ status: 'paid', payment_reference: paymentReference, updated_at: new Date().toISOString() })
    .eq('id', draft.id);

  return { order, created: true };
}
