-- App Clientes: notificaciones in-app + tokens push (pedidos, mensajes, citas)
-- Ejecutar en Supabase SQL Editor → Run

-- ─── Tablas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_notifications (
  id bigserial PRIMARY KEY,
  client_user_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  target_screen text,
  target_id text,
  leida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_notifications_user_created
  ON public.client_notifications (client_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_notifications_user_unread
  ON public.client_notifications (client_user_id)
  WHERE leida = false;

CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  app_slug text NOT NULL DEFAULT 'clientes',
  expo_push_token text NOT NULL,
  platform text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, app_slug, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_app
  ON public.push_device_tokens (user_id, app_slug);

CREATE TABLE IF NOT EXISTS public.client_notif_prefs (
  user_id uuid PRIMARY KEY,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notif_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_notifications_select_own ON public.client_notifications;
CREATE POLICY client_notifications_select_own ON public.client_notifications
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

DROP POLICY IF EXISTS client_notifications_update_own ON public.client_notifications;
CREATE POLICY client_notifications_update_own ON public.client_notifications
  FOR UPDATE TO authenticated
  USING (client_user_id = auth.uid())
  WITH CHECK (client_user_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_select_own ON public.push_device_tokens;
CREATE POLICY push_tokens_select_own ON public.push_device_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_upsert_own ON public.push_device_tokens;
CREATE POLICY push_tokens_upsert_own ON public.push_device_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_update_own ON public.push_device_tokens;
CREATE POLICY push_tokens_update_own ON public.push_device_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_tokens_delete_own ON public.push_device_tokens;
CREATE POLICY push_tokens_delete_own ON public.push_device_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS client_notif_prefs_all_own ON public.client_notif_prefs;
CREATE POLICY client_notif_prefs_all_own ON public.client_notif_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Staff / service role insertan vía SECURITY DEFINER
GRANT SELECT, UPDATE ON public.client_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_device_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.client_notif_prefs TO authenticated;

-- ─── Preferencias (para triggers / push) ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.client_notif_pref_enabled(p_user_id uuid, p_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE jsonb_typeof(prefs -> p_key)
        WHEN 'boolean' THEN (prefs -> p_key)::boolean
        WHEN 'string' THEN lower(prefs ->> p_key) IN ('true', '1', 'yes', 'si', 'sí')
        ELSE NULL
      END
      FROM client_notif_prefs
      WHERE user_id = p_user_id
    ),
    CASE p_key
      WHEN 'promociones' THEN false
      ELSE true
    END
  );
$$;

-- ─── Encolar notificación ───────────────────────────────────────────────────

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

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_client_notification(uuid, uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_client_notification(uuid, uuid, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.client_notif_pref_enabled(uuid, text) TO authenticated;

-- ─── Encolar desde mensaje (RPC + trigger) ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_client_from_mdm_message(p_mdm_id bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.marketing_direct_messages%ROWTYPE;
  v_uid uuid;
  v_tipo text;
  v_titulo text;
  v_mensaje text;
  v_screen text;
BEGIN
  SELECT * INTO m FROM public.marketing_direct_messages WHERE id = p_mdm_id;
  IF NOT FOUND OR m.client_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF m.content_type NOT IN ('chat', 'broadcast_promo', 'cita_confirmacion', 'incident_report') THEN
    RETURN NULL;
  END IF;

  SELECT c.user_id INTO v_uid FROM public.clientes c WHERE c.id = m.client_id;
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF m.content_type = 'cita_confirmacion' THEN
    v_tipo := 'cita';
    v_titulo := 'Tu cita está confirmada';
    v_mensaje := 'El salón confirmó tu cita. Revisá los detalles en Mensajes.';
    v_screen := 'mensajes';
  ELSIF m.content_type = 'broadcast_promo' THEN
    v_tipo := 'promo';
    v_titulo := 'Novedad del salón';
    v_mensaje := 'Tenés una promoción nueva en Andreas Pro.';
    v_screen := 'mensajes';
  ELSIF m.content_type = 'incident_report' THEN
    v_tipo := 'mensaje';
    v_titulo := 'Actualización de incidente';
    v_mensaje := 'El salón respondió sobre tu reporte.';
    v_screen := 'mensajes';
  ELSE
    v_tipo := 'mensaje';
    v_titulo := COALESCE(NULLIF(trim(m.created_by_name), ''), 'Andreas Pro');
    v_mensaje := 'Tenés un mensaje nuevo del salón.';
    v_screen := 'mensajes';
  END IF;

  RETURN public.enqueue_client_notification(
    v_uid,
    m.client_id,
    v_tipo,
    v_titulo,
    v_mensaje,
    v_screen,
    m.id::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_client_from_mdm_message(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_client_from_mdm_message(bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_mdm_notify_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_client_from_mdm_message(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mdm_notify_client_ins ON public.marketing_direct_messages;
CREATE TRIGGER mdm_notify_client_ins
  AFTER INSERT ON public.marketing_direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_mdm_notify_client();

-- ─── Trigger: cambio de estado pedido → cliente ─────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_order_notify_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo text;
  v_mensaje text;
BEGIN
  IF NEW.client_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_client_notification(
      NEW.client_user_id,
      NULL,
      'pedido',
      'Pedido recibido',
      format('Tu pedido %s fue enviado al salón. Total Q %s.',
        COALESCE(NEW.tracking_code, '#' || NEW.id::text),
        to_char(COALESCE(NEW.total_amount, 0), 'FM999999990.00')),
      'mis_pedidos',
      NEW.id::text
    );
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'confirmed' THEN
    v_titulo := 'Pedido confirmado';
    v_mensaje := format('El salón confirmó tu pedido %s.', COALESCE(NEW.tracking_code, ''));
  ELSIF NEW.status = 'prepared' THEN
    v_titulo := 'Pedido en preparación';
    v_mensaje := format('Tu pedido %s está siendo preparado.', COALESCE(NEW.tracking_code, ''));
  ELSIF NEW.status = 'delivered' THEN
    v_titulo := 'Pedido entregado';
    v_mensaje := format('Tu pedido %s fue entregado. ¡Gracias!', COALESCE(NEW.tracking_code, ''));
  ELSIF NEW.status = 'cancelled' THEN
    v_titulo := 'Pedido cancelado';
    v_mensaje := format('Tu pedido %s fue cancelado.', COALESCE(NEW.tracking_code, ''));
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_client_notification(
    NEW.client_user_id,
    NULL,
    'pedido',
    v_titulo,
    v_mensaje,
    'mis_pedidos',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_notify_client_ins ON public.ecommerce_orders;
CREATE TRIGGER order_notify_client_ins
  AFTER INSERT ON public.ecommerce_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_notify_client();

DROP TRIGGER IF EXISTS order_notify_client_upd ON public.ecommerce_orders;
CREATE TRIGGER order_notify_client_upd
  AFTER UPDATE OF status ON public.ecommerce_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_order_notify_client();

-- ─── RPC: marcar leídas / listar ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.client_notifications_mark_read(p_ids bigint[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  UPDATE client_notifications
  SET leida = true
  WHERE client_user_id = auth.uid()
    AND id = ANY(COALESCE(p_ids, ARRAY[]::bigint[]));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

CREATE OR REPLACE FUNCTION public.client_notifications_unread_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM client_notifications
  WHERE client_user_id = auth.uid()
    AND leida = false;
$$;

CREATE OR REPLACE FUNCTION public.client_notifications_mark_all_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  UPDATE client_notifications
  SET leida = true
  WHERE client_user_id = auth.uid()
    AND leida = false;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_notifications_mark_read(bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_notifications_mark_all_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_notifications_unread_count() TO authenticated;
