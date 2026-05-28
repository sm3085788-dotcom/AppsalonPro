import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const { notification_id: notificationId } = await req.json();
    if (!notificationId) {
      return new Response(JSON.stringify({ error: 'notification_id required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: notif, error: nErr } = await supabase
      .from('client_notifications')
      .select('id, client_user_id, titulo, mensaje, target_screen, target_id, tipo')
      .eq('id', notificationId)
      .maybeSingle();

    if (nErr || !notif) {
      return new Response(JSON.stringify({ error: nErr?.message || 'not found' }), { status: 404 });
    }

    const { data: tokens } = await supabase
      .from('push_device_tokens')
      .select('expo_push_token')
      .eq('user_id', notif.client_user_id)
      .eq('app_slug', 'clientes');

    const pushTokens = (tokens || []).map((t) => t.expo_push_token).filter(Boolean);
    if (!pushTokens.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), { status: 200 });
    }

    const messages = pushTokens.map((to) => ({
      to,
      sound: 'default',
      title: notif.titulo,
      body: notif.mensaje,
      data: {
        notification_id: notif.id,
        target_screen: notif.target_screen,
        target_id: notif.target_id,
        tipo: notif.tipo,
      },
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(Deno.env.get('EXPO_ACCESS_TOKEN')
          ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` }
          : {}),
      },
      body: JSON.stringify(messages),
    });

    const expoJson = await expoRes.json();
    return new Response(JSON.stringify({ sent: pushTokens.length, expo: expoJson }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
