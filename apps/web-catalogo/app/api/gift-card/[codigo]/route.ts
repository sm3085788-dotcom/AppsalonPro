import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeGiftCardCode } from '@/lib/gift-card/public';

type RouteContext = { params: Promise<{ codigo: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { codigo: raw } = await context.params;
  const codigo = normalizeGiftCardCode(raw);
  if (!codigo) {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('lookup_gift_card_public', {
      p_codigo: codigo,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.ok) {
      return NextResponse.json({ error: data?.error || 'No encontrada.' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[gift-card/codigo]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
