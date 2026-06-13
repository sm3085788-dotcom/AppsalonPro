-- PARCHE DEFINITIVO: tarjetas promo_inventario en chat
-- Ejecutá TODO (Ctrl+A → Run). Luego:
--   SELECT public.debug_probar_emit_promos();
--   Preguntá promos en el chat y revisá marketing_direct_messages.

-- ─── 1. Función que inserta las tarjetas ───────────────────────────────────
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
    RAISE WARNING 'promo_chat_emit: client_id null';
    RETURN 0;
  END IF;

  IF p_after_intro_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.marketing_direct_messages m
    WHERE m.client_id = p_client_id
      AND m.content_type = 'promo_inventario'
      AND m.id > p_after_intro_id
  ) THEN
    RETURN 0;
  END IF;

  v_items := public.n8n_get_promociones_vigentes_json();
  IF jsonb_array_length(v_items) = 0 THEN
    RAISE WARNING 'promo_chat_emit: sin promos vigentes en inventario';
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
      p_client_id,
      coalesce(nullif(trim(p_client_name), ''), 'Cliente'),
      p_client_phone,
      v_body,
      'promo_inventario',
      v_img,
      CASE WHEN v_img IS NOT NULL THEN 'image' ELSE NULL END,
      'pending_sync',
      NULL,
      coalesce(nullif(trim(p_bot_name), ''), 'Andreas Pro')
    )
    RETURNING * INTO v_row;
    v_count := v_count + 1;
    BEGIN
      PERFORM public.notify_client_from_mdm_message(v_row.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'promo_chat_emit notify id=%: %', v_row.id, SQLERRM;
    END;
  END LOOP;

  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'promo_chat_emit_inventario_cards: %', SQLERRM;
  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promo_chat_emit_inventario_cards(uuid, text, text, text, bigint) TO service_role;

-- ─── 2. Trigger INMEDIATO (más confiable que deferred en Supabase) ─────────
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
  IF TG_OP <> 'INSERT' OR NEW.content_type <> 'chat' THEN
    RETURN NEW;
  END IF;
  IF NEW.created_by IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF coalesce(NEW.content, '') NOT ILIKE '%promociones vigentes%' THEN
    RETURN NEW;
  END IF;

  v_bot := coalesce(nullif(trim(NEW.created_by_name), ''), 'Andreas Pro');
  v_cards := public.promo_chat_emit_inventario_cards(
    NEW.client_id, NEW.client_name, NEW.client_phone, v_bot, NEW.id
  );
  RAISE LOG 'mdm_promo_intro_autofill: intro_id=% cards=%', NEW.id, v_cards;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mdm_promo_intro_autofill_trg ON public.marketing_direct_messages;
CREATE TRIGGER mdm_promo_intro_autofill_trg
  AFTER INSERT ON public.marketing_direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.mdm_promo_intro_autofill_cards();

-- ─── 3. n8n: tras intro de promos, emitir tarjetas en la misma RPC ───────────
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
  v_cards int := 0;
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
    OR coalesce(p_content, '') ILIKE '%promociones vigentes%';

  IF v_use_promo THEN
    BEGIN
      RETURN public.n8n_send_promos_chat_reply(p_queue_id, 'chat.promos', p_created_by_name);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END IF;

  IF v_q.status = 'replied' AND v_q.reply_message_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 'already_replied', true,
      'reply_message_id', v_q.reply_message_id
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
    client_id, client_name, client_phone, content, content_type,
    status, created_by, created_by_name
  )
  VALUES (
    v_q.client_id, coalesce(v_q.client_name, 'Cliente'), v_q.client_phone,
    v_body, 'chat', 'pending_sync', NULL, v_bot
  )
  RETURNING * INTO v_row;

  UPDATE public.chat_automation_queue
  SET status = 'replied', n8n_intent = p_n8n_intent,
      reply_message_id = v_row.id, processed_at = now()
  WHERE id = p_queue_id;

  PERFORM public.notify_client_from_mdm_message(v_row.id);

  IF v_body ILIKE '%promociones vigentes%' THEN
    v_cards := public.promo_chat_emit_inventario_cards(
      v_q.client_id, coalesce(v_q.client_name, 'Cliente'),
      v_q.client_phone, v_bot, v_row.id
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'reply_message_id', v_row.id,
    'promo_cards_emitted', v_cards,
    'queue_id', p_queue_id,
    'client_id', v_q.client_id,
    'mode', 'text'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.n8n_send_aura_reply(bigint, text, text, text) TO service_role;

-- ─── 4. Catálogo n8n: intro + tarjetas vía emit (sin loop duplicado) ─────────
CREATE OR REPLACE FUNCTION public.n8n_send_promos_chat_reply(
  p_queue_id bigint,
  p_n8n_intent text DEFAULT 'chat.promos',
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
  v_intro public.marketing_direct_messages%ROWTYPE;
  v_bot text;
  v_body text;
  v_items jsonb;
  v_cards int := 0;
  v_count int := 0;
BEGIN
  PERFORM public.assert_n8n_service_role();

  SELECT * INTO v_q FROM public.chat_automation_queue WHERE id = p_queue_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'queue_not_found');
  END IF;

  IF v_q.status = 'replied' AND v_q.reply_message_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_replied', true, 'reply_message_id', v_q.reply_message_id);
  END IF;

  IF v_q.status = 'superseded' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'superseded');
  END IF;

  SELECT * INTO v_settings FROM public.chat_automation_settings WHERE id = 1;
  v_bot := coalesce(nullif(trim(p_created_by_name), ''), v_settings.bot_display_name, 'Andreas Pro');
  v_items := public.n8n_get_promociones_vigentes_json();

  IF jsonb_array_length(v_items) = 0 THEN
    v_body := 'Por ahora no hay promociones activas en el catálogo. Consultá la tienda en App Clientes.';
  ELSE
    v_body := '¡Hola! Estas son las promociones vigentes en Andreas Pro (cada una con foto y precio):';
  END IF;

  INSERT INTO public.marketing_direct_messages (
    client_id, client_name, client_phone, content, content_type,
    status, created_by, created_by_name
  )
  VALUES (
    v_q.client_id, coalesce(v_q.client_name, 'Cliente'), v_q.client_phone,
    v_body, 'chat', 'pending_sync', NULL, v_bot
  )
  RETURNING * INTO v_intro;

  v_count := 1;
  PERFORM public.notify_client_from_mdm_message(v_intro.id);

  IF jsonb_array_length(v_items) > 0 THEN
    v_cards := public.promo_chat_emit_inventario_cards(
      v_q.client_id, coalesce(v_q.client_name, 'Cliente'),
      v_q.client_phone, v_bot, v_intro.id
    );
    v_count := v_count + v_cards;
  END IF;

  UPDATE public.chat_automation_queue
  SET status = 'replied',
      n8n_intent = coalesce(nullif(trim(p_n8n_intent), ''), 'chat.promos'),
      reply_message_id = v_intro.id,
      processed_at = now()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reply_message_id', v_intro.id,
    'promo_messages_sent', v_count,
    'promo_cards_emitted', v_cards,
    'queue_id', p_queue_id,
    'client_id', v_q.client_id
  );
