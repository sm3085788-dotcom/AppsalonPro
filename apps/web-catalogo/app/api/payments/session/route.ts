import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { computeProductOrder } from '@/lib/data/orderAmounts';
import { env, isSupabaseAdminConfigured } from '@/lib/env';
import { getWebPaymentGateway } from '@/lib/payments/server';
import { buildReturnUrl } from '@/lib/payments/handlers';
import type { CreatePaymentSessionInput } from '@/lib/types/db';
import { validateGiftCardPayload, type GiftCardFormInput } from '@/lib/gift-card/validation';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePaymentSessionInput & GiftCardFormInput;
    const gateway = getWebPaymentGateway();
    const currency = env.paymentCurrency;
    let amount = 0;
    const metadata: Record<string, string> = { kind: body.kind };
    let draftId = '';
    let returnUrl = '';
    let customerEmail: string | undefined;

    if (body.kind === 'product') {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
      }

      const fulfillment = body.fulfillment === 'domicilio' ? 'domicilio' : 'retiro_salon';
      const res = await computeProductOrder(
        supabase,
        body.items ?? [],
        body.sucursalId ?? null,
        { fulfillment, shippingFeeGtq: env.productShippingFeeGtq },
      );
      if (!res.ok) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      amount = res.order.total;
      metadata.client_user_id = user.id;
      metadata.sucursal_id = body.sucursalId ?? '';
      metadata.fulfillment = fulfillment;
      metadata.items = (body.items ?? [])
        .map((i) => `${i.inventarioId}:${i.cantidad}`)
        .join(',')
        .slice(0, 480);
      if (body.customer?.nombre) metadata.customer_name = body.customer.nombre.slice(0, 120);
      if (body.customer?.telefono) metadata.customer_phone = body.customer.telefono.slice(0, 40);
      if (body.customer?.direccion) metadata.direccion = body.customer.direccion.slice(0, 300);
      if (body.customer?.latitud != null) metadata.latitud = String(body.customer.latitud);
      if (body.customer?.longitud != null) metadata.longitud = String(body.customer.longitud);
      returnUrl = buildReturnUrl('/checkout/exito');
    } else if (body.kind === 'gift_card') {
      const giftInput: GiftCardFormInput = body.giftCard
        ? {
            amount: String(body.giftCard.monto),
            forName: body.giftCard.paraNombre,
            fromName: body.giftCard.deNombre,
            message: body.giftCard.mensaje ?? '',
            buyerEmail: body.giftCard.compradorEmail,
          }
        : (body as GiftCardFormInput);
      const validated = validateGiftCardPayload(giftInput);
      if (!validated.ok) {
        return NextResponse.json({ error: validated.error }, { status: 400 });
      }
      if (!isSupabaseAdminConfigured) {
        return NextResponse.json({ error: 'Servidor no configurado.' }, { status: 503 });
      }
      const { monto, paraNombre, deNombre, mensaje, compradorEmail } = validated.payload;
      amount = monto;
      customerEmail = compradorEmail;
      const admin = createSupabaseAdminClient();
      const { data: draft, error: draftErr } = await admin
        .from('gift_card_checkout_drafts')
        .insert({
          monto,
          para_nombre: paraNombre,
          de_nombre: deNombre,
          mensaje: mensaje || null,
          comprador_email: compradorEmail,
          status: 'pending',
          payment_provider: 'qpaypro',
        })
        .select('id')
        .single();
      if (draftErr || !draft) {
        return NextResponse.json({ error: 'No se pudo preparar la tarjeta.' }, { status: 500 });
      }
      draftId = draft.id;
      metadata.draft_id = draft.id;
      metadata.comprador_email = compradorEmail.slice(0, 200);
      metadata.para_nombre = paraNombre.slice(0, 120);
      metadata.de_nombre = deNombre.slice(0, 120);
      metadata.monto_gtq = String(monto);
      returnUrl = buildReturnUrl('/tarjeta-regalo/exito?session=pending');
    } else if (body.kind === 'membership') {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
      }
      const codigo = body.membership?.codigo || '';
      if (!codigo) {
        return NextResponse.json({ error: 'Código de membresía requerido.' }, { status: 400 });
      }
      const { data: preview, error: previewErr } = await supabase.rpc('preview_membresia_codigo', {
        p_codigo: codigo,
      });
      if (previewErr || !preview?.ok) {
        return NextResponse.json({ error: preview?.error || 'Código inválido.' }, { status: 400 });
      }
      amount = Number(preview.price_gtq) || 0;
      metadata.client_user_id = user.id;
      metadata.codigo = codigo;
      metadata.nivel = String(preview.nivel || body.membership?.nivel || '');
      returnUrl = buildReturnUrl('/cuenta/membresias?paid=1');
    } else {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 });
    }

    if (!draftId && isSupabaseAdminConfigured) {
      const admin = createSupabaseAdminClient();
      const { data: draft } = await admin
        .from('payment_checkout_drafts')
        .insert({
          kind: body.kind,
          amount_gtq: amount,
          currency,
          status: 'pending',
          metadata,
          client_user_id: metadata.client_user_id || null,
          sucursal_id: metadata.sucursal_id || null,
          payment_provider: 'qpaypro',
        })
        .select('id')
        .single();
      draftId = draft?.id || crypto.randomUUID();
    } else if (!draftId) {
      draftId = crypto.randomUUID();
    }

    const session = await gateway.createSession({
      kind: body.kind,
      amountGtq: amount,
      currency,
      draftId,
      metadata,
      returnUrl,
      cancelUrl: buildReturnUrl('/checkout'),
      customerEmail,
    });

    if (isSupabaseAdminConfigured && body.kind !== 'gift_card') {
      const admin = createSupabaseAdminClient();
      await admin
        .from('payment_checkout_drafts')
        .update({
          session_id: session.sessionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId);
    }

    if (body.kind === 'gift_card' && isSupabaseAdminConfigured) {
      const admin = createSupabaseAdminClient();
      await admin
        .from('gift_card_checkout_drafts')
        .update({
          payment_session_id: session.sessionId,
          payment_provider: 'qpaypro',
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId);
    }

    return NextResponse.json({
      mode: session.mode,
      sessionId: session.sessionId,
      redirectUrl: session.redirectUrl ?? null,
      paymentToken: session.paymentToken ?? null,
      amount,
      currency,
      demo: session.demo,
      draftId,
    });
  } catch (err) {
    console.error('[payments/session]', err);
    return NextResponse.json({ error: 'No se pudo iniciar el pago.' }, { status: 500 });
  }
}
