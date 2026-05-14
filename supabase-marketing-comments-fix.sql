-- AppSalon Pro — comentarios Tendencias (App Clientes)
-- Ejecutar en Supabase SQL Editor → Run

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.marketing_comments TO anon, authenticated;

DROP POLICY IF EXISTS marketing_comments_client_insert ON public.marketing_comments;
CREATE POLICY marketing_comments_client_insert
ON public.marketing_comments FOR INSERT
TO authenticated
WITH CHECK (
  moderation_status = 'pending'
  AND author_id = auth.uid()
);

DROP POLICY IF EXISTS marketing_comments_public_read ON public.marketing_comments;
CREATE POLICY marketing_comments_public_read
ON public.marketing_comments FOR SELECT
TO anon, authenticated
USING (
  moderation_status = 'visible'
  OR (moderation_status = 'pending' AND author_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.create_marketing_comment(
  p_post_id bigint,
  p_content text,
  p_author_name text DEFAULT 'Cliente'
)
RETURNS public.marketing_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.marketing_comments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para comentar';
  END IF;
  IF trim(coalesce(p_content, '')) = '' THEN
    RAISE EXCEPTION 'El comentario está vacío';
  END IF;
  INSERT INTO marketing_comments (post_id, content, author_id, author_name, moderation_status)
  VALUES (
    p_post_id,
    trim(p_content),
    auth.uid(),
    coalesce(nullif(trim(p_author_name), ''), 'Cliente'),
    'pending'
  )
  RETURNING * INTO row;
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_marketing_comments(p_post_id bigint)
RETURNS SETOF public.marketing_comments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM marketing_comments
  WHERE post_id = p_post_id
    AND (
      moderation_status = 'visible'
      OR (moderation_status = 'pending' AND author_id = auth.uid())
    )
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.create_marketing_comment(bigint, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_marketing_comments(bigint) TO anon, authenticated;
