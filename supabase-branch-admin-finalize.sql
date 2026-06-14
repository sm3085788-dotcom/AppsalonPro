-- ACTIVAR SUCURSALES EN APP SALÓN (ejecutar una vez en Supabase → SQL Editor → Run)

-- Preferí supabase-sucursales-login-fix.sql (incluye este fix + trigger + backfill login_phone).



CREATE OR REPLACE FUNCTION public.finalize_branch_admin_signup(p_sucursal_id uuid DEFAULT NULL)

RETURNS public.profiles

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

  uid uuid := auth.uid();

  v_sucursal_id uuid;

  v_name text;

  v_phone text;

  v_meta_sucursal uuid;

  v_branch_codigo text;

  row public.profiles;

BEGIN

  IF uid IS NULL THEN

    RAISE EXCEPTION 'Debes iniciar sesión primero';

  END IF;



  SELECT

    NULLIF(trim(COALESCE(u.phone, '')), ''),

    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'admin_sucursal_id', '')), '')::uuid,

    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'branch_codigo', '')), ''),

    NULLIF(trim(COALESCE(

      u.raw_user_meta_data->>'full_name',

      u.raw_user_meta_data->>'name',

      split_part(COALESCE(u.email, ''), '@', 1)

    )), '')

  INTO v_phone, v_meta_sucursal, v_branch_codigo, v_name

  FROM auth.users u

  WHERE u.id = uid;



  v_sucursal_id := COALESCE(NULLIF(p_sucursal_id, NULL), v_meta_sucursal);



  IF v_sucursal_id IS NULL AND v_branch_codigo IS NOT NULL THEN

    SELECT s.id INTO v_sucursal_id

    FROM public.sucursales s

    WHERE upper(trim(s.codigo)) = upper(trim(v_branch_codigo))

      AND s.activa = true

    LIMIT 1;

  END IF;



  IF v_sucursal_id IS NULL AND v_phone IS NOT NULL THEN

    SELECT s.id INTO v_sucursal_id

    FROM public.sucursales s

    WHERE s.activa = true

      AND (

        s.login_phone = v_phone

        OR public.branch_login_phone_from_codigo(s.codigo) = v_phone

      )

    ORDER BY s.es_matriz ASC, s.created_at ASC

    LIMIT 1;

  END IF;



  IF v_sucursal_id IS NULL THEN

    RAISE EXCEPTION 'Falta admin_sucursal_id en la cuenta. Volvé a activar desde matriz (Sucursales).';

  END IF;



  IF NOT EXISTS (

    SELECT 1

    FROM public.sucursales s

    WHERE s.id = v_sucursal_id

      AND s.activa = true

      AND (

        v_phone IS NULL

        OR s.login_phone = v_phone

        OR public.branch_login_phone_from_codigo(s.codigo) = v_phone

        OR v_meta_sucursal = s.id

        OR p_sucursal_id = s.id

      )

  ) THEN

    RAISE EXCEPTION 'Esta cuenta no coincide con la sucursal indicada.';

  END IF;



  INSERT INTO public.profiles (

    id, full_name, role, phone, sucursal_id, marketing_access, app_scope, community_enabled

  )

  SELECT

    uid,

    v_name,

    'admin_sucursal',

    v_phone,

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

    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),

    app_scope = 'staff'

  RETURNING * INTO row;



  RETURN row;

END;

$$;



GRANT EXECUTE ON FUNCTION public.finalize_branch_admin_signup(uuid) TO authenticated;


