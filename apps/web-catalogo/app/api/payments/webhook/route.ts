import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { getWebPaymentGateway } from '@/lib/payments/server';
import { handlePaymentWebhookEvent } from '@/lib/payments/handlers';

export async function POST(request: NextRequest) {
  const gateway = getWebPaymentGateway();
  const raw = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  if (env.qpayproWebhookSecret && !headers['x-qpaypro-signature']) {
    return NextResponse.json({ error: 'Falta firma.' }, { status: 400 });
  }

  let event;
  try {
    event = await gateway.verifyWebhook(raw, headers);
  } catch (err) {
    console.error('[payments/webhook] verify', err);
    return NextResponse.json({ error: 'Webhook inválido.' }, { status: 400 });
  }

  if (!event) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const admin = createSupabaseAdminClient();
    await handlePaymentWebhookEvent(admin, event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[payments/webhook] handler', err);
    return NextResponse.json({ error: 'Error procesando webhook.' }, { status: 500 });
  }
}
