-- AppSalon Pro — lectura pública marketing (carrusel + Tendencias)
-- Ejecutar TODO en Supabase SQL Editor → Run
-- Soluciona "permission denied" en App Clientes aunque falle RLS manual.

-- 1) Permisos base (por si faltan)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.marketing_posts TO anon, authenticated;

-- 2) Política RLS (complementaria)
DROP POLICY IF EXISTS marketing_posts_public_read ON public.marketing_posts;
CREATE POLICY marketing_posts_public_read
ON public.marketing_posts FOR SELECT
TO anon, authenticated
USING (status = 'published' AND visibility = 'public');

-- 3) Storage: leer imágenes del bucket tendencias
DROP POLICY IF EXISTS tendencias_public_read ON storage.objects;
CREATE POLICY tendencias_public_read
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tendencias');

-- 4) RPC público — bypass RLS de staff (recomendado para App Clientes)
CREATE OR REPLACE FUNCTION public.feed_home_carousel(p_limit integer DEFAULT 15)
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
  SELECT
    mp.id, mp.title, mp.body, mp.media_url, mp.content_type,
    mp.audience, mp.status, mp.visibility, mp.published_at, mp.created_at
  FROM marketing_posts mp
  WHERE mp.status = 'published'
    AND mp.visibility = 'public'
    AND mp.audience = 'home_carousel'
    AND mp.media_url IS NOT NULL
  ORDER BY mp.published_at DESC NULLS LAST, mp.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 15), 50));
$$;

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
  SELECT
    mp.id, mp.title, mp.body, mp.media_url, mp.content_type,
    mp.audience, mp.status, mp.visibility, mp.published_at, mp.created_at,
    mp.reactions_count, mp.comments_count, mp.views_count
  FROM marketing_posts mp
  WHERE mp.status = 'published'
    AND mp.visibility = 'public'
    AND COALESCE(mp.audience, 'public') <> 'home_carousel'
    AND mp.media_url IS NOT NULL
  ORDER BY mp.published_at DESC NULLS LAST, mp.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 80));
$$;

REVOKE ALL ON FUNCTION public.feed_home_carousel(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feed_tendencias(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feed_home_carousel(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.feed_tendencias(integer) TO anon, authenticated;
