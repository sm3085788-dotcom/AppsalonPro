-- =============================================================================
-- AppSalon Pro — Marketing (Storage + tablas + RLS)
-- Ejecutar TODO en Supabase → SQL Editor → New query → Run
-- =============================================================================

-- 1) Bucket Storage "tendencias" (fotos/videos Tendencias + carrusel inicio)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tendencias',
  'tendencias',
  true,
  104857600,
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Políticas Storage (lectura pública; subida solo staff/admin)
DROP POLICY IF EXISTS tendencias_public_read ON storage.objects;
CREATE POLICY tendencias_public_read
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tendencias');

DROP POLICY IF EXISTS tendencias_staff_insert ON storage.objects;
CREATE POLICY tendencias_staff_insert
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tendencias' AND public.is_staff_or_admin());

DROP POLICY IF EXISTS tendencias_staff_update ON storage.objects;
CREATE POLICY tendencias_staff_update
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tendencias' AND public.is_staff_or_admin())
WITH CHECK (bucket_id = 'tendencias' AND public.is_staff_or_admin());

DROP POLICY IF EXISTS tendencias_staff_delete ON storage.objects;
CREATE POLICY tendencias_staff_delete
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tendencias' AND public.is_staff_or_admin());

-- 3) Columnas usadas por la app en marketing_posts (si faltan)
ALTER TABLE public.marketing_posts
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS reactions_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

-- 4) Lectura pública de posts publicados (App Clientes: Tendencias + carrusel)
DROP POLICY IF EXISTS marketing_posts_public_read ON public.marketing_posts;
CREATE POLICY marketing_posts_public_read
ON public.marketing_posts FOR SELECT
TO anon, authenticated
USING (status = 'published' AND visibility = 'public');

-- 5) Interés del cliente → Mensajes (Me interesa / botón carrusel)
DROP POLICY IF EXISTS marketing_direct_messages_client_interest_insert ON public.marketing_direct_messages;
CREATE POLICY marketing_direct_messages_client_interest_insert
ON public.marketing_direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  content_type IN ('tendencias_interest', 'carousel_interest')
  AND client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = marketing_direct_messages.client_id
      AND c.user_id = auth.uid()
  )
);

-- 6) Permisos + RPC público (App Clientes lee sin depender solo de RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.marketing_posts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.feed_home_carousel(p_limit integer DEFAULT 15)
RETURNS TABLE (
  id bigint, title text, body text, media_url text, content_type text,
  audience text, status text, visibility text, published_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mp.id, mp.title, mp.body, mp.media_url, mp.content_type,
    mp.audience, mp.status, mp.visibility, mp.published_at, mp.created_at
  FROM marketing_posts mp
  WHERE mp.status = 'published' AND mp.visibility = 'public'
    AND mp.audience = 'home_carousel' AND mp.media_url IS NOT NULL
  ORDER BY mp.published_at DESC NULLS LAST, mp.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 15), 50));
$$;

CREATE OR REPLACE FUNCTION public.feed_tendencias(p_limit integer DEFAULT 40)
RETURNS TABLE (
  id bigint, title text, body text, media_url text, content_type text,
  audience text, status text, visibility text, published_at timestamptz, created_at timestamptz,
  reactions_count integer, comments_count integer, views_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT mp.id, mp.title, mp.body, mp.media_url, mp.content_type,
    mp.audience, mp.status, mp.visibility, mp.published_at, mp.created_at,
    mp.reactions_count, mp.comments_count, mp.views_count
  FROM marketing_posts mp
  WHERE mp.status = 'published' AND mp.visibility = 'public'
    AND COALESCE(mp.audience, 'public') <> 'home_carousel' AND mp.media_url IS NOT NULL
  ORDER BY mp.published_at DESC NULLS LAST, mp.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 80));
$$;

REVOKE ALL ON FUNCTION public.feed_home_carousel(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.feed_tendencias(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feed_home_carousel(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.feed_tendencias(integer) TO anon, authenticated;
