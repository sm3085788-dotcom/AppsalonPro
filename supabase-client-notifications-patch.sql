-- Parche notificaciones App Clientes (ejecutar en Supabase SQL Editor)
-- Corrige prefs, encolado por mensaje MDM y recrea triggers.

-- Preferencias: leer boolean JSON correctamente
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

-- Encola notificación leyendo el mensaje en BD (no depende de RLS en la app)
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

  IF m.created_by IS NOT NULL AND m.created_by = v_uid THEN
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
GRANT EXECUTE ON FUNCTION public.enqueue_client_notification(uuid, uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_client_notification(uuid, uuid, text, text, text, text, text) TO service_role;

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
