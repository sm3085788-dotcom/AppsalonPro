-- Solo lo que falta en tu proyecto: envío desde App Salón (Mensajes, citas, difusiones).
-- Ejecutar en Supabase → SQL Editor → Run.
-- Sucursales: ver también supabase-sucursales-mensajes.sql

CREATE OR REPLACE FUNCTION public.salon_branch_can_message_cliente(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_global()
    OR (COALESCE(public.is_staff_or_admin(), false) AND NOT public.is_admin_sucursal())
    OR (
      public.is_admin_sucursal()
      AND public.current_sucursal_id() IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.clientes cl
          WHERE cl.id = p_client_id
            AND cl.creado_en_sucursal_id = public.current_sucursal_id()
        )
        OR EXISTS (
          SELECT 1 FROM public.citas c
          WHERE c.cliente_id = p_client_id
            AND c.sucursal_id = public.current_sucursal_id()
        )
        OR EXISTS (
          SELECT 1 FROM public.clientes cl
          WHERE cl.id = p_client_id
            AND cl.sucursal_preferida_id = public.current_sucursal_id()
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.salon_branch_can_message_cliente(uuid) TO authenticated;

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
  IF NOT public.salon_branch_can_message_cliente(p_client_id) THEN
    RAISE EXCEPTION 'Sin permiso para enviar mensajes a este cliente desde tu sucursal';
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
