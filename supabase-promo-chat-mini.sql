-- MINI HOTFIX — promos con imagen en chat (ejecutar TODO de una vez: Ctrl+A → Run)
-- No corras solo el SELECT al final; primero debe ejecutarse este archivo completo.

-- 1) App Clientes: traer todos los tipos de mensaje (incluye promo_inventario)
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

-- 2) Verificar si el hotfix grande ya está aplicado
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
    'send_aura_inline_tarjetas', coalesce(position('promo_chat_emit_inventario_cards' in coalesce(v_send, '')), 0) > 0,
    'trigger_promo_autofill', EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = 'marketing_direct_messages' AND t.tgname = 'mdm_promo_intro_autofill_trg'
    ),
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

-- 2b) Insertar tarjetas promo_inventario (compartido: n8n, trigger, debug)
CREATE OR REPLACE FUNCTION public.promo_chat_emit_inventario_cards(
  p_client_id uuid,
  p_client_name text,
  p_client_phone text,
  p_bot_name text,
  p_after_intro_id bigint DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_body text;
  v_img text;
  v_row public.marketing_direct_messages%ROWTYPE;
  v_count int := 0;
BEGIN
  IF p_client_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_after_intro_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.marketing_direct_messages m
    WHERE m.client_id = p_client_id
      AND m.content_type = 'promo_inventario'
      AND m.id > p_after_intro_id
  ) THEN
    RETURN 0;
  END IF;

  v_items := public.n8n_get_promociones_vigentes_json();
  IF jsonb_array_length(v_items) = 0 THEN
    RETURN 0;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items)
  LOOP
    v_body := v_item::text;
    v_img := coalesce(nullif(trim(v_item->>'imagenUrl'), ''), NULL);
    INSERT INTO public.marketing_direct_messages (
      client_id, client_name, client_phone, content, content_type,
      media_url, media_kind, status, created_by, created_by_name
    )
    VALUES (
      p_client_id, coalesce(nullif(trim(p_client_name), ''), 'Cliente'), p_client_phone,
      v_body, 'promo_inventario',
      v_img, CASE WHEN v_img IS NOT NULL THEN 'image' ELSE NULL END,
      'pending_sync', NULL, coalesce(nullif(trim(p_bot_name), ''), 'Andreas Pro')
    )
    RETURNING * INTO v_row;
    v_count := v_count + 1;
    PERFORM public.notify_client_from_mdm_message(v_row.id);
  END LOOP;

  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'promo_chat_emit_inventario_cards: %', SQLERRM;
  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promo_chat_emit_inventario_cards(uuid, text, text, text, bigint) TO service_role;

-- 3) Enviar tarjetas promo manualmente (prueba sin n8n)
--    SELECT public.debug_emitir_promos_chat(NULL);  -- último mensaje del cliente
--    SELECT public.debug_emitir_promos_chat(324);   -- id concreto
--    SELECT public.debug_list_promo_chat_candidatos();
CREATE OR REPLACE FUNCTION public.debug_list_promo_chat_candidatos(p_limit integer DEFAULT 15)
RETURNS TABLE(
  id bigint,
  client_id uuid,
  client_name text,
  es_cliente boolean,
  content_preview text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.client_id,
    m.client_name,
    EXISTS (
      SELECT 1 FROM public.clientes c
      WHERE c.id = m.client_id
        AND c.user_id IS NOT NULL
        AND m.created_by = c.user_id
    ) AS es_cliente,
    left(coalesce(m.content, ''), 80) AS content_preview,
    m.created_at
  FROM public.marketing_direct_messages m
  WHERE m.content_type = 'chat'
  ORDER BY m.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 15), 50));
$$;

