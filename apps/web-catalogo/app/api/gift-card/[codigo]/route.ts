import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizeGiftCardCode } from '@/lib/gift-card/public';
import { env, isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';

type RouteContext = { params: Promise<{ codigo: string }> };

function createGiftCardLookupClient() {
  if (isSupabaseAdminConfigured) {
    return createSupabaseAdminClient();
  }
  if (!isSupabaseConfigured) {
    throw new Error('Supabase no configurado.');
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { codigo: raw } = await context.params;
  const codigo = normalizeGiftCardCode(raw);
  if (!codigo) {
    return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Servidor no configurado.' }, { status: 503 });
  }

  try {
    const supabase = createGiftCardLookupClient();
    const { data, error } = await supabase.rpc('lookup_gift_card_public', {
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
