-- Web Push al confirmar cita (clientes web/PWA) + despacho automático de send-client-push.
-- Ejecutar en Supabase → SQL Editor (proyecto Andreas-core).
--
-- PASO 2 (obligatorio tras este SQL): reemplazá TU_ANON_KEY por la anon key del proyecto
-- (Project Settings → API → anon public).
--
-- INSERT INTO public.internal_push_config (functions_base_url, functions_bearer)
-- VALUES (
--   'https://nqqntgvoxnnohodsmdqa.supabase.co/functions/v1',
--   'TU_ANON_KEY'
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   functions_base_url = EXCLUDED.functions_base_url,
--   functions_bearer = EXCLUDED.functions_bearer;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Config one-shot para invocar Edge Functions desde Postgres (anon key es pública).
CREATE TABLE IF NOT EXISTS public.internal_push_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  functions_base_url text NOT NULL,
  functions_bearer text NOT NULL
);

CREATE OR REPLACE FUNCTION public.dispatch_client_push_async(p_notification_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_bearer text;
BEGIN
  IF p_notification_id IS NULL OR p_notification_id <= 0 THEN
    RETURN;
  END IF;

  SELECT functions_base_url, functions_bearer
  INTO v_base, v_bearer
  FROM public.internal_push_config
  WHERE id = 1;

  IF v_base IS NULL OR v_bearer IS NULL OR trim(v_bearer) = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_base, '/') || '/send-client-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_bearer
    ),
    body := jsonb_build_object('notification_id', p_notification_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

-- Encolar + disparar push (reemplaza enqueue_client_notification).
CREATE OR REPLACE FUNCTION public.enqueue_client_notification(
  p_client_user_id uuid,
  p_cliente_id uuid,
  p_tipo text,
  p_titulo text,
  p_mensaje text,
  p_target_screen text DEFAULT NULL,
  p_target_id text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pref_key text;
  v_id bigint;
  v_is_new boolean := false;
BEGIN
  IF p_client_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_pref_key := CASE
    WHEN p_tipo IN ('mensaje', 'promo', 'cita') THEN
      CASE WHEN p_tipo = 'cita' THEN 'cambiosAgenda' WHEN p_tipo = 'promo' THEN 'promociones' ELSE 'mensajes' END
    WHEN p_tipo = 'pedido' THEN 'pedidos'
    ELSE 'mensajes'
  END;

  IF NOT public.client_notif_pref_enabled(p_client_user_id, v_pref_key) THEN
    RETURN NULL;
  END IF;

  IF p_target_id IS NOT NULL AND trim(p_target_id) <> '' THEN
    SELECT cn.id INTO v_id
    FROM client_notifications cn
    WHERE cn.client_user_id = p_client_user_id
      AND cn.tipo = p_tipo
      AND cn.target_id = p_target_id
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO client_notifications (
    client_user_id, cliente_id, tipo, titulo, mensaje, target_screen, target_id
  ) VALUES (
    p_client_user_id, p_cliente_id, p_tipo, p_titulo, p_mensaje, p_target_screen, p_target_id
  )
  RETURNING id INTO v_id;

  v_is_new := true;

  IF v_is_new AND v_id IS NOT NULL THEN
    PERFORM public.dispatch_client_push_async(v_id);
  END IF;

  RETURN v_id;
END;
$$;

-- Al confirmar cita en BD: aviso web (sin texto de Premios/QR de la app).
CREATE OR REPLACE FUNCTION public.trg_cita_notify_web_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_tipo text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.estado IS NOT DISTINCT FROM NEW.estado THEN
    RETURN NEW;
  END IF;

  IF lower(trim(COALESCE(NEW.estado, ''))) NOT IN ('confirmado', 'confirmada') THEN
    RETURN NEW;
  END IF;

  IF NEW.cliente_id IS NULL OR NEW.visita_validada_en IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.user_id, COALESCE(c.tipo_registro, '')
  INTO v_uid, v_tipo
  FROM public.clientes c
  WHERE c.id = NEW.cliente_id;

  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Solo catálogo web / PWA (no app Andreas Pro verificada).
  IF v_tipo NOT ILIKE '%web%' THEN
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_client_notification(
    v_uid,
    NEW.cliente_id,
    'cita',
    'Tu cita está confirmada',
    'El salón confirmó tu cita. Revisá fecha y detalles en Mi cuenta → Mis citas.',
    'citas',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cita_notify_web_client_upd ON public.citas;
CREATE TRIGGER cita_notify_web_client_upd
  AFTER UPDATE OF estado ON public.citas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cita_notify_web_client();

GRANT SELECT ON public.internal_push_config TO service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_client_push_async(bigint) TO service_role;
