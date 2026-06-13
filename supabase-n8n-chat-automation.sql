-- AppSalon Pro — Automatización chat Andreas Pro ↔ n8n
-- Ejecutar en Supabase SQL Editor → Run → Settings → API → Reload schema.
--
-- ORDEN: después de supabase-aura-line-client.sql, supabase-salon-send-aura-message.sql
--         y supabase-inventario-promociones.sql (promos dinámicas + direcciones sucursales)
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO A — Database Webhook (Dashboard Supabase, no SQL)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Database → Webhooks → Create webhook
-- 2. Table: chat_automation_queue | Events: INSERT | Method: POST
-- 3. URL: https://TU-N8N.app/webhook/andreas-pro-chat
-- 4. Headers opcional: X-Webhook-Secret = (mismo valor que en chat_automation_settings)
--
-- Cada fila INSERT en la cola dispara UNA ejecución n8n (concurrencia por cliente/mensaje).
-- Importar workflow: n8n/andreas-pro-chat-automation.workflow.json
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- PASO B — n8n usa service_role de Supabase en nodos HTTP Request:
--   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
--   POST .../rest/v1/rpc/n8n_claim_chat_automation
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- ─── 1. Config global ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_automation_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  debounce_seconds integer NOT NULL DEFAULT 4 CHECK (debounce_seconds BETWEEN 1 AND 30),
  human_takeover_minutes integer NOT NULL DEFAULT 30 CHECK (human_takeover_minutes BETWEEN 5 AND 1440),
  bot_display_name text NOT NULL DEFAULT 'Andreas Pro',
  webhook_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.chat_automation_settings (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.chat_automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_automation_settings_staff_read ON public.chat_automation_settings;
CREATE POLICY chat_automation_settings_staff_read
ON public.chat_automation_settings FOR SELECT
TO authenticated
USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS chat_automation_settings_admin_write ON public.chat_automation_settings;
CREATE POLICY chat_automation_settings_admin_write
ON public.chat_automation_settings FOR ALL
TO authenticated
USING (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
WITH CHECK (public.is_staff_or_admin() AND NOT public.is_admin_sucursal());

-- ─── 2. Estado por conversación (cliente) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_conversation_state (
  client_id uuid PRIMARY KEY REFERENCES public.clientes(id) ON DELETE CASCADE,
  auto_reply_enabled boolean NOT NULL DEFAULT true,
  human_takeover_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_conversation_state_takeover_idx
  ON public.chat_conversation_state (human_takeover_until)
  WHERE human_takeover_until IS NOT NULL;

ALTER TABLE public.chat_conversation_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_conversation_state_staff ON public.chat_conversation_state;
CREATE POLICY chat_conversation_state_staff
ON public.chat_conversation_state FOR ALL
TO authenticated
USING (public.is_staff_or_admin())
WITH CHECK (public.is_staff_or_admin() AND NOT public.is_admin_sucursal());

-- ─── 3. Cola de automatización (1 webhook n8n por INSERT) ─────────────────────
CREATE TABLE IF NOT EXISTS public.chat_automation_queue (
  id bigserial PRIMARY KEY,
  inbound_message_id bigint NOT NULL UNIQUE REFERENCES public.marketing_direct_messages(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  client_name text,
  client_phone text,
  content text NOT NULL,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'replied', 'skipped', 'failed', 'superseded')),
  n8n_intent text,
  reply_message_id bigint REFERENCES public.marketing_direct_messages(id) ON DELETE SET NULL,
  skip_reason text,
  error_message text,
  debounce_until timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_automation_queue_client_pending_idx
  ON public.chat_automation_queue (client_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS chat_automation_queue_status_idx
  ON public.chat_automation_queue (status, created_at);

ALTER TABLE public.chat_automation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_automation_queue_staff_read ON public.chat_automation_queue;
CREATE POLICY chat_automation_queue_staff_read
ON public.chat_automation_queue FOR SELECT
TO authenticated
USING (public.is_staff_or_admin());

-- n8n escribe vía service_role (bypass RLS). Sin política INSERT/UPDATE para authenticated.

-- ─── 4. Helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assert_n8n_service_role()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: requiere Supabase service_role (n8n)';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_mdm_client_inbound_chat(p_row public.marketing_direct_messages)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p_row.content_type = 'chat'
    AND p_row.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.clientes c
      WHERE c.id = p_row.client_id
        AND c.user_id IS NOT NULL
        AND p_row.created_by IS NOT NULL
        AND p_row.created_by = c.user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_mdm_staff_outbound_chat(p_row public.marketing_direct_messages)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p_row.content_type = 'chat'
    AND p_row.client_id IS NOT NULL
    AND p_row.created_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.clientes c
      WHERE c.id = p_row.client_id
        AND c.user_id = p_row.created_by
    )
    AND coalesce(nullif(trim(p_row.created_by_name), ''), '') NOT ILIKE '%bot%';
$$;

CREATE OR REPLACE FUNCTION public.chat_automation_resolve_sucursal_id(p_client_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    c.sucursal_preferida_id,
    c.creado_en_sucursal_id,
    (SELECT s.id FROM public.sucursales s WHERE s.es_matriz = true AND s.activa = true ORDER BY s.created_at LIMIT 1)
  )
  FROM public.clientes c
  WHERE c.id = p_client_id;
$$;

-- Catálogo de intenciones (espejo de shared/config/chatQuickActions.js)
CREATE OR REPLACE FUNCTION public.n8n_chat_intent_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT $json$[
    {"id":"horario","n8nIntent":"chat.horario","label":"Horario","clientMessage":"¿Cuál es el horario de atención de la sucursal?","salonReply":"¡Hola! Nuestro horario es lunes a viernes 9:00 a 19:00 y sábados 9:00 a 17:00. Domingos cerrado. Si necesitás confirmar un día festivo, avisame.","patterns":["horario de atención","horario","qué hora abren","a qué hora"]},
    {"id":"ubicacion","n8nIntent":"chat.ubicacion","label":"Ubicación","clientMessage":"¿Me comparten la dirección exacta y si hay parqueo cerca?","salonReply":"¡Hola! Estas son nuestras ubicaciones (central y sucursales):\n{{sucursales_lista}}\n¿Querés que te envíe el pin de alguna en Google Maps?","patterns":["dirección exacta","parqueo","ubicación","cómo llegar","google maps","dónde están","donde estan"]},
    {"id":"membresia","n8nIntent":"chat.membresia","label":"Membresía","clientMessage":"Hola, quiero saber cómo funciona la membresía y qué beneficios incluye.","salonReply":"¡Hola! La membresía Andreas Pro tiene niveles Bronce, Plata y VIP con descuentos en tienda y premios. Podés ver todo en App Clientes → Premios. ¿Te explico cuál te conviene según tu consumo?","patterns":["membresía","membresia","beneficios incluye","niveles bronce"]},
    {"id":"promos","n8nIntent":"chat.promos","label":"Promos","clientMessage":"¿Qué promociones o descuentos tienen vigentes esta semana?","salonReply":"¡Hola! Estas son las promociones vigentes en Andreas Pro (cada una con foto y precio):","patterns":["promociones","promos","descuentos","vigentes esta semana","ofertas"]},
    {"id":"atencion","n8nIntent":"chat.atencion_cliente","label":"Atención al cliente","clientMessage":"Hola, necesito atención al cliente. ¿Me pueden orientar o escalar mi consulta?","salonReply":"¡Hola! Gracias por escribirnos. Soy atención al cliente Andreas Pro. Contame tu caso y lo gestionamos con prioridad.","patterns":["atención al cliente","atencion al cliente","escalar mi consulta"]},
    {"id":"gracias","n8nIntent":"chat.gracias","label":"Gracias","clientMessage":"Muchas gracias por la atención. Quedo atento/a.","salonReply":"¡Gracias a vos por contactarnos! Cualquier cosa estamos acá en Andreas Pro. ¡Que tengas un excelente día!","patterns":["muchas gracias","gracias por la atención","quedo atento"]}
  ]$json$::jsonb;
$$;

CREATE OR REPLACE FUNCTION public.n8n_match_chat_intent(p_content text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_row jsonb;
  v_pat text;
BEGIN
  v_norm := lower(unaccent(coalesce(trim(p_content), '')));
  IF v_norm = '' THEN
    RETURN NULL;
  END IF;

  FOR v_row IN
    SELECT value FROM jsonb_array_elements(public.n8n_chat_intent_catalog())
  LOOP
    IF v_row ? 'clientMessage'
       AND v_norm = lower(unaccent(coalesce(v_row->>'clientMessage', ''))) THEN
      RETURN v_row;
    END IF;
    FOR v_pat IN
      SELECT jsonb_array_elements_text(v_row->'patterns')
    LOOP
      IF v_norm LIKE '%' || lower(unaccent(v_pat)) || '%' THEN
        RETURN v_row;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.n8n_build_salon_reply(
  p_n8n_intent text,
  p_client_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_reply text;
  v_sid uuid;
  v_suc public.sucursales%ROWTYPE;
  v_promos text;
  v_sucursales text;
BEGIN
  SELECT elem INTO v_row
  FROM jsonb_array_elements(public.n8n_chat_intent_catalog()) elem
  WHERE elem->>'n8nIntent' = p_n8n_intent
     OR elem->>'id' = p_n8n_intent
  LIMIT 1;

  IF v_row IS NULL THEN
    RETURN NULL;
  END IF;

  v_reply := v_row->>'salonReply';

  IF p_n8n_intent = 'chat.ubicacion' THEN
    v_sucursales := public.n8n_format_sucursales_direcciones();
    v_reply := replace(v_reply, '{{sucursales_lista}}', coalesce(v_sucursales, ''));
  ELSIF p_n8n_intent = 'chat.promos' THEN
    v_promos := public.n8n_list_promociones_vigentes();
    v_reply := replace(v_reply, '{{promociones_lista}}', coalesce(v_promos, ''));
  END IF;

  v_sid := public.chat_automation_resolve_sucursal_id(p_client_id);

  IF v_sid IS NOT NULL THEN
    SELECT * INTO v_suc FROM public.sucursales WHERE id = v_sid;
    v_reply := replace(v_reply, '{{sucursal_direccion}}', coalesce(nullif(trim(v_suc.direccion), ''), 'consultá en app'));
    v_reply := replace(v_reply, '{{sucursal_telefono}}', CASE WHEN nullif(trim(v_suc.telefono), '') IS NOT NULL
      THEN 'Tel. ' || trim(v_suc.telefono) || '.' ELSE '' END);
    v_reply := replace(v_reply, '{{sucursal_nombre}}', coalesce(nullif(trim(v_suc.nombre), ''), 'Andreas Pro'));
  ELSE
    v_reply := replace(v_reply, '{{sucursal_direccion}}', 'consultá en app');
    v_reply := replace(v_reply, '{{sucursal_telefono}}', '');
    v_reply := replace(v_reply, '{{sucursal_nombre}}', 'Andreas Pro');
  END IF;

  v_reply := replace(v_reply, '{{sucursales_lista}}', coalesce(public.n8n_format_sucursales_direcciones(), ''));
  v_reply := replace(v_reply, '{{promociones_lista}}', coalesce(public.n8n_list_promociones_vigentes(), ''));

  RETURN v_reply;
END;
$$;

-- Respuesta genérica cuando el mensaje no coincide con ninguna sugerencia (automatización activa).
CREATE OR REPLACE FUNCTION public.n8n_build_fallback_chat_reply(
  p_client_id uuid,
  p_content text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_snip text;
BEGIN
  v_snip := left(trim(coalesce(p_content, '')), 120);
  IF v_snip = '' THEN
    RETURN '¡Hola! Gracias por escribir a Andreas Pro. Recibimos tu mensaje y te respondemos en breve. También podés consultar horario, ubicaciones, membresía o promos tocando ? en el chat.';
  END IF;
  RETURN '¡Hola! Gracias por escribir a Andreas Pro. Recibimos tu mensaje: «' || v_snip
    || '». Te respondemos en breve. Mientras tanto podés consultar horario, ubicaciones, membresía o promos con ? en el chat.';
END;
$$;

-- ─── 5. Encolar mensaje entrante del cliente ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_chat_automation_from_mdm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.chat_automation_settings%ROWTYPE;
  v_state public.chat_conversation_state%ROWTYPE;
  v_debounce interval;
BEGIN
  IF NOT public.is_mdm_client_inbound_chat(NEW) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_settings FROM public.chat_automation_settings WHERE id = 1;
  IF NOT coalesce(v_settings.enabled, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.chat_conversation_state (client_id)
  VALUES (NEW.client_id)
  ON CONFLICT (client_id) DO NOTHING;

  SELECT * INTO v_state FROM public.chat_conversation_state WHERE client_id = NEW.client_id;

  IF coalesce(v_state.auto_reply_enabled, true) = false THEN
    RETURN NEW;
  END IF;

  IF v_state.human_takeover_until IS NOT NULL AND v_state.human_takeover_until > now() THEN
    RETURN NEW;
  END IF;

  v_debounce := make_interval(secs => greatest(1, coalesce(v_settings.debounce_seconds, 4)));

  -- Mensajes rápidos del mismo cliente: supersede pendientes anteriores
  UPDATE public.chat_automation_queue
  SET status = 'superseded', processed_at = now(), skip_reason = 'superseded_by_newer_message'
  WHERE client_id = NEW.client_id
    AND status = 'pending';

  INSERT INTO public.chat_automation_queue (
    inbound_message_id,
    client_id,
    client_name,
    client_phone,
    content,
    sucursal_id,
    debounce_until
  )
  VALUES (
    NEW.id,
    NEW.client_id,
    NEW.client_name,
    NEW.client_phone,
    coalesce(nullif(trim(NEW.content), ''), ''),
    public.chat_automation_resolve_sucursal_id(NEW.client_id),
    now() + v_debounce
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mdm_enqueue_chat_automation_ins ON public.marketing_direct_messages;
CREATE TRIGGER mdm_enqueue_chat_automation_ins
  AFTER INSERT ON public.marketing_direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_chat_automation_from_mdm();

-- Matriz responde manual → pausa bot en esa conversación
CREATE OR REPLACE FUNCTION public.chat_automation_staff_takeover_from_mdm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutes integer;
BEGIN
  IF NOT public.is_mdm_staff_outbound_chat(NEW) THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(human_takeover_minutes, 30) INTO v_minutes
  FROM public.chat_automation_settings WHERE id = 1;

  INSERT INTO public.chat_conversation_state (client_id, human_takeover_until, updated_at)
  VALUES (NEW.client_id, now() + make_interval(mins => v_minutes), now())
  ON CONFLICT (client_id) DO UPDATE
  SET human_takeover_until = excluded.human_takeover_until,
      updated_at = now();

  UPDATE public.chat_automation_queue
  SET status = 'superseded', processed_at = now(), skip_reason = 'human_takeover'
  WHERE client_id = NEW.client_id AND status = 'pending';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mdm_chat_automation_staff_takeover_ins ON public.marketing_direct_messages;
CREATE TRIGGER mdm_chat_automation_staff_takeover_ins
  AFTER INSERT ON public.marketing_direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.chat_automation_staff_takeover_from_mdm();

-- ─── 6. RPCs para n8n (service_role) ──────────────────────────────────────────

-- Reclamar trabajo (idempotente; una ejecución n8n gana por queue_id)
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
        'error', 'missing_n8n_send_promos_chat_reply',
        'hint', 'Ejecutá supabase-inventario-promociones.sql en Supabase'
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

-- Enviar respuesta automática (idempotente por queue_id)
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
    client_id,
    client_name,
    client_phone,
    content,
    content_type,
    status,
    created_by,
    created_by_name
  )
  VALUES (
    v_q.client_id,
    coalesce(v_q.client_name, 'Cliente'),
    v_q.client_phone,
    v_body,
    'chat',
    'pending_sync',
    NULL,
    v_bot
  )
  RETURNING * INTO v_row;

  UPDATE public.chat_automation_queue
  SET
    status = 'replied',
    n8n_intent = p_n8n_intent,
    reply_message_id = v_row.id,
    processed_at = now()
  WHERE id = p_queue_id;

  PERFORM public.notify_client_from_mdm_message(v_row.id);

  RETURN jsonb_build_object(
    'ok', true,
    'reply_message_id', v_row.id,
    'queue_id', p_queue_id,
    'client_id', v_q.client_id
  );
END;
$$;

-- Omitir (sin respuesta automática)
CREATE OR REPLACE FUNCTION public.n8n_skip_chat_automation(
  p_queue_id bigint,
  p_reason text DEFAULT 'no_intent_match'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_n8n_service_role();

  UPDATE public.chat_automation_queue
  SET status = 'skipped', skip_reason = coalesce(nullif(trim(p_reason), ''), 'skipped'), processed_at = now()
  WHERE id = p_queue_id AND status IN ('pending', 'claimed');

  RETURN jsonb_build_object('ok', true, 'queue_id', p_queue_id);
END;
$$;

-- Matriz: activar/desactivar bot global
CREATE OR REPLACE FUNCTION public.salon_set_chat_automation_enabled(p_enabled boolean)
RETURNS public.chat_automation_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.chat_automation_settings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff_or_admin() OR public.is_admin_sucursal() THEN
    RAISE EXCEPTION 'Solo matriz/admin global';
  END IF;

  UPDATE public.chat_automation_settings
  SET enabled = coalesce(p_enabled, false), updated_at = now()
  WHERE id = 1
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.n8n_chat_intent_catalog() TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_match_chat_intent(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_build_salon_reply(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_build_fallback_chat_reply(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_claim_chat_automation(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_send_aura_reply(bigint, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_send_promos_chat_reply(bigint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_skip_chat_automation(bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.salon_set_chat_automation_enabled(boolean) TO authenticated;
