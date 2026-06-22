-- Membresías 29 días · referidos ANDREAS (3 premios) · validación en salón
-- Ejecutar en Supabase SQL Editor después de supabase-membresias-setup.sql y supabase-andreas-premios.sql

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS membresia_vence_en timestamptz,
  ADD COLUMN IF NOT EXISTS referido_beneficio_registrado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referido_codigo_pendiente text;

COMMENT ON COLUMN public.clientes.membresia_vence_en IS 'Fin de vigencia membresía (29 días desde activación).';
COMMENT ON COLUMN public.clientes.referido_beneficio_registrado IS 'True cuando ya se validó su primera compra o primera visita por referido.';
COMMENT ON COLUMN public.clientes.referido_codigo_pendiente IS 'Código del referidor guardado al registrarse (uso único en primera compra).';

CREATE TABLE IF NOT EXISTS public.andreas_referido_validaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referidor_user_id uuid NOT NULL,
  referido_user_id uuid NOT NULL,
  referido_cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('primera_compra', 'primera_cita')),
  estado text NOT NULL DEFAULT 'validado' CHECK (estado IN ('pendiente', 'validado')),
  order_id uuid REFERENCES public.ecommerce_orders(id) ON DELETE SET NULL,
  cita_id uuid,
  codigo_referido_usado text,
  referidos_ciclo_referidor smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  validado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT andreas_referido_validaciones_referido_unique UNIQUE (referido_user_id)
);

CREATE INDEX IF NOT EXISTS andreas_ref_val_referidor_idx
  ON public.andreas_referido_validaciones (referidor_user_id);

ALTER TABLE public.andreas_referido_validaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS andreas_ref_val_staff_select ON public.andreas_referido_validaciones;
CREATE POLICY andreas_ref_val_staff_select ON public.andreas_referido_validaciones
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin() OR referidor_user_id = auth.uid() OR referido_user_id = auth.uid());

