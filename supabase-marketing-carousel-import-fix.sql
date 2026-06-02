-- AppSalon Pro — Marketing: importar carrusel (productos + servicios) desde App Salón
-- Ejecutar en Supabase → SQL Editor si al importar aparece error de permisos o columnas faltantes.

-- 1) Columnas que usa la app al insertar posts del carrusel
ALTER TABLE public.marketing_posts
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS reactions_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

-- 2) Staff puede insertar/actualizar (App Salón con sesión admin/staff)
-- Si falla el INSERT, verificá que el usuario tenga rol en profiles:
--   SELECT id, role FROM profiles WHERE id = auth.uid();
DROP POLICY IF EXISTS marketing_posts_role_insert ON public.marketing_posts;
CREATE POLICY marketing_posts_role_insert
ON public.marketing_posts FOR INSERT
TO authenticated
WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS marketing_posts_role_update ON public.marketing_posts;
CREATE POLICY marketing_posts_role_update
ON public.marketing_posts FOR UPDATE
TO authenticated
USING (public.is_staff_or_admin())
WITH CHECK (public.is_staff_or_admin());

-- 3) Inventario: staff debe ver todos los artículos (productos y servicios)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario TO authenticated;

-- 4) Servicios en Mis citas (lectura pública por JSON en notas)
DROP POLICY IF EXISTS inventario_tienda_public_read ON public.inventario;
CREATE POLICY inventario_tienda_public_read
ON public.inventario FOR SELECT
TO anon, authenticated
USING (
  visible_en_tienda = true
  OR COALESCE(notas, '') LIKE '%"articuloTipo":"servicio"%'
  OR COALESCE(notas, '') LIKE '%"articuloTipo": "servicio"%'
);

-- 5) Si productos importan pero servicios no: revisar trigger media_url
--    Ver: supabase-marketing-media-url-trigger-fix.sql

-- 6) Recargar API (Dashboard → Settings → API → Reload schema)
