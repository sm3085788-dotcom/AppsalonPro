-- HOTFIX promos con imagen en chat
-- ═══════════════════════════════════════════════════════════════════════════
-- ORDEN EN SUPABASE SQL EDITOR (Run en cada archivo COMPLETO, uno tras otro):
--   1) supabase-inventario-promociones.sql
--   2) supabase-n8n-chat-automation.sql
--   3) ESTE archivo (supabase-promo-chat-hotfix.sql)
-- Luego: SELECT public.debug_promos_chat_estado();
-- ═══════════════════════════════════════════════════════════════════════════

-- Diagnóstico SIN funciones (podés correr esto aunque falte el hotfix):
-- SELECT p.proname AS funcion
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'n8n_send_promos_chat_reply',
--     'n8n_get_promociones_vigentes_json',
--     'n8n_match_chat_intent',
--     'debug_promos_chat_estado'
--   )
-- ORDER BY 1;

-- ─── 1. Diagnóstico (crear función; el SELECT va DESPUÉS de Run) ───────────
CREATE OR REPLACE FUNCTION public.debug_promos_chat_estado()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fn_promos boolean;
  v_fn_send boolean;
  v_catalogo jsonb;
  v_match jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'n8n_send_promos_chat_reply'
  ) INTO v_fn_promos;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'n8n_get_promociones_vigentes_json'
  ) INTO v_fn_send;

  BEGIN
    v_catalogo := public.n8n_get_promociones_vigentes_json();
  EXCEPTION WHEN OTHERS THEN
    v_catalogo := jsonb_build_object('error', SQLERRM);
  END;

  v_match := public.n8n_match_chat_intent(
    '¿Qué promociones o descuentos tienen vigentes esta semana?'
  );

  RETURN jsonb_build_object(
    'tiene_n8n_send_promos_chat_reply', v_fn_promos,
    'tiene_n8n_get_promociones_vigentes_json', v_fn_send,
    'intencion_promos_detectada', v_match,
    'promos_vigentes_json', coalesce(v_catalogo, '[]'::jsonb),
    'cantidad_promos', CASE
      WHEN jsonb_typeof(v_catalogo) = 'array' THEN jsonb_array_length(v_catalogo)
      ELSE 0
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_promos_chat_estado() TO authenticated, service_role;

-- ─── 2. App Clientes: incluir promo_inventario en RPC (sin filtrar tipos) ───
CREATE OR REPLACE FUNCTION public.client_aura_messages(p_limit integer DEFAULT 30)
RETURNS SETOF public.marketing_direct_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT x.*
  FROM (
    SELECT m.*
    FROM public.marketing_direct_messages m
    INNER JOIN public.clientes c ON c.id = m.client_id
    WHERE c.user_id = auth.uid()
    ORDER BY m.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 500))
  ) x
  ORDER BY x.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.client_aura_messages(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.client_aura_unread_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM marketing_direct_messages m
  INNER JOIN clientes c ON c.id = m.client_id
  WHERE c.user_id = auth.uid()
    AND m.status = 'pending_sync'
    AND m.content_type IN (
      'chat', 'broadcast_promo', 'promo_inventario', 'incident_report', 'cita_confirmacion'
    );
$$;

GRANT EXECUTE ON FUNCTION public.client_aura_unread_count() TO authenticated;

-- ─── 3. Enviar catálogo promos al reclamar (no depende del nodo n8n) ─────────
CREATE OR REPLACE FUNCTION public.n8n_claim_chat_automation(p_queue_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.chat_automation_queue%ROWTYPE;
  v_newer bigint;
  v_intent jsonb;
  v_promo_result jsonb;
  v_is_promo boolean := false;
BEGIN
  PERFORM public.assert_n8n_service_role();

  SELECT * INTO v_q
  FROM public.chat_automation_queue
  WHERE id = p_queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'queue_not_found');
  END IF;

  IF v_q.status IN ('replied', 'skipped', 'failed', 'superseded') THEN
    RETURN jsonb_build_object('ok', false, 'reason', v_q.status, 'queue_id', v_q.id);
  END IF;

  IF v_q.status = 'claimed' AND v_q.claimed_at > now() - interval '2 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed', 'queue_id', v_q.id);
  END IF;

  IF now() < v_q.debounce_until THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'debounce_wait',
      'queue_id', v_q.id,
      'wait_until', v_q.debounce_until
    );
  END IF;

  SELECT q.id INTO v_newer
  FROM public.chat_automation_queue q
  WHERE q.client_id = v_q.client_id
    AND q.status = 'pending'
    AND q.created_at > v_q.created_at
  ORDER BY q.created_at DESC
  LIMIT 1;

  IF v_newer IS NOT NULL THEN
    UPDATE public.chat_automation_queue
    SET status = 'superseded', processed_at = now(), skip_reason = 'newer_pending_exists'
    WHERE id = v_q.id AND status = 'pending';
    RETURN jsonb_build_object('ok', false, 'reason', 'superseded', 'queue_id', v_q.id);
  END IF;

  UPDATE public.chat_automation_queue
  SET status = 'claimed', claimed_at = now()
  WHERE id = v_q.id;

  v_intent := public.n8n_match_chat_intent(v_q.content);
  v_is_promo := coalesce(v_intent->>'n8nIntent', '') = 'chat.promos'
    OR coalesce(v_intent->>'id', '') = 'promos';

  IF v_is_promo THEN
    BEGIN
      v_promo_result := public.n8n_send_promos_chat_reply(v_q.id, 'chat.promos', NULL);
    EXCEPTION WHEN undefined_function THEN
      v_promo_result := jsonb_build_object(
        'ok', false,
        'error', 'missing_n8n_send_promos_chat_reply'
      );
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'queue_id', v_q.id,
    'inbound_message_id', v_q.inbound_message_id,
    'client_id', v_q.client_id,
    'client_name', v_q.client_name,
    'client_phone', v_q.client_phone,
    'content', v_q.content,
    'sucursal_id', v_q.sucursal_id,
    'matched_intent', v_intent,
    'reply_mode', CASE WHEN v_is_promo THEN 'promo_catalog' ELSE 'text' END,
    'promo_catalog_sent', coalesce(v_promo_result->>'ok', 'false') = 'true',
    'promo_send_result', v_promo_result,
    'suggested_reply', CASE
      WHEN v_intent IS NOT NULL THEN public.n8n_build_salon_reply(v_intent->>'n8nIntent', v_q.client_id)
      ELSE public.n8n_build_fallback_chat_reply(v_q.client_id, v_q.content)
    END,
    'recent_messages', (
      SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT id, content, content_type, created_at, created_by_name, media_url, media_kind
        FROM public.marketing_direct_messages
        WHERE client_id = v_q.client_id
        ORDER BY created_at DESC
        LIMIT 8
      ) m
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.n8n_claim_chat_automation(bigint) TO service_role;

