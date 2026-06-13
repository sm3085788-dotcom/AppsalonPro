-- AppSalon Pro — Ingreso stock por QR en sucursal (Inventario → Nuevo stock)
-- Ejecutar en Supabase SQL Editor si falla al escanear el código QR en una sucursal.

-- Tabla de lotes (histórico de ingresos)
CREATE TABLE IF NOT EXISTS public.inventario_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id uuid NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
  numero_lote text NOT NULL,
  fecha_ingreso date NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  stock_antes integer,
  stock_despues integer,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventario_lotes
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS inventario_lotes_inventario_id_idx
  ON public.inventario_lotes (inventario_id);

CREATE INDEX IF NOT EXISTS inventario_lotes_fecha_ingreso_idx
  ON public.inventario_lotes (fecha_ingreso DESC);

CREATE INDEX IF NOT EXISTS inventario_lotes_sucursal_idx
  ON public.inventario_lotes (sucursal_id);

-- Auto-asignar sucursal_id al registrar lote desde admin_sucursal
CREATE OR REPLACE FUNCTION public.tg_set_sucursal_id_on_lote_branch_insert()
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

DROP TRIGGER IF EXISTS trg_inventario_lotes_set_sucursal ON public.inventario_lotes;
CREATE TRIGGER trg_inventario_lotes_set_sucursal
  BEFORE INSERT ON public.inventario_lotes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_sucursal_id_on_lote_branch_insert();

ALTER TABLE public.inventario_lotes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_lotes TO authenticated;

-- Matriz / staff global
DROP POLICY IF EXISTS inventario_lotes_role_select ON public.inventario_lotes;
CREATE POLICY inventario_lotes_role_select ON public.inventario_lotes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_global()
    OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
  );

DROP POLICY IF EXISTS inventario_lotes_role_insert ON public.inventario_lotes;
CREATE POLICY inventario_lotes_role_insert ON public.inventario_lotes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_global()
    OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
  );

DROP POLICY IF EXISTS inventario_lotes_role_update ON public.inventario_lotes;
CREATE POLICY inventario_lotes_role_update ON public.inventario_lotes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_global()
    OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
  )
  WITH CHECK (
    public.is_admin_global()
    OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
  );

DROP POLICY IF EXISTS inventario_lotes_role_delete ON public.inventario_lotes;
CREATE POLICY inventario_lotes_role_delete ON public.inventario_lotes
  FOR DELETE TO authenticated
  USING (
    public.is_admin_global()
    OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
  );

-- Sucursal: registrar y ver lotes de su local (escaneo QR)
DROP POLICY IF EXISTS inventario_lotes_sucursal_select ON public.inventario_lotes;
CREATE POLICY inventario_lotes_sucursal_select ON public.inventario_lotes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS inventario_lotes_sucursal_insert ON public.inventario_lotes;
CREATE POLICY inventario_lotes_sucursal_insert ON public.inventario_lotes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
  );

-- Stock por sucursal: sucursal puede actualizar su fila al importar QR
DROP POLICY IF EXISTS inv_stock_suc_update_branch ON public.inventario_stock_sucursal;
CREATE POLICY inv_stock_suc_update_branch ON public.inventario_stock_sucursal
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_global()
    OR (
      public.is_admin_sucursal()
      AND public.current_sucursal_id() IS NOT NULL
      AND sucursal_id = public.current_sucursal_id()
    )
  )
  WITH CHECK (
    public.is_admin_global()
    OR (
      public.is_admin_sucursal()
      AND public.current_sucursal_id() IS NOT NULL
      AND sucursal_id = public.current_sucursal_id()
    )
  );

DROP POLICY IF EXISTS inv_stock_suc_insert ON public.inventario_stock_sucursal;
CREATE POLICY inv_stock_suc_insert ON public.inventario_stock_sucursal
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_global()
    OR (
      public.is_admin_sucursal()
      AND public.current_sucursal_id() IS NOT NULL
      AND sucursal_id = public.current_sucursal_id()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.inventario_stock_sucursal TO authenticated;
