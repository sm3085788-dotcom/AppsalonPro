import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { env, isSupabaseAdminConfigured, isSupabaseConfigured } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { codigo?: string };
    const codigo = String(body?.codigo || '').trim().toUpperCase();

    if (!codigo) {
      return NextResponse.json({ error: 'Ingresa el código de activación.' }, { status: 400 });
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: 'Servidor no configurado.' }, { status: 503 });
    }

    const supabase = isSupabaseAdminConfigured
      ? createSupabaseAdminClient()
      : createClient(env.supabaseUrl, env.supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

    const { data, error } = await supabase.rpc('redeem_gift_card_activation_code', {
      p_codigo_activacion: codigo,
    });

    if (error) {
      console.error('[gift-card/activate]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.ok) {
      return NextResponse.json({ error: data?.error || 'No se pudo activar.' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      already_redeemed: Boolean(data.already_redeemed),
      codigo: data.codigo,
      redirectTo: `/tarjeta-regalo/exito/${encodeURIComponent(String(data.codigo))}`,
      card: {
        codigo: data.codigo,
        monto_inicial: data.monto,
        para_nombre: data.para_nombre,
        de_nombre: data.de_nombre,
        mensaje: data.mensaje ?? null,
        emitida_en: data.emitida_en,
        vence_en: data.vence_en,
      },
    });
  } catch (err) {
    console.error('[gift-card/activate]', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
