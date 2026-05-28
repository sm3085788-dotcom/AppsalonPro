-- Andreas Pro — lectura y respuesta desde App Clientes
-- Ejecutar en Supabase SQL Editor

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, UPDATE ON public.marketing_direct_messages TO anon, authenticated;

DROP POLICY IF EXISTS marketing_direct_messages_client_select ON public.marketing_direct_messages;
CREATE POLICY marketing_direct_messages_client_select
ON public.marketing_direct_messages FOR SELECT
TO authenticated
USING (
  client_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS marketing_direct_messages_client_update_delivered ON public.marketing_direct_messages;
CREATE POLICY marketing_direct_messages_client_update_delivered
ON public.marketing_direct_messages FOR UPDATE
TO authenticated
USING (
  client_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid())
)
WITH CHECK (
  client_id IN (SELECT id FROM public.clientes WHERE user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.client_aura_messages(p_limit integer DEFAULT 200)
RETURNS SETOF public.marketing_direct_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.*
  FROM marketing_direct_messages m
  INNER JOIN clientes c ON c.id = m.client_id
  WHERE c.user_id = auth.uid()
  ORDER BY m.created_at ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
$$;

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

CREATE OR REPLACE FUNCTION public.client_mark_aura_delivered(p_ids bigint[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE marketing_direct_messages m
  SET status = 'delivered', delivered_at = now()
  FROM clientes c
  WHERE m.client_id = c.id
    AND c.user_id = auth.uid()
    AND m.id = ANY(p_ids)
    AND m.status = 'pending_sync';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.client_send_aura_chat(
  p_content text,
  p_client_name text DEFAULT NULL,
  p_client_phone text DEFAULT NULL,
  p_media_url text DEFAULT NULL,
  p_media_kind text DEFAULT NULL
)
RETURNS public.marketing_direct_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  row public.marketing_direct_messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sin sesión';
  END IF;
  SELECT id INTO cid FROM clientes WHERE user_id = auth.uid() LIMIT 1;
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Sin ficha de cliente';
  END IF;
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
    cid,
    COALESCE(NULLIF(trim(p_client_name), ''), 'Cliente'),
    NULLIF(trim(p_client_phone), ''),
    COALESCE(NULLIF(trim(p_content), ''), CASE WHEN p_media_url IS NOT NULL THEN 'Imagen' ELSE '' END),
    'chat',
    NULLIF(trim(p_media_url), ''),
    NULLIF(trim(p_media_kind), ''),
    'delivered',
    auth.uid(),
    COALESCE(NULLIF(trim(p_client_name), ''), 'Cliente')
  )
  RETURNING * INTO row;
  RETURN row;
END;
$$;

DROP POLICY IF EXISTS marketing_direct_messages_client_chat_insert ON public.marketing_direct_messages;
CREATE POLICY marketing_direct_messages_client_chat_insert
ON public.marketing_direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  content_type = 'chat'
  AND client_id IS NOT NULL
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = marketing_direct_messages.client_id
      AND c.user_id = auth.uid()
  )
);

GRANT EXECUTE ON FUNCTION public.client_aura_messages(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_aura_unread_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_mark_aura_delivered(bigint[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_send_aura_chat(text, text, text, text, text) TO anon, authenticated;

-- Bandeja salón: último mensaje por cliente (orden tipo WhatsApp)
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
  WHERE m.content_type IN ('chat', 'broadcast_promo', 'incident_report')
  ORDER BY m.client_id, m.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.salon_inbox_client_preview() TO authenticated;
