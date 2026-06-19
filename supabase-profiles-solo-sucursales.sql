-- profiles = solo cuentas del salón (admin, admin_global, admin_sucursal, staff).
-- clientes = cuentas de la app clientes (auth.users enlazados por user_id).
-- Ejecutar en Supabase → SQL Editor (una vez, después de supabase-sucursales-login-fix.sql).

-- ─── 1) ensure_cliente_for_auth_user: permitir trigger auth (sin auth.uid()) ───

CREATE OR REPLACE FUNCTION public.ensure_cliente_for_auth_user(
  p_user_id uuid,
  p_nombre text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefono text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  nom text;
  em text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO cid FROM public.clientes WHERE user_id = p_user_id LIMIT 1;
  IF cid IS NOT NULL THEN
    RETURN cid;
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT COALESCE(public.is_staff_or_admin(), false) THEN
    RAISE EXCEPTION 'No autorizado para crear ficha de otro usuario';
  END IF;

  nom := COALESCE(NULLIF(trim(p_nombre), ''), 'Cliente');
  em := NULLIF(lower(trim(COALESCE(p_email, ''))), '');

  IF em IS NOT NULL THEN
    SELECT c.id INTO cid
    FROM public.clientes c
    WHERE c.user_id IS NULL
      AND c.email IS NOT NULL
      AND lower(trim(c.email)) = em
    ORDER BY c.created_at ASC NULLS LAST
    LIMIT 1;

    IF cid IS NOT NULL THEN
      UPDATE public.clientes c
      SET
        user_id = p_user_id,
        nombre = COALESCE(NULLIF(trim(c.nombre), ''), nom),
        email = COALESCE(c.email, NULLIF(trim(p_email), '')),
        tipo_registro = COALESCE(NULLIF(trim(c.tipo_registro), ''), 'app_clientes')
      WHERE c.id = cid;
      RETURN cid;
    END IF;
  END IF;

  INSERT INTO public.clientes (user_id, nombre, email, telefono, tipo_registro, categoria)
  VALUES (
    p_user_id,
    nom,
    NULLIF(trim(COALESCE(p_email, '')), ''),
    NULLIF(trim(COALESCE(p_telefono, '')), ''),
    'app_clientes',
    'Nuevo'
  )
  RETURNING id INTO cid;

  RETURN cid;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO cid FROM public.clientes WHERE user_id = p_user_id LIMIT 1;
    IF cid IS NOT NULL THEN
      RETURN cid;
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_cliente_for_auth_user(uuid, text, text, text) TO authenticated;

-- ─── 2) Trigger auth: clientes → tabla clientes; salón/sucursal → profiles ───

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
  v_email text;
BEGIN
  v_name := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  )), '');

  v_email := NULLIF(lower(trim(COALESCE(NEW.email, ''))), '');

  BEGIN
    v_sucursal_id := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'admin_sucursal_id', '')), '')::uuid;
  EXCEPTION
    WHEN others THEN
      v_sucursal_id := NULL;
  END;

  IF v_sucursal_id IS NOT NULL THEN
    v_role := 'admin_sucursal';
  ELSIF NEW.phone IS NOT NULL AND NEW.phone <> '' AND NEW.phone LIKE '+502999%' THEN
    v_role := 'client';
  ELSIF NEW.phone IS NOT NULL AND NEW.phone <> '' AND (NEW.email IS NULL OR NEW.email = '') THEN
    v_role := 'admin';
  ELSE
    v_role := 'client';
  END IF;

  IF v_role = 'client' THEN
    PERFORM public.ensure_cliente_for_auth_user(
      NEW.id,
      v_name,
      v_email,
      NULLIF(trim(COALESCE(NEW.phone, '')), '')
    );
    RETURN NEW;
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
    'staff',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    role = CASE
      WHEN EXCLUDED.sucursal_id IS NOT NULL THEN 'admin_sucursal'
      ELSE public.profiles.role
    END,
    sucursal_id = COALESCE(EXCLUDED.sucursal_id, public.profiles.sucursal_id),
    app_scope = 'staff';

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

-- ─── 3) Backfill: mover filas client de profiles → clientes y limpiar profiles ───

INSERT INTO public.clientes (user_id, nombre, email, telefono, tipo_registro, categoria)
SELECT
  p.id,
  COALESCE(
    NULLIF(trim(p.full_name), ''),
    NULLIF(trim(split_part(COALESCE(u.email, ''), '@', 1)), ''),
    'Cliente'
  ),
  NULLIF(trim(COALESCE(u.email, '')), ''),
  NULLIF(trim(COALESCE(p.phone, u.phone, '')), ''),
  'app_clientes',
  'Nuevo'
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'client'
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes c WHERE c.user_id = p.id
  );

UPDATE public.clientes c
SET
  nombre = COALESCE(NULLIF(trim(c.nombre), ''), NULLIF(trim(p.full_name), ''), c.nombre),
  email = COALESCE(NULLIF(trim(c.email), ''), NULLIF(trim(u.email), ''), c.email),
  telefono = COALESCE(NULLIF(trim(c.telefono), ''), NULLIF(trim(p.phone), ''), c.telefono)
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'client'
  AND c.user_id = p.id;

DELETE FROM public.profiles WHERE role = 'client';

-- ─── 4) profiles ya no admite rol client ───

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_rol_types;
ALTER TABLE public.profiles
  ADD CONSTRAINT check_rol_types
  CHECK (role IN ('admin', 'admin_global', 'admin_sucursal', 'staff'));

-- ─── 5) Eliminar cuenta app clientes (sin depender de profiles.role = client) ───

CREATE OR REPLACE FUNCTION public.cliente_eliminar_cuenta_propia()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cli_id uuid;
  v_staff_role text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin sesión activa');
  END IF;

  SELECT role INTO v_staff_role
  FROM public.profiles
  WHERE id = v_uid
    AND role IN ('admin', 'admin_global', 'admin_sucursal', 'staff')
  LIMIT 1;

  IF v_staff_role IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Esta acción solo está disponible para cuentas de clientes de la app.'
    );
  END IF;

  SELECT id INTO v_cli_id FROM public.clientes WHERE user_id = v_uid LIMIT 1;

  IF v_cli_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = v_uid AND u.email IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No se encontró una ficha de cliente para esta cuenta.');
  END IF;

  IF v_cli_id IS NOT NULL THEN
    UPDATE public.clientes
    SET
      user_id = NULL,
      email = NULL,
      photo_url = NULL,
      telefono = NULL,
      direccion = NULL,
      cumpleanos = NULL,
      contacto_emergencia = NULL,
      tel_emergencia = NULL,
      codigo_referido = NULL,
      referido_por = NULL,
      referido_codigo_pendiente = NULL,
      referido_beneficio_registrado = false,
      andreas_premios = '{}'::jsonb,
      nombre = COALESCE(NULLIF(trim(nombre), ''), 'Cuenta eliminada'),
      notas = trim(
        both E'\n' FROM
        COALESCE(notas, '') || E'\n[Cuenta app eliminada por el cliente · ' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ' UTC]'
      )
    WHERE id = v_cli_id;
  END IF;

  BEGIN
    DELETE FROM public.client_notifications WHERE client_user_id = v_uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  BEGIN
    DELETE FROM public.andreas_referido_validaciones
    WHERE referido_user_id = v_uid OR referidor_user_id = v_uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  DELETE FROM public.profiles WHERE id = v_uid;

  DELETE FROM auth.users WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'cliente_id', v_cli_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.cliente_eliminar_cuenta_propia() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cliente_eliminar_cuenta_propia() TO authenticated;
