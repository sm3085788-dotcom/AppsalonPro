-- Carrusel hero «Reserva tu cita» (parte superior Inicio App Clientes)
-- Ejecutar en Supabase SQL Editor después del setup de marketing.

CREATE OR REPLACE FUNCTION public.feed_home_hero(p_limit integer DEFAULT 15)
RETURNS TABLE (
  id bigint,
  title text,
  body text,
  media_url text,
  content_type text,
  audience text,
  status text,
  visibility text,
  published_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mp.id, mp.title, mp.body, mp.media_url, mp.content_type,
    mp.audience, mp.status, mp.visibility, mp.published_at, mp.created_at
  FROM marketing_posts mp
  WHERE mp.status = 'published'
    AND mp.visibility = 'public'
    AND mp.audience = 'home_hero'
    AND mp.media_url IS NOT NULL
  ORDER BY mp.published_at DESC NULLS LAST, mp.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 15), 50));
$$;

GRANT EXECUTE ON FUNCTION public.feed_home_hero(integer) TO anon, authenticated;

-- Excluir hero del feed Tendencias
CREATE OR REPLACE FUNCTION public.feed_tendencias(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id bigint,
  title text,
  body text,
  media_url text,
  content_type text,
  audience text,
  status text,
  visibility text,
  published_at timestamptz,
  created_at timestamptz,
  reactions_count integer,
  comments_count integer,
  views_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mp.id, mp.title, mp.body, mp.media_url, mp.content_type,
    mp.audience, mp.status, mp.visibility, mp.published_at, mp.created_at,
    mp.reactions_count, mp.comments_count, mp.views_count
  FROM marketing_posts mp
  WHERE mp.status = 'published'
    AND mp.visibility = 'public'
    AND COALESCE(mp.audience, 'public') NOT IN ('home_carousel', 'home_hero')
    AND mp.media_url IS NOT NULL
  ORDER BY mp.published_at DESC NULLS LAST, mp.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 80));
$$;

GRANT EXECUTE ON FUNCTION public.feed_tendencias(integer) TO anon, authenticated;
