-- AppSalon Pro — admin_sucursal al registrarse desde App Salón (después de crear sucursal)
-- Ejecutar en Supabase SQL Editor (una vez, después de supabase-sucursales-setup.sql).

-- Vincular manualmente (admin global) si el trigger no aplicó metadata
CREATE OR REPLACE FUNCTION public.vincular_admin_sucursal(
  p_sucursal_id uuid,
  p_user_id uuid,
  p_nombre text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.profiles;
BEGIN
  IF NOT public.is_admin_global() THEN
    RAISE EXCEPTION 'Solo admin global puede vincular admin_sucursal';
  END IF;
  IF p_sucursal_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'sucursal_id y user_id son obligatorios';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sucursales s WHERE s.id = p_sucursal_id AND s.activa = true) THEN
    RAISE EXCEPTION 'Sucursal no encontrada o inactiva';
  END IF;

  UPDATE public.profiles
  SET
    role = 'admin_sucursal',
    sucursal_id = p_sucursal_id,
    full_name = COALESCE(NULLIF(trim(p_nombre), ''), full_name)
  WHERE id = p_user_id
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    INSERT INTO public.profiles (id, full_name, role, sucursal_id, phone, marketing_access, app_scope, community_enabled)
    SELECT
      p_user_id,
      NULLIF(trim(COALESCE(p_nombre, '')), ''),
      'admin_sucursal',
      p_sucursal_id,
      u.phone,
      false,
      'staff',
      true
    FROM auth.users u
    WHERE u.id = p_user_id
    RETURNING * INTO row;
  END IF;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vincular_admin_sucursal(uuid, uuid, text) TO authenticated;

-- Tras signUp de sucursal: el propio usuario confirma rol admin_sucursal desde su metadata
CREATE OR REPLACE FUNCTION public.finalize_branch_admin_signup()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_sucursal_id uuid;
  v_name text;
  row public.profiles;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión primero';
  END IF;

  SELECT
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'admin_sucursal_id', '')), '')::uuid,
    NULLIF(trim(COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(COALESCE(u.email, ''), '@', 1)
    )), '')
  INTO v_sucursal_id, v_name
  FROM auth.users u
  WHERE u.id = uid;

  IF v_sucursal_id IS NULL THEN
    RAISE EXCEPTION 'Falta admin_sucursal_id en la cuenta. Volvé a activar desde matriz (Sucursales).';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.sucursales s WHERE s.id = v_sucursal_id AND s.activa = true) THEN
    RAISE EXCEPTION 'Sucursal no encontrada o inactiva';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, role, phone, sucursal_id, marketing_access, app_scope, community_enabled
  )
  SELECT
    uid,
    v_name,
    'admin_sucursal',
    NULLIF(trim(u.phone), ''),
    v_sucursal_id,
    false,
    'staff',
    true
  FROM auth.users u
  WHERE u.id = uid
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = 'admin_sucursal',
    sucursal_id = EXCLUDED.sucursal_id,
    app_scope = 'staff'
  RETURNING * INTO row;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_branch_admin_signup() TO authenticated;

-- Trigger auth: metadata admin_sucursal_id → profiles admin_sucursal
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_role text;
  v_sucursal_id uuid;
BEGIN
  v_name := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  )), '');

  BEGIN
    v_sucursal_id := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'admin_sucursal_id', '')), '')::uuid;
  EXCEPTION
    WHEN others THEN
      v_sucursal_id := NULL;
  END;

  IF v_sucursal_id IS NOT NULL THEN
    v_role := 'admin_sucursal';
  ELSIF NEW.phone IS NOT NULL AND NEW.phone <> '' AND (NEW.email IS NULL OR NEW.email = '') THEN
    v_role := 'admin';
  ELSE
    v_role := 'client';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    phone,
    sucursal_id,
    marketing_access,
    app_scope,
    community_enabled
  )
  VALUES (
    NEW.id,
    v_name,
    v_role,
    NULLIF(trim(NEW.phone), ''),
    v_sucursal_id,
    false,
    CASE WHEN v_role = 'client' THEN 'clientes' ELSE 'staff' END,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    role = CASE
      WHEN EXCLUDED.sucursal_id IS NOT NULL THEN 'admin_sucursal'
      ELSE public.profiles.role
    END,
    sucursal_id = COALESCE(EXCLUDED.sucursal_id, public.profiles.sucursal_id);

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
