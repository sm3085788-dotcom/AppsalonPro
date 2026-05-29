-- Parche: Mis facturas (ventas) + mensajes Andreas Pro
-- Ejecutar en Supabase → SQL Editor (una vez por proyecto).
-- Requiere haber ejecutado antes: supabase-aura-line-client.sql, supabase-client-notifications.sql

-- =============================================================================
-- 1) Facturas: el cliente puede leer sus ventas
-- =============================================================================
GRANT SELECT ON public.ventas TO authenticated;

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ventas_client_select_own ON public.ventas;
CREATE POLICY ventas_client_select_own
ON public.ventas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.id = ventas.cliente_id
      AND c.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.client_mis_facturas(p_limit integer DEFAULT 200)
RETURNS SETOF public.ventas
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.*
  FROM public.ventas v
  INNER JOIN public.clientes c ON c.id = v.cliente_id
  WHERE c.user_id = auth.uid()
  ORDER BY COALESCE(v.fecha, now()) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
$$;

GRANT EXECUTE ON FUNCTION public.client_mis_facturas(integer) TO authenticated;

-- Enlazar ficha cliente al confirmar pedido (salón o el mismo usuario)
CREATE OR REPLACE FUNCTION public.ensure_cliente_for_auth_user(
  p_user_id uuid,
  p_nombre text DEFAULT NULL,
  p_telefono text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  nom text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO cid FROM public.clientes WHERE user_id = p_user_id LIMIT 1;
  IF cid IS NOT NULL THEN
    RETURN cid;
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT COALESCE(public.is_staff_or_admin(), false) THEN
    RAISE EXCEPTION 'No autorizado para crear ficha de otro usuario';
  END IF;

  nom := COALESCE(NULLIF(trim(p_nombre), ''), 'Cliente');
  INSERT INTO public.clientes (user_id, nombre, telefono, tipo_registro, categoria)
  VALUES (
    p_user_id,
    nom,
    NULLIF(trim(p_telefono), ''),
    'app_clientes',
    'Nuevo'
  )
  RETURNING id INTO cid;

  RETURN cid;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO cid FROM public.clientes WHERE user_id = p_user_id LIMIT 1;
    RETURN cid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_cliente_for_auth_user(uuid, text, text) TO authenticated;

-- =============================================================================
-- 2) Mensajes: bandeja salón + contador no leídos (incluye confirmación de cita)
-- =============================================================================
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
    AND m.content_type IN ('chat', 'broadcast_promo', 'incident_report', 'cita_confirmacion');
$$;

GRANT EXECUTE ON FUNCTION public.client_aura_unread_count() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.salon_inbox_client_preview()
RETURNS TABLE (
  client_id uuid,
  content text,
  created_at timestamptz,
  content_type text,
  status text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (m.client_id)
    m.client_id,
    m.content,
    m.created_at,
    m.content_type,
    m.status
  FROM marketing_direct_messages m
  WHERE m.content_type IN (
    'chat', 'broadcast_promo', 'incident_report', 'cita_confirmacion',
    'tendencias_interest', 'carousel_interest'
  )
  ORDER BY m.client_id, m.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.salon_inbox_client_preview() TO authenticated;

-- =============================================================================
-- 3) Envío salón: RPC estable (evita fallo INSERT + .single() en la app)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.salon_send_aura_message(
  p_client_id uuid,
  p_content text,
  p_client_name text DEFAULT NULL,
  p_client_phone text DEFAULT NULL,
  p_content_type text DEFAULT 'chat',
  p_media_url text DEFAULT NULL,
  p_media_kind text DEFAULT NULL,
  p_status text DEFAULT 'pending_sync',
  p_created_by_name text DEFAULT NULL
)
RETURNS public.marketing_direct_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.marketing_direct_messages;
  nom text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sin sesión';
  END IF;
  IF NOT COALESCE(public.is_staff_or_admin(), false) THEN
    RAISE EXCEPTION 'Sin permiso de salón (requiere rol admin)';
  END IF;
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente no válido';
  END IF;

  nom := COALESCE(NULLIF(trim(p_client_name), ''), 'Cliente');

  INSERT INTO marketing_direct_messages (
    client_id,
    client_name,
    client_phone,
    content,
    content_type,
    media_url,
    media_kind,
    status,
    created_by,
    created_by_name
  )
  VALUES (
    p_client_id,
    nom,
    NULLIF(trim(p_client_phone), ''),
    COALESCE(NULLIF(trim(p_content), ''), CASE WHEN p_media_url IS NOT NULL THEN 'Imagen' ELSE '' END),
    COALESCE(NULLIF(trim(p_content_type), ''), 'chat'),
    NULLIF(trim(p_media_url), ''),
    NULLIF(trim(p_media_kind), ''),
    COALESCE(NULLIF(trim(p_status), ''), 'pending_sync'),
    auth.uid(),
    COALESCE(NULLIF(trim(p_created_by_name), ''), 'Equipo salón')
  )
  RETURNING * INTO row;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_send_aura_message(uuid, text, text, text, text, text, text, text, text) TO authenticated;
