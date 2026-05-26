-- App Clientes: crear ficha en `clientes` al registrarse (ensureFromAuth)
-- Ejecutar en Supabase SQL Editor si el registro falla por RLS en clientes.

GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;

DROP POLICY IF EXISTS clientes_client_insert ON public.clientes;
CREATE POLICY clientes_client_insert
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
