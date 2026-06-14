-- App Clientes: el usuario elimina su propia cuenta (Auth + desvincular ficha).
-- Ejecutar en Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.cliente_eliminar_cuenta_propia()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cli_id uuid;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin sesión activa');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid LIMIT 1;
  IF v_role IS NOT NULL AND v_role <> 'client' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Esta acción solo está disponible para cuentas de clientes de la app.'
    );
  END IF;

  SELECT id INTO v_cli_id FROM public.clientes WHERE user_id = v_uid LIMIT 1;

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

-- ─── Registro: correo solo libre si no hay cuenta Auth activa ─────────────────

CREATE OR REPLACE FUNCTION public.cliente_correo_cuenta_activa(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.email IS NOT NULL
      AND lower(trim(u.email)) = lower(trim(COALESCE(p_email, '')))
      AND NULLIF(trim(COALESCE(p_email, '')), '') IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.cliente_correo_cuenta_activa(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cliente_correo_cuenta_activa(text) TO anon;
GRANT EXECUTE ON FUNCTION public.cliente_correo_cuenta_activa(text) TO authenticated;
