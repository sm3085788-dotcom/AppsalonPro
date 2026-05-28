-- AppSalon Pro — Tendencias: likes de clientes, comentarios visibles, consultas para alertas del salón
-- Ejecutar en Supabase SQL Editor → Run

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ─── Likes (cliente autenticado) ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.client_toggle_marketing_post_like(p_post_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ck text;
  liked boolean;
  cnt integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para dar me gusta';
  END IF;
  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'Publicación inválida';
  END IF;

  ck := auth.uid()::text;

  IF EXISTS (
    SELECT 1 FROM marketing_post_likes
    WHERE post_id = p_post_id AND client_key = ck
  ) THEN
    DELETE FROM marketing_post_likes
    WHERE post_id = p_post_id AND client_key = ck;
    liked := false;
    UPDATE marketing_posts
    SET reactions_count = GREATEST(COALESCE(reactions_count, 0) - 1, 0)
    WHERE id = p_post_id;
  ELSE
    INSERT INTO marketing_post_likes (post_id, client_key)
    VALUES (p_post_id, ck)
    ON CONFLICT DO NOTHING;
    liked := true;
    UPDATE marketing_posts
    SET reactions_count = COALESCE(reactions_count, 0) + 1
    WHERE id = p_post_id;
  END IF;

  SELECT COALESCE(reactions_count, 0) INTO cnt FROM marketing_posts WHERE id = p_post_id;
  RETURN jsonb_build_object('liked', liked, 'count', cnt);
END;
$$;

CREATE OR REPLACE FUNCTION public.client_marketing_liked_posts(p_post_ids bigint[])
RETURNS TABLE (post_id bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.post_id
  FROM marketing_post_likes l
  WHERE auth.uid() IS NOT NULL
    AND l.client_key = auth.uid()::text
    AND l.post_id = ANY(COALESCE(p_post_ids, ARRAY[]::bigint[]));
$$;

GRANT EXECUTE ON FUNCTION public.client_toggle_marketing_post_like(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_marketing_liked_posts(bigint[]) TO authenticated;

-- ─── Comentarios visibles al publicar (sin moderación del salón) ─────────────

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
    'visible'
  )
  RETURNING * INTO row;

  UPDATE marketing_posts
  SET comments_count = COALESCE(comments_count, 0) + 1
  WHERE id = p_post_id;

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
    AND moderation_status = 'visible'
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.create_marketing_comment(bigint, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_marketing_comments(bigint) TO anon, authenticated;
