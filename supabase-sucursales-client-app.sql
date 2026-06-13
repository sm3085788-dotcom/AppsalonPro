-- AppSalon Pro — App Clientes: sucursales + stock por local (tienda y servicios)
-- Ejecutar en Supabase SQL Editor si en App Clientes no cargan sucursales o el stock queda en 0.

-- Listar sucursales activas (picker tienda / citas / pedidos)
CREATE OR REPLACE FUNCTION public.list_sucursales_activas()
RETURNS SETOF public.sucursales
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.sucursales WHERE activa = true ORDER BY es_matriz DESC, nombre;
$$;

REVOKE ALL ON FUNCTION public.list_sucursales_activas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_sucursales_activas() TO authenticated, anon;

GRANT SELECT ON public.sucursales TO authenticated, anon;

DROP POLICY IF EXISTS sucursales_read_activas ON public.sucursales;
CREATE POLICY sucursales_read_activas ON public.sucursales
  FOR SELECT TO authenticated, anon
  USING (activa = true OR public.is_admin_global());

-- Stock por sucursal: clientes pueden leer locales activos (catálogo tienda)
DROP POLICY IF EXISTS inv_stock_suc_select ON public.inventario_stock_sucursal;
CREATE POLICY inv_stock_suc_select ON public.inventario_stock_sucursal
  FOR SELECT TO authenticated, anon
  USING (
    public.is_admin_global()
    OR (
      public.is_admin_sucursal()
      AND public.current_sucursal_id() IS NOT NULL
      AND sucursal_id = public.current_sucursal_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.sucursales s
      WHERE s.id = inventario_stock_sucursal.sucursal_id
        AND s.activa = true
    )
  );

GRANT SELECT ON public.inventario_stock_sucursal TO authenticated, anon;
