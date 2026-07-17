-- Lectura pública de reseñas de producto (catálogo web sin login)
DROP POLICY IF EXISTS inventario_resenas_select ON public.inventario_resenas;
CREATE POLICY inventario_resenas_select
ON public.inventario_resenas FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.inventario_resenas TO anon;
