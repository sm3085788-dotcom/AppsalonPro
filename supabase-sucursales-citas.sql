-- AppSalon Pro — Citas visibles en sucursal (admin_sucursal)
-- Ejecutar en Supabase SQL Editor si las citas de App Clientes no aparecen en la agenda de sucursal.

-- Asegurar columna (por si no corrió supabase-sucursales-setup.sql)
ALTER TABLE public.citas
  ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_citas_sucursal_id ON public.citas(sucursal_id);

-- admin_sucursal: ver citas de su local
DROP POLICY IF EXISTS citas_sucursal_select ON public.citas;
CREATE POLICY citas_sucursal_select ON public.citas
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

-- admin_sucursal: confirmar / reprogramar / cancelar citas de su local
DROP POLICY IF EXISTS citas_sucursal_update ON public.citas;
CREATE POLICY citas_sucursal_update ON public.citas
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

-- admin_sucursal: crear citas manuales en su agenda
DROP POLICY IF EXISTS citas_sucursal_insert ON public.citas;
CREATE POLICY citas_sucursal_insert ON public.citas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND (
      sucursal_id IS NULL
      OR sucursal_id = public.current_sucursal_id()
    )
  );

-- admin_global / matriz: ver todas las citas (si no lo cubre citas_role_select)
DROP POLICY IF EXISTS citas_admin_global_select ON public.citas;
CREATE POLICY citas_admin_global_select ON public.citas
  FOR SELECT TO authenticated
  USING (public.is_admin_global());

DROP POLICY IF EXISTS citas_admin_global_update ON public.citas;
CREATE POLICY citas_admin_global_update ON public.citas
  FOR UPDATE TO authenticated
  USING (public.is_admin_global())
  WITH CHECK (public.is_admin_global());

DROP POLICY IF EXISTS citas_admin_global_insert ON public.citas;
CREATE POLICY citas_admin_global_insert ON public.citas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_global());

-- Backfill legacy sin sucursal → matriz
DO $$
DECLARE
  v_matriz uuid;
BEGIN
  SELECT id INTO v_matriz FROM public.sucursales WHERE es_matriz = true AND activa = true LIMIT 1;
  IF v_matriz IS NOT NULL THEN
    UPDATE public.citas SET sucursal_id = v_matriz WHERE sucursal_id IS NULL;
  END IF;
END $$;
