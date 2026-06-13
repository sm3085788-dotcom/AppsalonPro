-- ACTIVAR SUCURSALES EN APP SALÓN (ejecutar una vez en Supabase → SQL Editor → Run)
-- Si ya corriste supabase-sucursales-admin-trigger.sql, alcanza con este archivo solo.

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
