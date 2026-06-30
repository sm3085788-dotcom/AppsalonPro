import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { computeProductOrder } from '@/lib/data/orderAmounts';
import { env } from '@/lib/env';

/**
 * Req 5: webhook de Stripe. Confirma el pago y crea la cita o el pedido con el
 * service role (sin sesion de usuario). Recalcula montos en el servidor.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Falta firma.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await request.text();
    event = stripe.webhooks.constructEvent(
      raw,
      signature,
      env.stripeWebhookSecret,
    );
  } catch (err) {
    console.error('[webhook] firma inválida', err);
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      await handleSucceeded(pi);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] error procesando evento', err);
    return NextResponse.json(
      { error: 'Error procesando webhook.' },
      { status: 500 },
    );
  }
}

async function handleSucceeded(pi: Stripe.PaymentIntent) {
  const meta = pi.metadata ?? {};
  const admin = createSupabaseAdminClient();
  const clientUserId = meta.client_user_id || null;
  const sucursalId = meta.sucursal_id || null;

  if (meta.kind === 'product') {
    const items = (meta.items || '')
      .split(',')
      .filter(Boolean)
      .map((pair) => {
        const [inventarioId, cantidad] = pair.split(':');
        return { inventarioId, cantidad: Number(cantidad) || 0 };
      });

    const computed = await computeProductOrder(admin, items, sucursalId);
    if (!computed.ok) {
      console.error('[webhook] recomputo pedido', computed.error);
      return;
    }

    const { data: order, error: oErr } = await admin
      .from('ecommerce_orders')
      .insert({
        customer_name: 'Cliente web',
        notes: 'Pedido web · pago con tarjeta (Stripe)',
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        total_amount: computed.order.total,
        payment_method: 'tarjeta',
        client_user_id: clientUserId,
        fulfillment_type: meta.fulfillment === 'domicilio' ? 'domicilio' : 'retiro_salon',
        delivery_address: meta.direccion || null,
        sucursal_id: sucursalId,
        checkout_snapshot: { source: 'web', payment_intent: pi.id },
      })
      .select('id')
      .single();

    if (oErr || !order) {
      console.error('[webhook] crear pedido', oErr);
      return;
    }

    const bulk = computed.order.lines.map((l) => ({
      order_id: order.id,
      product_id: l.product_id,
      product_name: l.product_name,
      unit_price: l.unit_price,
      qty: l.qty,
    }));
    const { error: iErr } = await admin
      .from('ecommerce_order_items')
      .insert(bulk);
    if (iErr) console.error('[webhook] crear líneas', iErr);
    return;
  }

  if (meta.kind === 'booking') {
    // citas se vincula por cliente_id (public.clientes), no por auth user.
    let clienteId: string | null = null;
    if (clientUserId) {
      const { data: cliente } = await admin
        .from('clientes')
        .select('id')
        .eq('user_id', clientUserId)
        .maybeSingle();
      clienteId = cliente?.id ?? null;
    }

    const { error } = await admin.from('citas').insert({
      sucursal_id: sucursalId,
      cliente_id: clienteId,
      servicio: meta.servicio || 'Servicio',
      estado: 'confirmada',
      fecha_hora: meta.fecha_hora || new Date().toISOString(),
      precio: pi.amount / 100,
      duracion_minutos: 60,
      latitud: meta.latitud ? Number(meta.latitud) : null,
      longitud: meta.longitud ? Number(meta.longitud) : null,
      direccion_domicilio: meta.direccion || null,
    });
    if (error) console.error('[webhook] crear cita', error);
  }
}
