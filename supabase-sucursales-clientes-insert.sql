-- AppSalon Pro — Crear clientes manual en sucursal (admin_sucursal)
-- Ejecutar en Supabase SQL Editor si falla al crear cliente manual desde sucursal.

GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;

-- Auto-asignar creado_en_sucursal_id al insertar desde admin_sucursal
CREATE OR REPLACE FUNCTION public.tg_set_creado_en_sucursal_on_branch_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin_sucursal() AND public.current_sucursal_id() IS NOT NULL THEN
    IF NEW.creado_en_sucursal_id IS NULL THEN
      NEW.creado_en_sucursal_id := public.current_sucursal_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_set_sucursal ON public.clientes;
CREATE TRIGGER trg_clientes_set_sucursal
  BEFORE INSERT ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_set_creado_en_sucursal_on_branch_insert();

-- Ver catálogo completo
DROP POLICY IF EXISTS clientes_sucursal_select_own ON public.clientes;
CREATE POLICY clientes_sucursal_select_own ON public.clientes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_global()
    OR public.is_staff_or_admin() AND NOT public.is_admin_sucursal()
    OR public.is_admin_sucursal()
    OR user_id = auth.uid()
  );

-- Crear clientes manuales en su sucursal
DROP POLICY IF EXISTS clientes_sucursal_insert ON public.clientes;
CREATE POLICY clientes_sucursal_insert ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(creado_en_sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
  );

-- Editar solo clientes creados en su sucursal
DROP POLICY IF EXISTS clientes_sucursal_update_own ON public.clientes;
CREATE POLICY clientes_sucursal_update_own ON public.clientes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND creado_en_sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND creado_en_sucursal_id = public.current_sucursal_id()
  );
