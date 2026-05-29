-- AppSalon Pro — interés Tendencias / carrusel → marketing_direct_messages
-- Ejecutar en Supabase: SQL Editor → New query → Run
-- Luego: Settings → API → Reload schema (o esperar ~1 min) si PostgREST no ve la función.

DROP POLICY IF EXISTS marketing_direct_messages_client_interest_insert ON public.marketing_direct_messages;
CREATE POLICY marketing_direct_messages_client_interest_insert
ON public.marketing_direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  content_type IN ('tendencias_interest', 'carousel_interest')
  AND client_id IS NOT NULL
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = marketing_direct_messages.client_id
      AND c.user_id = auth.uid()
  )
);

-- PostgREST resuelve RPC por nombre de parámetros en orden alfabético:
-- p_client_name, p_client_phone, p_content, p_content_type, p_media_kind, p_media_url
DROP FUNCTION IF EXISTS public.client_register_marketing_interest(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.client_register_marketing_interest(
  p_client_name text,
  p_client_phone text,
  p_content text,
  p_content_type text,
  p_media_kind text,
  p_media_url text
)
RETURNS public.marketing_direct_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  row public.marketing_direct_messages;
  ct text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sin sesión';
  END IF;

  ct := COALESCE(NULLIF(trim(p_content_type), ''), 'tendencias_interest');
  IF ct NOT IN ('tendencias_interest', 'carousel_interest') THEN
    RAISE EXCEPTION 'Tipo de interés no válido';
  END IF;

  SELECT id INTO cid FROM public.clientes WHERE user_id = auth.uid() LIMIT 1;
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Sin ficha de cliente';
  END IF;

  INSERT INTO public.marketing_direct_messages (
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
    NULLIF(trim(COALESCE(p_client_phone, '')), ''),
    COALESCE(NULLIF(trim(p_content), ''), 'Interés en publicación'),
    ct,
    NULLIF(trim(COALESCE(p_media_url, '')), ''),
    NULLIF(trim(COALESCE(p_media_kind, '')), ''),
    'delivered',
    auth.uid(),
    COALESCE(NULLIF(trim(p_client_name), ''), 'Cliente')
  )
  RETURNING * INTO row;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_register_marketing_interest(text, text, text, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
