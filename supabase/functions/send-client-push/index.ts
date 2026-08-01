import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function webPushTargetUrl(tipo: string | null, targetScreen: string | null): string {
  const site = (Deno.env.get('SITE_URL') || Deno.env.get('NEXT_PUBLIC_SITE_URL') || '').replace(
    /\/$/,
    '',
  );
  const path =
    tipo === 'cita' || targetScreen === 'mensajes' || targetScreen === 'citas'
      ? '/cuenta?tab=citas'
      : tipo === 'pedido' || targetScreen === 'mis_pedidos'
        ? '/cuenta?tab=pedidos'
        : '/cuenta';
  return site ? `${site}${path}` : path;
}

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
    let expoJson = null;
    if (pushTokens.length) {
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
      expoJson = await expoRes.json();
    }

    // Web Push (PWA / navegador)
    let webSent = 0;
    let webGone = 0;
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:contacto@appsalon.pro';

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

      const { data: webSubs } = await supabase
        .from('web_push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', notif.client_user_id);

      const payload = JSON.stringify({
        title: notif.titulo,
        body: notif.mensaje,
        url: webPushTargetUrl(notif.tipo, notif.target_screen),
        tipo: notif.tipo,
        notification_id: notif.id,
      });

      for (const row of webSubs || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            payload,
          );
          webSent += 1;
        } catch (err) {
          const statusCode = Number((err as { statusCode?: number })?.statusCode || 0);
          if (statusCode === 404 || statusCode === 410) {
            webGone += 1;
            await supabase.from('web_push_subscriptions').delete().eq('id', row.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        sent_expo: pushTokens.length,
        sent_web: webSent,
        gone_web: webGone,
        expo: expoJson,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
