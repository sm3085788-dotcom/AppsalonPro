import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { isSupabaseAdminConfigured } from '@/lib/env';

/** Cron Vercel: expira citas sin visita tras vencer su ventana. */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = request.headers.get('authorization')?.trim();

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSupabaseAdminConfigured) {
      return NextResponse.json(
        { error: 'Supabase service role no configurado.' },
        { status: 503 },
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('expire_citas_sin_asistencia');

    if (error) {
      console.error('[cron/expire-citas]', error);
      return NextResponse.json(
        { error: error.message || 'RPC expire_citas_sin_asistencia falló.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, expired: Number(data) || 0 });
  } catch (err) {
    console.error('[cron/expire-citas]', err);
    return NextResponse.json({ error: 'Error inesperado en cron.' }, { status: 500 });
  }
}
