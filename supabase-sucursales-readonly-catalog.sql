-- AppSalon Pro — Catálogo read-only en sucursal (clientes + empleados)
-- Ejecutar en Supabase SQL Editor después de supabase-sucursales-setup.sql
--
-- Admin sucursal: ve TODOS los clientes y empleados (SELECT).
-- Puede INSERT/UPDATE clientes creados en su sucursal (creado_en_sucursal_id).
-- Para INSERT con trigger automático, ejecutar también supabase-sucursales-clientes-insert.sql

-- Clientes: sucursal ve catálogo completo (matriz + otras sucursales + app)
DROP POLICY IF EXISTS clientes_sucursal_select_own ON public.clientes;
CREATE POLICY clientes_sucursal_select_own ON public.clientes
  FOR SELECT TO authenticated
  USING (
    public.is_admin_global()
    OR public.is_staff_or_admin() AND NOT public.is_admin_sucursal()
    OR public.is_admin_sucursal()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS clientes_sucursal_insert ON public.clientes;
CREATE POLICY clientes_sucursal_insert ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND COALESCE(creado_en_sucursal_id, public.current_sucursal_id()) = public.current_sucursal_id()
  );

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

-- Empleados: sucursal solo lectura (SELECT)
DROP POLICY IF EXISTS empleados_sucursal_select ON public.empleados;
CREATE POLICY empleados_sucursal_select ON public.empleados
  FOR SELECT TO authenticated
  USING (public.is_admin_sucursal());
