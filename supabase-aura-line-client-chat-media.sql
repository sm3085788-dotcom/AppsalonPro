-- App Clientes: enviar chat con imagen (RLS + RPC)
-- Ejecutar si ves: "new row violates row-level security policy" al enviar foto.

-- Fallback INSERT directo (si el RPC no está actualizado)
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

-- RPC con soporte de media_url / media_kind (recomendado)
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

GRANT EXECUTE ON FUNCTION public.client_send_aura_chat(text, text, text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
