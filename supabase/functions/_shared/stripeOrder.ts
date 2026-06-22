import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type SupabaseAdmin = ReturnType<typeof createClient>;

function mapFulfillment(shipId: string, homeAddressType?: string | null) {
  if (shipId === 'ship-home') {
    return {
      fulfillment_type: 'domicilio',
      delivery_reference: homeAddressType === 'casa' ? 'Casa' : 'Trabajo',
    };
  }
  return { fulfillment_type: 'retiro_salon', delivery_reference: null };
}

export async function findExistingOrder(supabaseAdmin: SupabaseAdmin, paymentIntentId: string) {
  const { data } = await supabaseAdmin
    .from('ecommerce_orders')
    .select('*')
    .filter('checkout_snapshot->>stripe_payment_intent_id', 'eq', paymentIntentId)
    .maybeSingle();
  return data;
}

export async function createOrderFromDraft(
  supabaseAdmin: SupabaseAdmin,
  draft: Record<string, unknown>,
  stripeMeta: {
    paymentIntentId: string;
    chargeId: string | null;
    last4: string | null;
    brand: string | null;
  },
) {
  const existing = await findExistingOrder(supabaseAdmin, stripeMeta.paymentIntentId);
  if (existing) {
    return { order: existing, created: false };
  }

  const shipId = String(draft.ship_id || 'ship-home');
  const fulfillment = mapFulfillment(shipId, draft.home_address_type as string | null);
  const checkoutSnap = {
    ...(typeof draft.checkout_snapshot === 'object' && draft.checkout_snapshot
      ? (draft.checkout_snapshot as Record<string, unknown>)
      : {}),
    payment_captured: true,
    captured_at: new Date().toISOString(),
    payment_provider: 'stripe',
    currency: 'gtq',
    stripe_payment_intent_id: stripeMeta.paymentIntentId,
    stripe_charge_id: stripeMeta.chargeId,
    card_brand: stripeMeta.brand,
    card_last4: stripeMeta.last4,
  };

  const { data: order, error: oErr } = await supabaseAdmin
    .from('ecommerce_orders')
    .insert({
      customer_name: draft.customer_name,
      customer_phone: draft.customer_phone,
      notes: 'Pedido app clientes · tarjeta Stripe confirmada · envío a domicilio',
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      total_amount: draft.total_amount,
      payment_method: 'tarjeta',
      card_last4: stripeMeta.last4,
      client_user_id: draft.client_user_id,
      fulfillment_type: fulfillment.fulfillment_type,
      delivery_reference: fulfillment.delivery_reference,
      delivery_address: draft.delivery_address,
      checkout_snapshot: checkoutSnap,
      sucursal_id: draft.sucursal_id,
      source: 'mobile-client',
    })
    .select('*')
    .single();

  if (oErr || !order) {
    throw new Error(oErr?.message || 'No se pudo crear el pedido.');
  }

  const lines = Array.isArray(draft.cart_json) ? draft.cart_json : [];
  const bulk = lines.map((l: Record<string, unknown>) => ({
    order_id: order.id,
    product_id: l.id,
    product_name: l.title,
    unit_price: Number(l.unit_price || 0),
    qty: Number(l.qty || 0),
  }));

  const { error: iErr } = await supabaseAdmin.from('ecommerce_order_items').insert(bulk);
  if (iErr) {
    await supabaseAdmin
      .from('ecommerce_orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Error al guardar líneas del pedido Stripe',
      })
      .eq('id', order.id);
    throw new Error(iErr.message);
  }

  await supabaseAdmin
    .from('stripe_checkout_drafts')
    .update({
      status: 'completed',
      order_id: order.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', draft.id);

  return { order, created: true };
}