-- ─── Membresía: 29 días al canjear ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.redeem_membresia_codigo(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cliente public.clientes%ROWTYPE;
  v_row public.membresia_codigos%ROWTYPE;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_vence timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión.');
  END IF;
  IF v_codigo = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ingresá un código válido.');
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE user_id = v_uid LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No hay ficha de cliente vinculada a tu cuenta.');
  END IF;

  SELECT * INTO v_row
  FROM public.membresia_codigos
  WHERE upper(codigo) = v_codigo AND activo = true AND usado_en IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código inválido, ya usado o vencido.');
  END IF;
  IF v_row.cliente_id IS DISTINCT FROM v_cliente.id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este código no corresponde a tu perfil. Pedí uno nuevo en el salón.');
  END IF;

  v_vence := now() + interval '29 days';

  UPDATE public.membresia_codigos SET usado_en = now() WHERE id = v_row.id;

  UPDATE public.clientes
  SET
    membresia_nivel = v_row.nivel,
    membresia_activada_en = now(),
    membresia_vence_en = v_vence,
    categoria = CASE v_row.nivel
      WHEN 'vip' THEN 'VIP' WHEN 'plata' THEN 'Plata' WHEN 'bronce' THEN 'Bronce' ELSE categoria
    END
  WHERE id = v_cliente.id;

  RETURN jsonb_build_object(
    'ok', true, 'nivel', v_row.nivel, 'label', initcap(v_row.nivel),
    'vence_en', v_vence, 'dias_vigencia', 29
  );
END;
$$;

-- Sincroniza vencimiento (app clientes / salón al abrir ficha)
CREATE OR REPLACE FUNCTION public.sync_membresia_cliente(p_cliente_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cliente public.clientes%ROWTYPE;
  v_days int;
BEGIN
  IF p_cliente_id IS NOT NULL THEN
    SELECT * INTO v_cliente FROM public.clientes WHERE id = p_cliente_id LIMIT 1;
  ELSIF v_uid IS NOT NULL THEN
    SELECT * INTO v_cliente FROM public.clientes WHERE user_id = v_uid LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cliente no encontrado');
  END IF;

  IF v_cliente.membresia_nivel IS NOT NULL
     AND v_cliente.membresia_vence_en IS NOT NULL
     AND v_cliente.membresia_vence_en < now() THEN
    UPDATE public.clientes
    SET membresia_nivel = NULL, membresia_activada_en = NULL, membresia_vence_en = NULL
    WHERE id = v_cliente.id;
    RETURN jsonb_build_object(
      'ok', true, 'expired', true, 'restored', 'estandar',
      'message', 'Tu cuenta ha sido restaurada a Estándar. Para activar de nuevo la membresía, pedí un nuevo código en el salón.'
    );
  END IF;

  IF v_cliente.membresia_nivel IS NOT NULL AND v_cliente.membresia_vence_en IS NOT NULL THEN
    v_days := GREATEST(0, EXTRACT(day FROM (v_cliente.membresia_vence_en - now()))::int);
    RETURN jsonb_build_object(
      'ok', true, 'active', true, 'nivel', v_cliente.membresia_nivel,
      'vence_en', v_cliente.membresia_vence_en, 'days_left', v_days,
      'renewal_reminder', v_days <= 3
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'active', false, 'nivel', null, 'restored', 'estandar');
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_membresia_cliente(uuid) TO authenticated;

-- Staff: asignación directa también 29 días
CREATE OR REPLACE FUNCTION public.staff_set_membresia_nivel(p_cliente_id uuid, p_nivel text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permisos');
  END IF;
  IF p_nivel NOT IN ('bronce', 'plata', 'vip') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nivel inválido');
  END IF;
  UPDATE public.clientes
  SET
    membresia_nivel = p_nivel,
    membresia_activada_en = now(),
    membresia_vence_en = now() + interval '29 days',
    categoria = initcap(p_nivel)
  WHERE id = p_cliente_id;
  RETURN jsonb_build_object('ok', true, 'vence_en', now() + interval '29 days');
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_set_membresia_nivel(uuid, text) TO authenticated;

-- ─── Referidos: contador por ciclo (3 premios) ────────────────────────────────

CREATE OR REPLACE FUNCTION public.premios_andreas_referidos_resumen(p_referidor uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cli public.clientes%ROWTYPE;
  v_ap jsonb;
  v_ciclo int := 0;
  v_en_ciclo int := 0;
BEGIN
  SELECT * INTO v_cli FROM public.clientes WHERE user_id = p_referidor LIMIT 1;
  v_ap := COALESCE(v_cli.andreas_premios, '{}'::jsonb);
  v_ciclo := COALESCE((v_ap->>'referidos_ciclo')::int, 0);
  v_en_ciclo := COALESCE((v_ap->>'referidos_en_ciclo')::int, 0);
  IF v_ciclo < 0 OR v_ciclo > 2 THEN v_ciclo := 0; END IF;
  IF v_en_ciclo < 0 THEN v_en_ciclo := 0; END IF;
  IF v_en_ciclo > 3 THEN v_en_ciclo := 3; END IF;

  RETURN jsonb_build_object(
    'ciclo', v_ciclo,
    'en_ciclo', v_en_ciclo,
    'meta', 3,
    'total_validados', (SELECT COUNT(*)::int FROM public.andreas_referido_validaciones WHERE referidor_user_id = p_referidor)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.premios_andreas_referidos_resumen(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public._incrementar_referidor_andreas(p_referidor uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cli public.clientes%ROWTYPE;
  v_ap jsonb;
  v_ciclo int;
  v_en int;
BEGIN
  SELECT * INTO v_cli FROM public.clientes WHERE user_id = p_referidor FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  v_ap := COALESCE(v_cli.andreas_premios, '{}'::jsonb);
  v_ciclo := COALESCE((v_ap->>'referidos_ciclo')::int, 0);
  v_en := COALESCE((v_ap->>'referidos_en_ciclo')::int, 0) + 1;
  IF v_en >= 3 THEN
    v_ap := v_ap || jsonb_build_object(
      'referidos_canje_pendiente', jsonb_build_object(
        'at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'ciclo', v_ciclo
      )
    );
    v_en := 0;
    v_ciclo := (v_ciclo + 1) % 3;
  END IF;
  v_ap := v_ap || jsonb_build_object('referidos_ciclo', v_ciclo, 'referidos_en_ciclo', v_en);
  UPDATE public.clientes SET andreas_premios = v_ap WHERE id = v_cli.id;
END;
$$;

-- Validar primera compra al entregar pedido (QR cobro en salón)
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
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permisos de salón');
  END IF;

  SELECT * INTO v_order FROM public.ecommerce_orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.client_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'sin_cliente');
  END IF;

  SELECT * INTO v_ref_cli FROM public.clientes WHERE user_id = v_order.client_user_id LIMIT 1;
  IF NOT FOUND OR v_ref_cli.referido_beneficio_registrado THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'ya_registrado_o_sin_ficha');
  END IF;

  v_snap := COALESCE(v_order.checkout_snapshot, '{}'::jsonb);
  v_codigo := upper(trim(COALESCE(v_snap->>'referidor_codigo', v_ref_cli.referido_codigo_pendiente, '')));
  v_referidor_uid := COALESCE((v_snap->>'referidor_user_id')::uuid, v_ref_cli.referido_por);

  IF v_referidor_uid IS NULL OR v_codigo = '' THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'sin_referidor');
  END IF;

  SELECT * INTO v_refidor FROM public.clientes WHERE user_id = v_referidor_uid LIMIT 1;
  IF NOT FOUND OR upper(trim(COALESCE(v_refidor.codigo_referido, ''))) <> v_codigo THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El código de referido no coincide con el referidor.');
  END IF;

  INSERT INTO public.andreas_referido_validaciones (
    referidor_user_id, referido_user_id, referido_cliente_id, tipo, estado,
    order_id, codigo_referido_usado, referidos_ciclo_referidor
  ) VALUES (
    v_referidor_uid, v_ref_cli.user_id, v_ref_cli.id, 'primera_compra', 'validado',
    p_order_id, v_codigo, COALESCE((v_refidor.andreas_premios->>'referidos_ciclo')::int, 0)
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

  RETURN jsonb_build_object('ok', true, 'tipo', 'primera_compra', 'referidor', v_referidor_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_referido_primera_compra(uuid) TO authenticated;

-- Código referidor para checkout (app clientes)
CREATE OR REPLACE FUNCTION public.cliente_referidor_checkout_info(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(p_user_id, auth.uid());
  v_cli public.clientes%ROWTYPE;
  v_ref_uid uuid;
  v_ref_cli public.clientes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  SELECT * INTO v_cli FROM public.clientes WHERE user_id = v_uid LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false);
  END IF;
  IF v_cli.referido_beneficio_registrado OR v_cli.referido_por IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'needs_code', false);
  END IF;
  v_ref_uid := v_cli.referido_por;
  SELECT * INTO v_ref_cli FROM public.clientes WHERE user_id = v_ref_uid LIMIT 1;
  RETURN jsonb_build_object(
    'ok', true,
    'needs_code', true,
    'referidor_user_id', v_ref_uid,
    'referidor_codigo', COALESCE(v_cli.referido_codigo_pendiente, v_ref_cli.codigo_referido),
    'referidor_nombre', v_ref_cli.nombre
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cliente_referidor_checkout_info(uuid) TO authenticated;

-- Reemplazar contador legacy por validaciones verificadas en ciclo actual
CREATE OR REPLACE FUNCTION public.premios_andreas_referidos_primera_compra(p_referidor uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((c.andreas_premios->>'referidos_en_ciclo')::integer, 0)
  FROM public.clientes c
  WHERE c.user_id = p_referidor
  LIMIT 1;
$$;

-- Visita cita referido: token en citas
ALTER TABLE public.citas
  ADD COLUMN IF NOT EXISTS visita_qr_token text,
  ADD COLUMN IF NOT EXISTS visita_validada_en timestamptz;

-- Token visita sin depender de pgcrypto (gen_random_bytes)
CREATE OR REPLACE FUNCTION public._cita_nuevo_visita_token()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 16));
$$;

CREATE OR REPLACE FUNCTION public.cita_generar_visita_qr(p_cita_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Sin permisos';
  END IF;
  v_token := public._cita_nuevo_visita_token();
  UPDATE public.citas SET visita_qr_token = v_token WHERE id = p_cita_id;
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cita_generar_visita_qr(uuid) TO authenticated;

-- Cliente dueño o staff: QR de visita para citas confirmadas (idempotente)
CREATE OR REPLACE FUNCTION public.cita_asegurar_visita_qr(p_cita_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cita public.citas%ROWTYPE;
  v_token text;
  v_estado text;
BEGIN
  SELECT * INTO v_cita FROM public.citas WHERE id = p_cita_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cita no encontrada';
  END IF;

  IF public.is_staff_or_admin() THEN
    NULL;
  ELSIF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión';
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = v_cita.cliente_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No tenés permiso sobre esta cita';
  END IF;

  v_estado := lower(trim(coalesce(v_cita.estado, '')));
  IF v_estado NOT IN ('confirmado', 'confirmada') THEN
    RAISE EXCEPTION 'El salón debe confirmar la cita antes de generar el QR de visita';
  END IF;

  IF v_cita.visita_validada_en IS NOT NULL THEN
    RETURN COALESCE(v_cita.visita_qr_token, '');
  END IF;

  IF COALESCE(trim(v_cita.visita_qr_token), '') <> '' THEN
    RETURN upper(trim(v_cita.visita_qr_token));
  END IF;

  v_token := public._cita_nuevo_visita_token();
  UPDATE public.citas SET visita_qr_token = v_token WHERE id = p_cita_id;
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cita_asegurar_visita_qr(uuid) TO authenticated;

-- Todas las citas confirmadas del cliente autenticado sin QR → genera token
CREATE OR REPLACE FUNCTION public.citas_sync_visita_qr_cliente()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.citas%ROWTYPE;
  v_token text;
  v_count int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión');
  END IF;

  FOR v_row IN
    SELECT ct.*
    FROM public.citas ct
    INNER JOIN public.clientes cl ON cl.id = ct.cliente_id AND cl.user_id = v_uid
    WHERE lower(trim(coalesce(ct.estado, ''))) IN ('confirmado', 'confirmada')
      AND ct.visita_validada_en IS NULL
      AND coalesce(trim(ct.visita_qr_token), '') = ''
  LOOP
    v_token := public._cita_nuevo_visita_token();
    UPDATE public.citas SET visita_qr_token = v_token WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'generados', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.citas_sync_visita_qr_cliente() TO authenticated;

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
  IF NOT public.is_staff_or_admin() THEN
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
    UPDATE public.citas
    SET visita_validada_en = now(), estado = 'completada'
    WHERE id = p_cita_id;
    RETURN jsonb_build_object('ok', true, 'skip', true, 'reason', 'sin_referido_pendiente');
  END IF;

  v_ref_uid := v_ref_cli.referido_por;
  v_codigo := upper(trim(COALESCE(v_ref_cli.referido_codigo_pendiente, '')));
  IF v_ref_uid IS NULL THEN
    UPDATE public.citas
    SET visita_validada_en = now(), estado = 'completada'
    WHERE id = p_cita_id;
    RETURN jsonb_build_object('ok', true, 'skip', true);
  END IF;

  SELECT * INTO v_refidor FROM public.clientes WHERE user_id = v_ref_uid LIMIT 1;
  IF v_codigo = '' THEN
    v_codigo := upper(trim(COALESCE(v_refidor.codigo_referido, '')));
  END IF;

  INSERT INTO public.andreas_referido_validaciones (
    referidor_user_id, referido_user_id, referido_cliente_id, tipo, estado,
    cita_id, codigo_referido_usado, referidos_ciclo_referidor
  ) VALUES (
    v_ref_uid, v_ref_cli.user_id, v_ref_cli.id, 'primera_cita', 'validado',
    p_cita_id, v_codigo, COALESCE((v_refidor.andreas_premios->>'referidos_ciclo')::int, 0)
  )
  ON CONFLICT (referido_user_id) DO NOTHING
  RETURNING id INTO v_new_id;

  UPDATE public.citas
  SET visita_validada_en = now(), estado = 'completada'
  WHERE id = p_cita_id;

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

-- Invitado por referido: marca bienvenida en andreas_premios (puntos en app Estándar)
CREATE OR REPLACE FUNCTION public.referido_registrar_invitacion(p_cliente_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cli public.clientes%ROWTYPE;
  v_ap jsonb;
BEGIN
  IF p_cliente_id IS NOT NULL THEN
    SELECT * INTO v_cli FROM public.clientes WHERE id = p_cliente_id LIMIT 1;
  ELSIF v_uid IS NOT NULL THEN
    SELECT * INTO v_cli FROM public.clientes WHERE user_id = v_uid LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cliente no encontrado');
  END IF;
  IF v_cli.referido_por IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skip', true, 'reason', 'sin_referidor');
  END IF;
  IF COALESCE((v_cli.andreas_premios->>'referido_invitado')::boolean, false) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  v_ap := COALESCE(v_cli.andreas_premios, '{}'::jsonb)
    || jsonb_build_object('referido_invitado', true, 'referido_invitado_en', now());

  UPDATE public.clientes SET andreas_premios = v_ap WHERE id = v_cli.id;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Invitación ANDREAS: tus compras y citas suman puntos en cuenta Estándar.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.referido_registrar_invitacion(uuid) TO authenticated;
