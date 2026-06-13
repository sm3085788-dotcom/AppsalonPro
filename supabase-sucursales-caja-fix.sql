-- AppSalon Pro — Caja + ventas en sucursal (admin_sucursal)
-- Ejecutar en Supabase SQL Editor si falla RLS en tablas "cajas" o "ventas"

-- Auto-asignar sucursal_id al insertar caja/venta desde admin_sucursal
CREATE OR REPLACE FUNCTION public.tg_set_sucursal_id_on_branch_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_sucursal() AND public.current_sucursal_id() IS NOT NULL THEN
    IF NEW.sucursal_id IS NULL THEN
      NEW.sucursal_id := public.current_sucursal_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cajas_set_sucursal ON public.cajas;
CREATE TRIGGER trg_cajas_set_sucursal
  BEFORE INSERT ON public.cajas
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_sucursal_id_on_branch_insert();

DROP TRIGGER IF EXISTS trg_ventas_set_sucursal ON public.ventas;
CREATE TRIGGER trg_ventas_set_sucursal
  BEFORE INSERT ON public.ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_sucursal_id_on_branch_insert();

-- Cajas: sucursal abre/cierra y consulta su caja
DROP POLICY IF EXISTS cajas_sucursal_select ON public.cajas;
CREATE POLICY cajas_sucursal_select ON public.cajas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS cajas_sucursal_insert ON public.cajas;
CREATE POLICY cajas_sucursal_insert ON public.cajas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS cajas_sucursal_update ON public.cajas;
CREATE POLICY cajas_sucursal_update ON public.cajas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

-- Movimientos de caja ligados a la caja de la sucursal
DROP POLICY IF EXISTS movimientos_caja_sucursal_select ON public.movimientos_caja;
CREATE POLICY movimientos_caja_sucursal_select ON public.movimientos_caja
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cajas c
      WHERE c.id = movimientos_caja.caja_id
        AND c.sucursal_id = public.current_sucursal_id()
    )
  );

DROP POLICY IF EXISTS movimientos_caja_sucursal_insert ON public.movimientos_caja;
CREATE POLICY movimientos_caja_sucursal_insert ON public.movimientos_caja
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cajas c
      WHERE c.id = caja_id
        AND c.sucursal_id = public.current_sucursal_id()
    )
  );

DROP POLICY IF EXISTS movimientos_caja_sucursal_update ON public.movimientos_caja;
CREATE POLICY movimientos_caja_sucursal_update ON public.movimientos_caja
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cajas c
      WHERE c.id = movimientos_caja.caja_id
        AND c.sucursal_id = public.current_sucursal_id()
    )
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.cajas c
      WHERE c.id = caja_id
        AND c.sucursal_id = public.current_sucursal_id()
    )
  );

-- Ventas: sucursal registra ventas de su local (Vender / POS)
DROP POLICY IF EXISTS ventas_sucursal_select ON public.ventas;
CREATE POLICY ventas_sucursal_select ON public.ventas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS ventas_sucursal_insert ON public.ventas;
CREATE POLICY ventas_sucursal_insert ON public.ventas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
    AND (
      caja_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.cajas c
        WHERE c.id = caja_id
          AND c.sucursal_id = public.current_sucursal_id()
      )
    )
  );

DROP POLICY IF EXISTS ventas_sucursal_update ON public.ventas;
CREATE POLICY ventas_sucursal_update ON public.ventas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );
