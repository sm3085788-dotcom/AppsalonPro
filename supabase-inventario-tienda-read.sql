-- Tienda App Clientes: lectura de inventario publicado
-- Ejecutar en Supabase SQL Editor si la tienda no muestra productos (permission denied)

GRANT SELECT ON public.inventario TO anon, authenticated;

DROP POLICY IF EXISTS inventario_tienda_public_read ON public.inventario;
CREATE POLICY inventario_tienda_public_read
ON public.inventario FOR SELECT
TO anon, authenticated
USING (
  visible_en_tienda = true
  OR COALESCE(notas, '') LIKE '%"articuloTipo":"servicio"%'
  OR COALESCE(notas, '') LIKE '%"articuloTipo": "servicio"%'
);