-- ─── 4. Forzar catálogo promos en n8n_send_aura_reply (respaldo) ─────────────
CREATE OR REPLACE FUNCTION public.n8n_send_aura_reply(
  p_queue_id bigint,
  p_content text,
  p_n8n_intent text DEFAULT NULL,
  p_created_by_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.chat_automation_queue%ROWTYPE;
  v_settings public.chat_automation_settings%ROWTYPE;
  v_row public.marketing_direct_messages%ROWTYPE;
  v_bot text;
  v_body text;
  v_intent jsonb;
  v_use_promo boolean := false;
BEGIN
  PERFORM public.assert_n8n_service_role();

  SELECT * INTO v_q FROM public.chat_automation_queue WHERE id = p_queue_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'queue_not_found');
  END IF;

  v_intent := public.n8n_match_chat_intent(v_q.content);

  v_use_promo := coalesce(nullif(trim(p_n8n_intent), ''), '') IN ('chat.promos', 'promos')
    OR coalesce(v_intent->>'n8nIntent', '') = 'chat.promos'
    OR coalesce(v_intent->>'id', '') = 'promos'
    OR coalesce(p_content, '') ILIKE '%promociones vigentes%andreas pro%';

  IF v_use_promo THEN
    BEGIN
      RETURN public.n8n_send_promos_chat_reply(p_queue_id, 'chat.promos', p_created_by_name);
    EXCEPTION WHEN undefined_function THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'missing_n8n_send_promos_chat_reply',
        'hint', 'Ejecutá supabase-inventario-promociones.sql completo en Supabase'
      );
    END;
  END IF;

  IF v_q.status = 'replied' AND v_q.reply_message_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_replied', true,
      'reply_message_id', v_q.reply_message_id,
      'mode', 'promo_catalog_or_text'
    );
  END IF;

  IF v_q.status = 'superseded' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'superseded');
  END IF;

  v_body := coalesce(nullif(trim(p_content), ''), '');
  IF v_body = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'empty_content');
  END IF;

  SELECT * INTO v_settings FROM public.chat_automation_settings WHERE id = 1;
  v_bot := coalesce(nullif(trim(p_created_by_name), ''), v_settings.bot_display_name, 'Andreas Pro');

  INSERT INTO public.marketing_direct_messages (
    client_id, client_name, client_phone, content, content_type, status, created_by, created_by_name
  )
  VALUES (
    v_q.client_id, coalesce(v_q.client_name, 'Cliente'), v_q.client_phone,
    v_body, 'chat', 'pending_sync', NULL, v_bot
  )
  RETURNING * INTO v_row;

  UPDATE public.chat_automation_queue
  SET status = 'replied', n8n_intent = p_n8n_intent, reply_message_id = v_row.id, processed_at = now()
  WHERE id = p_queue_id;

  PERFORM public.notify_client_from_mdm_message(v_row.id);

  RETURN jsonb_build_object(
    'ok', true,
    'reply_message_id', v_row.id,
    'queue_id', p_queue_id,
    'client_id', v_q.client_id,
    'mode', 'text'
  );
