-- Elimina la tabla de auditoría admin (ya no usada en la app).
-- Ejecutar en el SQL Editor de Supabase.

-- Políticas RLS
DROP POLICY IF EXISTS admin_audit_logs_role_delete ON public.admin_audit_logs;
DROP POLICY IF EXISTS admin_audit_logs_role_insert ON public.admin_audit_logs;
DROP POLICY IF EXISTS admin_audit_logs_role_select ON public.admin_audit_logs;
DROP POLICY IF EXISTS admin_audit_logs_role_update ON public.admin_audit_logs;

-- Tabla
DROP TABLE IF EXISTS public.admin_audit_logs;
