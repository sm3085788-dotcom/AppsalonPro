import { NextResponse, type NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  computeProductOrder,
  computeBookingAmount,
} from '@/lib/data/orderAmounts';
import { env } from '@/lib/env';
import { toMinorUnits } from '@/lib/format';
import type {
  CreatePaymentIntentInput,
  PaymentIntentResult,
} from '@/lib/types/db';

/** Req 5: crea un PaymentIntent calculando el monto en el SERVIDOR (GTQ). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePaymentIntentInput;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const metadata: Record<string, string> = {
      kind: body.kind,
      client_user_id: user.id,
      sucursal_id: body.sucursalId ?? '',
    };
    let amount = 0;

    if (body.kind === 'product') {
      const res = await computeProductOrder(
        supabase,
        body.items ?? [],
        body.sucursalId ?? null,
      );
      if (!res.ok) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      amount = res.order.total;
      // Guardamos solo ids:qty (compacto). El webhook recalcula precios.
      metadata.items = (body.items ?? [])
        .map((i) => `${i.inventarioId}:${i.cantidad}`)
        .join(',')
        .slice(0, 480);
    } else if (body.kind === 'booking') {
      if (!body.booking) {
        return NextResponse.json(
          { error: 'Datos de reserva incompletos.' },
          { status: 400 },
        );
      }
      const res = await computeBookingAmount(supabase, body.booking.servicioId);
      if (!res.ok) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      amount = res.total;
      metadata.servicio = body.booking.servicio.slice(0, 200);
      metadata.servicio_id = body.booking.servicioId;
      metadata.fecha_hora = body.booking.fechaHora;
      metadata.fulfillment = body.booking.fulfillment;
      if (body.booking.latitud != null)
        metadata.latitud = String(body.booking.latitud);
      if (body.booking.longitud != null)
        metadata.longitud = String(body.booking.longitud);
      if (body.booking.direccion)
        metadata.direccion = body.booking.direccion.slice(0, 300);
    } else {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Monto inválido.' },
        { status: 400 },
      );
    }

    const currency = env.stripeCurrency;
    const stripe = getStripe();

    // Modo demo: sin llaves devolvemos un resultado para previsualizar el flujo.
    if (!stripe) {
      const demo: PaymentIntentResult = {
        clientSecret: null,
        amount,
        currency,
        demo: true,
        paymentIntentId: null,
      };
      return NextResponse.json(demo);
    }

    const intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(amount),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata,
    });

    const result: PaymentIntentResult = {
      clientSecret: intent.client_secret,
      amount,
      currency,
      demo: false,
      paymentIntentId: intent.id,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error('[payment-intent]', err);
    return NextResponse.json(
      { error: 'No se pudo iniciar el pago.' },
      { status: 500 },
    );
  }
}