END;
$$;

-- ─── 5. Verificar que el hotfix quedó aplicado en Supabase ───────────────────
CREATE OR REPLACE FUNCTION public.debug_verificar_promo_chat_sql()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim text;
  v_send text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_claim
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'n8n_claim_chat_automation'
  ORDER BY p.oid DESC
  LIMIT 1;

  SELECT pg_get_functiondef(p.oid) INTO v_send
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'n8n_send_aura_reply'
  ORDER BY p.oid DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'claim_auto_envio_promos', coalesce(position('n8n_send_promos_chat_reply' in coalesce(v_claim, '')), 0) > 0,
    'send_aura_redirect_promos', coalesce(position('v_use_promo' in coalesce(v_send, '')), 0) > 0,
    'client_aura_sin_filtro_tipo', coalesce((
      SELECT position('content_type IN' in pg_get_functiondef(p.oid)) = 0
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'client_aura_messages'
      LIMIT 1
    ), false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_verificar_promo_chat_sql() TO authenticated, service_role;

-- ─── 6. Prueba directa: enviar tarjetas promo sin n8n (diagnóstico) ───────────
-- Usá el id del mensaje ENTRANTE del cliente (ej. 324):
--   SELECT public.debug_emitir_promos_chat(324);
CREATE OR REPLACE FUNCTION public.debug_emitir_promos_chat(p_inbound_message_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_in public.marketing_direct_messages%ROWTYPE;
  v_settings public.chat_automation_settings%ROWTYPE;
  v_bot text;
  v_items jsonb;
  v_item jsonb;
  v_intro_id bigint;
  v_count int := 0;
  v_body text;
  v_img text;
  v_row public.marketing_direct_messages%ROWTYPE;
BEGIN
  SELECT * INTO v_in FROM public.marketing_direct_messages WHERE id = p_inbound_message_id;
  IF NOT FOUND OR v_in.client_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inbound_not_found');
  END IF;

  SELECT * INTO v_settings FROM public.chat_automation_settings WHERE id = 1;
  v_bot := coalesce(v_settings.bot_display_name, 'Andreas Pro');
  v_items := public.n8n_get_promociones_vigentes_json();

  IF jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sin_promos_vigentes', 'cantidad', 0);
  END IF;

  v_body := '¡Hola! Estas son las promociones vigentes en Andreas Pro (cada una con foto y precio):';
  INSERT INTO public.marketing_direct_messages (
    client_id, client_name, client_phone, content, content_type, status, created_by, created_by_name
  )
  VALUES (
    v_in.client_id, coalesce(v_in.client_name, 'Cliente'), v_in.client_phone,
    v_body, 'chat', 'pending_sync', NULL, v_bot
  )
  RETURNING id INTO v_intro_id;
  v_count := 1;
  PERFORM public.notify_client_from_mdm_message(v_intro_id);

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items)
  LOOP
    v_body := v_item::text;
    v_img := coalesce(nullif(trim(v_item->>'imagenUrl'), ''), NULL);
    INSERT INTO public.marketing_direct_messages (
      client_id, client_name, client_phone, content, content_type,
      media_url, media_kind, status, created_by, created_by_name
    )
    VALUES (
      v_in.client_id, coalesce(v_in.client_name, 'Cliente'), v_in.client_phone,
      v_body, 'promo_inventario',
      v_img, CASE WHEN v_img IS NOT NULL THEN 'image' ELSE NULL END,
      'pending_sync', NULL, v_bot
    )
    RETURNING * INTO v_row;
    v_count := v_count + 1;
    PERFORM public.notify_client_from_mdm_message(v_row.id);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'intro_message_id', v_intro_id,
    'promo_messages_sent', v_count,
    'client_id', v_in.client_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_emitir_promos_chat(bigint) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Verificación:
-- SELECT public.debug_verificar_promo_chat_sql();
-- SELECT public.debug_promos_chat_estado();
-- SELECT public.debug_emitir_promos_chat(324);  -- prueba directa sin n8n
--
-- Luego en app Clientes recargá Mensajes y ejecutá:
-- SELECT id, content_type, left(content, 60), media_url IS NOT NULL AS tiene_foto
-- FROM public.marketing_direct_messages ORDER BY id DESC LIMIT 10;
