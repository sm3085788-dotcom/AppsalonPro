-- Referidos ANDREAS: vincular al registrarse + validar al entregar pedido en salón
-- Ejecutar en Supabase SQL Editor después de:
--   supabase-andreas-premios.sql
--   supabase-membresias-referidos-programa.sql
--   supabase-referidos-cadena-sistema.sql  ← cadena automática para todos los clientes

-- ─── Helper (también en cadena-sistema; idempotente) ─────────────────────────
CREATE OR REPLACE FUNCTION public.codigo_referido_from_user_id(p_uid uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_uid IS NULL THEN NULL
    WHEN length(replace(p_uid::text, '-', '')) < 8 THEN
      'ANDREAS-' || upper(substring(replace(p_uid::text, '-', ''), 1, 12))
    ELSE
      'ANDREAS-' || upper(
        substring(r from 1 for 6) || substring(r from greatest(1, length(r) - 5) for 6)
      )
  END
  FROM (SELECT replace(p_uid::text, '-', '') AS r) s;
$$;

-- ─── Aplicar código referido al registrarse (App Clientes) ─────────────────────
CREATE OR REPLACE FUNCTION public.cliente_aplicar_codigo_referido(
  p_user_id uuid,
  p_codigo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cli public.clientes%ROWTYPE;
  v_cod text := upper(trim(coalesce(p_codigo, '')));
  v_ref_uid uuid;
BEGIN
  IF p_user_id IS NULL OR v_cod = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código inválido');
  END IF;

  -- SQL Editor / service role: auth.uid() es null → permitir (admin)
  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT COALESCE(public.is_staff_or_admin(), false)
     AND NOT COALESCE(public.is_admin_sucursal(), false)
     AND NOT COALESCE(public.is_admin_global(), false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autorizado');
  END IF;

  SELECT * INTO v_cli FROM public.clientes WHERE user_id = p_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin ficha cliente');
  END IF;

  IF v_cli.referido_beneficio_registrado THEN
    RETURN jsonb_build_object('ok', true, 'already_validated', true);
  END IF;

  IF v_cli.referido_por IS NOT NULL THEN
    PERFORM public.referido_registrar_invitacion(v_cli.id);
    RETURN jsonb_build_object('ok', true, 'already_linked', true, 'referidor', v_cli.referido_por);
  END IF;

  SELECT public.resolve_codigo_referido_andreas(v_cod) INTO v_ref_uid;

  IF v_ref_uid IS NULL THEN
    SELECT c.user_id INTO v_ref_uid
    FROM public.clientes c
    WHERE c.user_id IS NOT NULL
      AND c.codigo_referido IS NOT NULL
      AND upper(trim(c.codigo_referido)) = v_cod
    LIMIT 1;
  END IF;

  IF v_ref_uid IS NULL THEN
    SELECT c.user_id INTO v_ref_uid
    FROM public.clientes c
    WHERE c.user_id IS NOT NULL
      AND public.codigo_referido_from_user_id(c.user_id) = v_cod
    LIMIT 1;
  END IF;

  IF v_ref_uid IS NULL OR v_ref_uid = p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código de referido no encontrado');
  END IF;

  UPDATE public.clientes
  SET
    referido_por = v_ref_uid,
    referido_codigo_pendiente = v_cod
  WHERE id = v_cli.id;

  PERFORM public.referido_registrar_invitacion(v_cli.id);

  RETURN jsonb_build_object('ok', true, 'referidor', v_ref_uid, 'codigo', v_cod);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cliente_aplicar_codigo_referido(uuid, text) TO authenticated;

-- ─── Validar primera compra (matriz o sucursal) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.validar_referido_primera_compra(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.ecommerce_orders%ROWTYPE;
  v_ref_cli public.clientes%ROWTYPE;
  v_refidor public.clientes%ROWTYPE;
  v_snap jsonb;
  v_codigo text;
  v_referidor_uid uuid;
  v_new_id uuid;
  v_cod_refidor text;
BEGIN
  IF NOT (
    COALESCE(public.is_staff_or_admin(), false)
    OR COALESCE(public.is_admin_sucursal(), false)
    OR COALESCE(public.is_admin_global(), false)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permisos de salón');
  END IF;

  SELECT * INTO v_order FROM public.ecommerce_orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.client_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'sin_cliente');
  END IF;

  SELECT * INTO v_ref_cli FROM public.clientes WHERE user_id = v_order.client_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'sin_ficha');
  END IF;

  IF v_ref_cli.referido_beneficio_registrado THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'ya_registrado');
  END IF;

  v_snap := COALESCE(v_order.checkout_snapshot, '{}'::jsonb);
  v_codigo := upper(trim(COALESCE(
    v_snap->>'referidor_codigo',
    v_ref_cli.referido_codigo_pendiente,
    ''
  )));
  v_referidor_uid := COALESCE(
    NULLIF(v_snap->>'referidor_user_id', '')::uuid,
    v_ref_cli.referido_por
  );

  IF v_referidor_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'sin_referidor');
  END IF;

  SELECT * INTO v_refidor FROM public.clientes WHERE user_id = v_referidor_uid LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Referidor sin ficha');
  END IF;

  v_cod_refidor := upper(trim(COALESCE(
    v_refidor.codigo_referido,
    public.codigo_referido_from_user_id(v_refidor.user_id),
    ''
  )));

  IF v_codigo = '' AND v_cod_refidor <> '' THEN
    v_codigo := v_cod_refidor;
  END IF;

  IF v_codigo <> '' AND v_cod_refidor <> '' AND v_codigo <> v_cod_refidor THEN
    IF v_ref_cli.referido_por IS DISTINCT FROM v_referidor_uid THEN
      RETURN jsonb_build_object('ok', false, 'error', 'El código de referido no coincide con el referidor.');
    END IF;
    v_codigo := v_cod_refidor;
  END IF;

  INSERT INTO public.andreas_referido_validaciones (
    referidor_user_id, referido_user_id, referido_cliente_id, tipo, estado,
    order_id, codigo_referido_usado, referidos_ciclo_referidor
  ) VALUES (
    v_referidor_uid, v_ref_cli.user_id, v_ref_cli.id, 'primera_compra', 'validado',
    p_order_id, NULLIF(v_codigo, ''), COALESCE((v_refidor.andreas_premios->>'referidos_ciclo')::int, 0)
  )
  ON CONFLICT (referido_user_id) DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'ya_validado');
  END IF;

  UPDATE public.clientes
  SET referido_beneficio_registrado = true, referido_codigo_pendiente = NULL
  WHERE id = v_ref_cli.id;

  PERFORM public._incrementar_referidor_andreas(v_referidor_uid);

  RETURN jsonb_build_object(
    'ok', true,
    'tipo', 'primera_compra',
    'referidor', v_referidor_uid,
    'referido', v_ref_cli.user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_referido_primera_compra(uuid) TO authenticated;

-- ─── Validar primera cita: sucursal también ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.validar_referido_primera_cita(p_cita_id uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cita public.citas%ROWTYPE;
  v_ref_cli public.clientes%ROWTYPE;
  v_refidor public.clientes%ROWTYPE;
  v_ref_uid uuid;
  v_codigo text;
  v_new_id uuid;
BEGIN
  IF NOT (
    COALESCE(public.is_staff_or_admin(), false)
    OR COALESCE(public.is_admin_sucursal(), false)
    OR COALESCE(public.is_admin_global(), false)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permisos');
  END IF;

  SELECT * INTO v_cita FROM public.citas WHERE id = p_cita_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cita no encontrada');
  END IF;
  IF upper(trim(COALESCE(v_cita.visita_qr_token, ''))) <> upper(trim(COALESCE(p_token, ''))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'QR de visita incorrecto');
  END IF;
  IF v_cita.visita_validada_en IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Visita ya validada');
  END IF;
  IF lower(trim(coalesce(v_cita.estado, ''))) NOT IN ('confirmado', 'confirmada', 'completado', 'completada') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La cita debe estar confirmada');
  END IF;

  SELECT * INTO v_ref_cli FROM public.clientes WHERE id = v_cita.cliente_id LIMIT 1;
  IF NOT FOUND OR v_ref_cli.user_id IS NULL OR v_ref_cli.referido_beneficio_registrado THEN
    UPDATE public.citas SET visita_validada_en = now(), estado = 'completada' WHERE id = p_cita_id;
    RETURN jsonb_build_object('ok', true, 'skip', true, 'reason', 'sin_referido_pendiente');
  END IF;

  v_ref_uid := v_ref_cli.referido_por;
  v_codigo := upper(trim(COALESCE(v_ref_cli.referido_codigo_pendiente, '')));
  IF v_ref_uid IS NULL THEN
    UPDATE public.citas SET visita_validada_en = now(), estado = 'completada' WHERE id = p_cita_id;
    RETURN jsonb_build_object('ok', true, 'skip', true);
  END IF;

  SELECT * INTO v_refidor FROM public.clientes WHERE user_id = v_ref_uid LIMIT 1;
  IF v_codigo = '' THEN
    v_codigo := upper(trim(COALESCE(
      v_refidor.codigo_referido,
      public.codigo_referido_from_user_id(v_refidor.user_id),
      ''
    )));
  END IF;

  INSERT INTO public.andreas_referido_validaciones (
    referidor_user_id, referido_user_id, referido_cliente_id, tipo, estado,
    cita_id, codigo_referido_usado, referidos_ciclo_referidor
  ) VALUES (
    v_ref_uid, v_ref_cli.user_id, v_ref_cli.id, 'primera_cita', 'validado',
    p_cita_id, NULLIF(v_codigo, ''), COALESCE((v_refidor.andreas_premios->>'referidos_ciclo')::int, 0)
  )
  ON CONFLICT (referido_user_id) DO NOTHING
  RETURNING id INTO v_new_id;

  UPDATE public.citas SET visita_validada_en = now(), estado = 'completada' WHERE id = p_cita_id;

  IF v_new_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skip', true, 'reason', 'ya_validado');
  END IF;

  UPDATE public.clientes
  SET referido_beneficio_registrado = true, referido_codigo_pendiente = NULL
  WHERE id = v_ref_cli.id;

  PERFORM public._incrementar_referidor_andreas(v_ref_uid);

  RETURN jsonb_build_object('ok', true, 'tipo', 'primera_cita');
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_referido_primera_cita(uuid, text) TO authenticated;