GRANT EXECUTE ON FUNCTION public.debug_list_promo_chat_candidatos(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.debug_emitir_promos_chat(p_inbound_message_id bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_in public.marketing_direct_messages%ROWTYPE;
  v_settings public.chat_automation_settings%ROWTYPE;
  v_bot text;
  v_intro_id bigint;
  v_cards int;
  v_body text;
BEGIN
  v_in := NULL;

  IF p_inbound_message_id IS NOT NULL THEN
    SELECT * INTO v_in
    FROM public.marketing_direct_messages
    WHERE id = p_inbound_message_id;
  END IF;

  IF v_in.id IS NULL OR v_in.client_id IS NULL THEN
    SELECT m.* INTO v_in
    FROM public.marketing_direct_messages m
    INNER JOIN public.clientes c ON c.id = m.client_id
    WHERE m.content_type = 'chat'
      AND m.created_by IS NOT NULL
      AND m.created_by = c.user_id
      AND (
        public.n8n_match_chat_intent(m.content)->>'id' = 'promos'
        OR m.content ILIKE '%promocion%'
        OR m.content ILIKE '%promo%'
        OR m.content ILIKE '%descuento%'
      )
    ORDER BY m.created_at DESC
    LIMIT 1;
  END IF;

  IF v_in.id IS NULL OR v_in.client_id IS NULL THEN
    SELECT m.* INTO v_in
    FROM public.marketing_direct_messages m
    INNER JOIN public.clientes c ON c.id = m.client_id
    WHERE m.content_type = 'chat'
      AND m.created_by IS NOT NULL
      AND m.created_by = c.user_id
    ORDER BY m.created_at DESC
    LIMIT 1;
  END IF;

  IF v_in.id IS NULL OR v_in.client_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'inbound_not_found',
      'hint', 'Ejecutá SELECT public.debug_list_promo_chat_candidatos(); y usá un id con es_cliente = true'
    );
  END IF;

  SELECT * INTO v_settings FROM public.chat_automation_settings WHERE id = 1;
  v_bot := coalesce(v_settings.bot_display_name, 'Andreas Pro');

  IF jsonb_array_length(public.n8n_get_promociones_vigentes_json()) = 0 THEN
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
  PERFORM public.notify_client_from_mdm_message(v_intro_id);

  v_cards := public.promo_chat_emit_inventario_cards(
    v_in.client_id, v_in.client_name, v_in.client_phone, v_bot, v_intro_id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'intro_message_id', v_intro_id,
    'promo_messages_sent', 1 + v_cards,
    'client_id', v_in.client_id,
    'inbound_message_id', v_in.id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_emitir_promos_chat(bigint) TO authenticated, service_role;

-- 4) Automatización n8n: enviar catálogo al reclamar (fix respuesta solo texto)
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

-- 5) Respaldo: si n8n llama send_aura_reply, redirigir a catálogo promos
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
        'error', 'missing_n8n_send_promos_chat_reply'
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

  IF v_body ILIKE '%promociones vigentes%andreas pro%' THEN
    PERFORM public.promo_chat_emit_inventario_cards(
      v_q.client_id,
      coalesce(v_q.client_name, 'Cliente'),
      v_q.client_phone,
      v_bot,
      v_row.id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reply_message_id', v_row.id,
    'queue_id', p_queue_id,
    'client_id', v_q.client_id,
    'mode', 'text'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.n8n_send_aura_reply(bigint, text, text, text) TO service_role;

-- 6) Red de seguridad: si el bot manda solo el intro de promos (sin tarjetas), completar al commit
CREATE OR REPLACE FUNCTION public.mdm_promo_intro_autofill_cards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot text;
  v_cards int;
BEGIN
  IF NEW.content_type <> 'chat' OR NEW.created_by IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF coalesce(NEW.content, '') NOT ILIKE '%promociones vigentes%andreas pro%' THEN
    RETURN NEW;
  END IF;

  v_bot := coalesce(nullif(trim(NEW.created_by_name), ''), 'Andreas Pro');
  v_cards := public.promo_chat_emit_inventario_cards(
    NEW.client_id, NEW.client_name, NEW.client_phone, v_bot, NEW.id
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'mdm_promo_intro_autofill_cards: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mdm_promo_intro_autofill_trg ON public.marketing_direct_messages;
CREATE CONSTRAINT TRIGGER mdm_promo_intro_autofill_trg
  AFTER INSERT ON public.marketing_direct_messages
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.mdm_promo_intro_autofill_cards();

NOTIFY pgrst, 'reload schema';

-- Después de Run, verificá:
-- SELECT public.debug_verificar_promo_chat_sql();
-- Preguntá promos en el chat. Tras el intro deberían aparecer promo_inventario automáticamente.
