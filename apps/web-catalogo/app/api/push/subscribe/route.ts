import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getVapidPublicKey } from '@/lib/push/vapid';
import { isSupabaseConfigured } from '@/lib/env';

export async function GET() {
  const publicKey = getVapidPublicKey();
  return NextResponse.json({
    ok: Boolean(publicKey),
    publicKey: publicKey || null,
  });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, error: 'Supabase no configurado.' }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Debes iniciar sesión.' }, { status: 401 });
  }

  let body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido.' }, { status: 400 });
  }

  const endpoint = String(body.endpoint || '').trim();
  const p256dh = String(body.keys?.p256dh || '').trim();
  const auth = String(body.keys?.auth || '').trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { ok: false, error: 'Suscripción incompleta (endpoint/keys).' },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 280) || null;

  const { error } = await supabase.from('web_push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, error: 'Supabase no configurado.' }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Debes iniciar sesión.' }, { status: 401 });
  }

  let endpoint = '';
  try {
    const body = await req.json();
    endpoint = String(body?.endpoint || '').trim();
  } catch {
    /* optional body */
  }

  let query = supabase.from('web_push_subscriptions').delete().eq('user_id', user.id);
  if (endpoint) query = query.eq('endpoint', endpoint);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
