-- Web catálogo + App Clientes: auth por teléfono (SMS/Twilio) con fix de seguridad en handle_new_user.
-- Ejecutar en Supabase → SQL Editor (una vez, después de supabase-profiles-solo-sucursales.sql).
--
-- ═══ CONFIGURACIÓN MANUAL (Supabase + Twilio) — Fase 5 ═══
-- 1. Dashboard → Authentication → Providers → Phone → habilitar.
-- 2. Twilio: Account SID, Auth Token, Message Service SID (o número SMS).
-- 3. Habilitar "Phone + Password" (registro con contraseña + confirmación SMS).
-- 4. Plantilla SMS en español si aplica (código de 6 dígitos).
-- 5. Probar con números de prueba Twilio/Supabase antes de producción.
--
-- Checklist E2E web-catalogo:
--   [ ] Registro GT +502 (8 dígitos) → OTP → ficha clientes, rol NO admin.
--   [ ] Registro US/CA +1 (10 dígitos) → OTP → misma ficha.
--   [ ] Login correo existente sin cambios.
--   [ ] Login teléfono con contraseña correcta/incorrecta.
--   [ ] Teléfono ya registrado → error claro (cliente_telefono_cuenta_activa).
--   [ ] Perfil: cumpleaños obligatorio; correo opcional; teléfono E.164.
--   [ ] +502999… rechazado en UI de registro cliente (sucursales internas).
-- Costo: cada registro/OTP = 1 SMS (tarifas distintas GT vs +1 en Twilio).

-- ─── 1) ensure_cliente_for_auth_user: enlace por teléfono (como email) ───

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
  tel text;
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
  tel := NULLIF(trim(COALESCE(p_telefono, '')), '');

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
        telefono = COALESCE(NULLIF(trim(c.telefono), ''), tel),
        tipo_registro = COALESCE(NULLIF(trim(c.tipo_registro), ''), 'app_clientes')
      WHERE c.id = cid;
      RETURN cid;
    END IF;
  END IF;

  IF tel IS NOT NULL THEN
    SELECT c.id INTO cid
    FROM public.clientes c
    WHERE c.user_id IS NULL
      AND c.telefono IS NOT NULL
      AND trim(c.telefono) = tel
    ORDER BY c.created_at ASC NULLS LAST
    LIMIT 1;

    IF cid IS NOT NULL THEN
      UPDATE public.clientes c
      SET
        user_id = p_user_id,
        nombre = COALESCE(NULLIF(trim(c.nombre), ''), nom),
        email = COALESCE(NULLIF(trim(c.email), ''), em),
        telefono = COALESCE(NULLIF(trim(c.telefono), ''), tel),
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
    tel,
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

-- ─── 2) handle_new_user: signup_source web/app → client; mantener ramas staff ───

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
  v_signup_source text;
  v_phone text;
BEGIN
  v_name := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  )), '');

  v_email := NULLIF(lower(trim(COALESCE(NEW.email, ''))), '');
  v_phone := NULLIF(trim(COALESCE(NEW.phone, '')), '');
  v_signup_source := lower(trim(COALESCE(NEW.raw_user_meta_data->>'signup_source', '')));

  BEGIN
    v_sucursal_id := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'admin_sucursal_id', '')), '')::uuid;
  EXCEPTION
    WHEN others THEN
      v_sucursal_id := NULL;
  END;

  -- Clientes web/app: siempre ficha en public.clientes (nunca admin por teléfono solo)
  IF v_signup_source IN ('web_catalogo', 'app_clientes') THEN
    PERFORM public.ensure_cliente_for_auth_user(
      NEW.id,
      v_name,
      v_email,
      v_phone
    );
    RETURN NEW;
  END IF;

  IF v_sucursal_id IS NOT NULL THEN
    v_role := 'admin_sucursal';
  ELSIF v_phone IS NOT NULL AND v_phone LIKE '+502999%' THEN
    v_role := 'client';
  ELSIF v_phone IS NOT NULL AND (NEW.email IS NULL OR NEW.email = '') THEN
    v_role := 'admin';
  ELSE
    v_role := 'client';
  END IF;

  IF v_role = 'client' THEN
    PERFORM public.ensure_cliente_for_auth_user(
      NEW.id,
      v_name,
      v_email,
      v_phone
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
    v_phone,
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

-- ─── 3) Registro: teléfono solo libre si no hay cuenta Auth activa ───────────

CREATE OR REPLACE FUNCTION public.cliente_telefono_cuenta_activa(p_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.phone IS NOT NULL
      AND trim(u.phone) = trim(COALESCE(p_phone, ''))
      AND NULLIF(trim(COALESCE(p_phone, '')), '') IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.cliente_telefono_cuenta_activa(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cliente_telefono_cuenta_activa(text) TO anon;
GRANT EXECUTE ON FUNCTION public.cliente_telefono_cuenta_activa(text) TO authenticated;
