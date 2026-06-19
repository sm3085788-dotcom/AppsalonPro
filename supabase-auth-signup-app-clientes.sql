-- App Clientes: arreglar "Database error saving new user" al registrarse
-- NOTA: reemplazado por supabase-profiles-solo-sucursales.sql (clientes → tabla clientes, no profiles).
-- Ejecutar supabase-profiles-solo-sucursales.sql en su lugar.

-- 1) Permitir rol "client" en profiles (además de admin/staff)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_rol_types;
ALTER TABLE public.profiles
  ADD CONSTRAINT check_rol_types
  CHECK (role IN ('admin', 'staff', 'client'));

-- 2) Trigger seguro: crea fila en profiles al registrarse por email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_role text;
BEGIN
  v_name := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  )), '');

  -- Cuentas creadas desde panel Auth con teléfono suelen ser admin; email app clientes → client
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' AND (NEW.email IS NULL OR NEW.email = '') THEN
    v_role := 'admin';
  ELSE
    v_role := 'client';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    phone,
    marketing_access,
    app_scope,
    community_enabled
  )
  VALUES (
    NEW.id,
    v_name,
    v_role,
    NULLIF(trim(NEW.phone), ''),
    false,
    CASE WHEN v_role = 'client' THEN 'clientes' ELSE 'staff' END,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3) Ficha cliente (después del login; ensureFromAuth en la app)
GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;

DROP POLICY IF EXISTS clientes_client_insert ON public.clientes;
CREATE POLICY clientes_client_insert
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