END;
$$;

-- ─── 5. Prueba en 1 clic ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.debug_probar_emit_promos()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intro public.marketing_direct_messages%ROWTYPE;
  v_cards int;
  v_catalogo jsonb;
BEGIN
  v_catalogo := public.n8n_get_promociones_vigentes_json();

  SELECT * INTO v_intro
  FROM public.marketing_direct_messages
  WHERE content_type = 'chat'
    AND content ILIKE '%promociones vigentes%'
    AND created_by IS NULL
  ORDER BY id DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'sin_intro_bot',
      'promos_inventario', v_catalogo,
      'cantidad_promos', jsonb_array_length(v_catalogo)
    );
  END IF;

  v_cards := public.promo_chat_emit_inventario_cards(
    v_intro.client_id, v_intro.client_name, v_intro.client_phone,
    coalesce(v_intro.created_by_name, 'Andreas Pro'), v_intro.id
  );

  RETURN jsonb_build_object(
    'ok', true,
    'intro_id', v_intro.id,
    'tarjetas_insertadas', v_cards,
    'cantidad_promos_inventario', jsonb_array_length(v_catalogo),
    'promos_inventario', v_catalogo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.debug_probar_emit_promos() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- Después de Run:
-- SELECT public.debug_probar_emit_promos();
-- SELECT id, content_type, media_url IS NOT NULL AS tiene_foto
-- FROM public.marketing_direct_messages ORDER BY id DESC LIMIT 8;
