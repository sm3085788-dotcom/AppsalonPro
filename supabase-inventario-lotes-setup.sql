-- =============================================================================
-- AppSalon Pro — Lotes de ingreso a inventario (stock)
-- Ejecutar en Supabase → SQL Editor → Run (antes de usar «Nuevo stock» en la app)
-- Para sucursales con QR, ejecutar también supabase-sucursales-stock-lotes.sql
-- =============================================================================

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

ALTER TABLE public.inventario_lotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventario_lotes_role_select ON public.inventario_lotes;
CREATE POLICY inventario_lotes_role_select
ON public.inventario_lotes FOR SELECT
TO authenticated
USING (
  public.is_admin_global()
  OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
);

DROP POLICY IF EXISTS inventario_lotes_role_insert ON public.inventario_lotes;
CREATE POLICY inventario_lotes_role_insert
ON public.inventario_lotes FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_global()
  OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
);

DROP POLICY IF EXISTS inventario_lotes_role_update ON public.inventario_lotes;
CREATE POLICY inventario_lotes_role_update
ON public.inventario_lotes FOR UPDATE
TO authenticated
USING (
  public.is_admin_global()
  OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
)
WITH CHECK (
  public.is_admin_global()
  OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
);

DROP POLICY IF EXISTS inventario_lotes_role_delete ON public.inventario_lotes;
CREATE POLICY inventario_lotes_role_delete
ON public.inventario_lotes FOR DELETE
TO authenticated
USING (
  public.is_admin_global()
  OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_lotes TO authenticated;
