-- Andreas Pro — Diagnóstico notificaciones App Clientes
-- Supabase SQL Editor → Run (solo lectura; no modifica datos)

-- ─── A) Tablas requeridas ───────────────────────────────────────────────────

SELECT
  'TABLA' AS tipo,
  t.nombre AS nombre,
  CASE WHEN pg.oid IS NOT NULL THEN 'OK' ELSE 'FALTA → supabase-client-notifications.sql' END AS estado
FROM (
  VALUES
    ('client_notifications'),
    ('push_device_tokens'),
    ('client_notif_prefs'),
    ('marketing_direct_messages'),
    ('clientes')
) AS t(nombre)
LEFT JOIN pg_class pg ON pg.relname = t.nombre
  AND pg.relnamespace = 'public'::regnamespace
  AND pg.relkind = 'r'
ORDER BY t.nombre;

-- ─── B) Funciones RPC / trigger ─────────────────────────────────────────────

SELECT
  'FUNCION' AS tipo,
  f.nombre,
  CASE WHEN p.oid IS NOT NULL THEN 'OK' ELSE 'FALTA → supabase-client-notifications-patch.sql' END AS estado
FROM (
  VALUES
    ('enqueue_client_notification'),
    ('notify_client_from_mdm_message'),
    ('client_notif_pref_enabled'),
    ('client_aura_unread_count'),
    ('client_aura_messages')
) AS f(nombre)
LEFT JOIN pg_proc p ON p.proname = f.nombre
  AND p.pronamespace = 'public'::regnamespace
ORDER BY f.nombre;

-- ─── C) Trigger INSERT en marketing_direct_messages ─────────────────────────

SELECT
  'TRIGGER' AS tipo,
  COALESCE(tr.tgname, 'mdm_notify_client_ins') AS nombre,
  CASE
    WHEN tr.oid IS NOT NULL THEN 'OK'
    ELSE 'FALTA → supabase-client-notifications-patch.sql'
  END AS estado
FROM (SELECT 1) x
LEFT JOIN pg_trigger tr ON tr.tgname = 'mdm_notify_client_ins'
LEFT JOIN pg_class c ON c.oid = tr.tgrelid AND c.relname = 'marketing_direct_messages';

-- ─── D) Realtime (supabase_realtime) ────────────────────────────────────────

SELECT
  'REALTIME' AS tipo,
  t.tabla AS nombre,
  CASE
    WHEN pt.tablename IS NOT NULL THEN 'OK'
    ELSE 'FALTA → Database → Replication → activar tabla'
  END AS estado
FROM (VALUES ('client_notifications'), ('marketing_direct_messages')) AS t(tabla)
LEFT JOIN pg_publication_tables pt
  ON pt.pubname = 'supabase_realtime'
  AND pt.schemaname = 'public'
  AND pt.tablename = t.tabla;

-- ─── E) Clientes con mensajes pero sin user_id ──────────────────────────────

SELECT
  'CLIENTE_SIN_APP' AS tipo,
  c.id::text AS nombre,
  format('%s · %s msgs', COALESCE(c.nombre, '?'), COUNT(m.id)) AS detalle,
  'Vincular clientes.user_id = auth.users.id' AS estado
FROM public.clientes c
JOIN public.marketing_direct_messages m ON m.client_id = c.id
WHERE c.user_id IS NULL
  AND m.content_type IN ('chat', 'cita_confirmacion', 'broadcast_promo', 'incident_report')
GROUP BY c.id, c.nombre
ORDER BY COUNT(m.id) DESC
LIMIT 15;

-- ─── F) Últimos mensajes vs notificación encolada ───────────────────────────

SELECT
  'MENSAJE' AS tipo,
  m.id::text AS nombre,
  format(
    '%s · %s · %s',
    m.content_type,
    COALESCE(c.nombre, 'sin cliente'),
    CASE WHEN c.user_id IS NULL THEN 'sin user_id' ELSE 'user_id OK' END
  ) AS detalle,
  CASE
    WHEN cn.id IS NOT NULL THEN 'OK → notif #' || cn.id::text
    WHEN c.user_id IS NULL THEN 'Sin cuenta App (user_id null)'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'notify_client_from_mdm_message'
    ) THEN 'RPC no instalada'
    ELSE 'No encoló → ejecutá patch y reenviá mensaje'
  END AS estado
FROM public.marketing_direct_messages m
LEFT JOIN public.clientes c ON c.id = m.client_id
LEFT JOIN public.client_notifications cn
  ON cn.target_id = m.id::text
  AND cn.client_user_id IS NOT DISTINCT FROM c.user_id
WHERE m.content_type IN ('chat', 'cita_confirmacion', 'broadcast_promo', 'incident_report')
ORDER BY m.created_at DESC
LIMIT 12;

-- ─── G) Tokens push (dispositivos) ──────────────────────────────────────────

SELECT
  'PUSH_TOKEN' AS tipo,
  user_id::text AS nombre,
  format('%s · %s', platform, left(expo_push_token, 20) || '…') AS detalle,
  'OK' AS estado
FROM public.push_device_tokens
WHERE app_slug = 'clientes'
ORDER BY updated_at DESC
LIMIT 8;

-- ─── H) Preferencias que bloquean encolado ──────────────────────────────────

SELECT
  'PREF' AS tipo,
  user_id::text AS nombre,
  format(
    'mensajes=%s · agenda=%s · pedidos=%s',
    COALESCE(prefs->>'mensajes', 'default'),
    COALESCE(prefs->>'cambiosAgenda', 'default'),
    COALESCE(prefs->>'pedidos', 'default')
  ) AS detalle,
  CASE
    WHEN lower(COALESCE(prefs->>'mensajes', 'true')) IN ('false', '0') THEN 'mensajes OFF'
    WHEN lower(COALESCE(prefs->>'cambiosAgenda', 'true')) IN ('false', '0') THEN 'citas OFF'
    ELSE 'OK'
  END AS estado
FROM public.client_notif_prefs
ORDER BY updated_at DESC
LIMIT 8;

-- ─── I) Conteo rápido ───────────────────────────────────────────────────────

SELECT
  'RESUMEN' AS tipo,
  'client_notifications' AS nombre,
  count(*)::text AS detalle,
  CASE WHEN count(*) > 0 THEN 'OK hay filas' ELSE 'VACÍA' END AS estado
FROM public.client_notifications
UNION ALL
SELECT 'RESUMEN', 'push_device_tokens', count(*)::text,
  CASE WHEN count(*) > 0 THEN 'OK' ELSE 'Sin tokens' END
FROM public.push_device_tokens WHERE app_slug = 'clientes';

-- ─── J) PRUEBA MANUAL (opcional) ────────────────────────────────────────────
-- Descomentá el bloque, Run, y revisá client_notifications:

/*
SELECT public.notify_client_from_mdm_message(
  (SELECT id FROM marketing_direct_messages
   WHERE content_type = 'cita_confirmacion'
   ORDER BY created_at DESC LIMIT 1)
);

SELECT id, tipo, titulo, leida, created_at
FROM client_notifications
ORDER BY created_at DESC
LIMIT 5;
*/
