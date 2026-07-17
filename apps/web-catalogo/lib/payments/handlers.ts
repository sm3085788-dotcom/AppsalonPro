import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentWebhookEvent } from '../../../../shared/payments/types.js';
import { computeProductOrder } from '@/lib/data/orderAmounts';
import { env } from '@/lib/env';

export async function handlePaymentWebhookEvent(
  admin: SupabaseClient,
  event: PaymentWebhookEvent,
) {
  if (event.status !== 'paid') return;

  const meta = event.metadata ?? {};
  const kind = meta.kind || '';
  const clientUserId = meta.client_user_id || null;
  const sucursalId = meta.sucursal_id || null;
  const sessionRef = event.paymentReference || event.sessionId;

  if (kind === 'product') {
    const { data: existing } = await admin
      .from('ecommerce_orders')
      .select('id, tracking_code')
      .eq('payment_session_id', event.sessionId)
      .maybeSingle();
    if (existing) return;

    const fulfillment = meta.fulfillment === 'domicilio' ? 'domicilio' : 'retiro_salon';
    const items = (meta.items || '')
      .split(',')
      .filter(Boolean)
      .map((pair) => {
        const [inventarioId, cantidad] = pair.split(':');
        return { inventarioId, cantidad: Number(cantidad) || 0 };
      });

    const computed = await computeProductOrder(admin, items, sucursalId, {
      fulfillment: fulfillment === 'domicilio' ? 'domicilio' : 'retiro_salon',
      shippingFeeGtq: env.productShippingFeeGtq,
    });
    if (!computed.ok) {
      console.error('[payments/webhook] recomputo pedido', computed.error);
      return;
    }

    const customerName = meta.customer_name || 'Cliente web';
    const customerPhone = meta.customer_phone || '—';
    const isDomicilio = fulfillment === 'domicilio';

    const { data: order, error: oErr } = await admin
      .from('ecommerce_orders')
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        notes: isDomicilio
          ? `Pedido web · pago QPayPro · domicilio · ${sessionRef}`
          : `Pedido web · pago QPayPro · retiro · ${sessionRef}`,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        total_amount: computed.order.total,
        payment_method: 'tarjeta',
        client_user_id: clientUserId,
        fulfillment_type: fulfillment,
        delivery_address: meta.direccion || null,
        sucursal_id: sucursalId,
        source: 'web',
        payment_provider: 'qpaypro',
        payment_session_id: event.sessionId,
        payment_reference: sessionRef,
        checkout_snapshot: {
          source: 'web',
          payment_session_id: event.sessionId,
          payment_reference: sessionRef,
          payment_captured: true,
          customer_phone: customerPhone,
          fulfillment,
        },
      })
      .select('id')
      .single();

    if (oErr || !order) {
      console.error('[payments/webhook] crear pedido', oErr);
      return;
    }

    const bulk = computed.order.lines
      .filter((l) => l.product_id !== 'shipping')
      .map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        product_name: l.product_name,
        unit_price: l.unit_price,
        qty: l.qty,
      }));
    if (bulk.length > 0) {
      const { error: iErr } = await admin.from('ecommerce_order_items').insert(bulk);
      if (iErr) console.error('[payments/webhook] crear líneas', iErr);
    }
    return;
  }

  if (kind === 'gift_card') {
    const { data, error } = await admin.rpc('finalize_gift_card_payment', {
      p_payment_intent_id: sessionRef,
      p_payment_session_id: event.sessionId,
      p_payment_provider: 'qpaypro',
    });
    if (error) console.error('[payments/webhook] gift_card finalize', error);
    else if (!data?.ok) console.error('[payments/webhook] gift_card finalize', data?.error);
    return;
  }

  if (kind === 'membership') {
    await admin.from('payment_checkout_drafts').update({
      status: 'paid',
      payment_reference: sessionRef,
      updated_at: new Date().toISOString(),
    }).eq('session_id', event.sessionId);
    return;
  }
}

export function buildReturnUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  const origin = process.env.NEXT_PUBLIC_SITE_URL || base;
  return `${origin.replace(/\/$/, '')}${path}`;
}

export { env };
