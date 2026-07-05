import { NextResponse, type NextRequest } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { toMinorUnits } from '@/lib/format';
import type { GiftCardPaymentIntentResult } from '@/lib/types/db';
import { validateGiftCardPayload, type GiftCardFormInput } from '@/lib/gift-card/validation';

/** Guest checkout — tarjeta regalo VIP sin cuenta. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GiftCardFormInput;
    const validated = validateGiftCardPayload(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const { monto, paraNombre, deNombre, mensaje, compradorEmail } =
      validated.payload;

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
      })
      .select('id')
      .single();

    if (draftErr || !draft) {
      console.error('[gift-card/payment-intent] draft', draftErr);
      return NextResponse.json(
        { error: 'No se pudo preparar la tarjeta. ¿Ejecutaste supabase-gift-cards.sql?' },
        { status: 500 },
      );
    }

    const currency = env.stripeCurrency;
    const stripe = getStripe();
    const metadata = {
      kind: 'gift_card',
      draft_id: draft.id,
      comprador_email: compradorEmail.slice(0, 200),
      para_nombre: paraNombre.slice(0, 120),
      de_nombre: deNombre.slice(0, 120),
      monto_gtq: String(monto),
    };

    if (!stripe) {
      const demo: GiftCardPaymentIntentResult = {
        clientSecret: null,
        amount: monto,
        currency,
        demo: true,
        paymentIntentId: null,
        draftId: draft.id,
      };
      return NextResponse.json(demo);
    }

    const intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(monto),
      currency,
      automatic_payment_methods: { enabled: true },
      receipt_email: compradorEmail,
      metadata,
    });

    await admin
      .from('gift_card_checkout_drafts')
      .update({
        payment_intent_id: intent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draft.id);

    const result: GiftCardPaymentIntentResult = {
      clientSecret: intent.client_secret,
      amount: monto,
      currency,
      demo: false,
      paymentIntentId: intent.id,
      draftId: draft.id,
    };
    return NextResponse.json(result);
  } catch (err) {
    console.error('[gift-card/payment-intent]', err);
    return NextResponse.json(
      { error: 'No se pudo iniciar el pago.' },
      { status: 500 },
    );
  }
}
