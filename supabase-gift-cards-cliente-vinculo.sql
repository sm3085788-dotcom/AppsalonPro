-- AppSalon Pro — Vinculación tarjetas regalo ↔ clientes + códigos ACT simples
-- Ejecutar en Supabase → SQL Editor (después de supabase-gift-cards.sql y activation-codes)

-- ── Columnas vinculación ─────────────────────────────────────────────────────

ALTER TABLE public.gift_cards
  ADD COLUMN IF NOT EXISTS cliente_vinculado_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vinculado_en timestamptz,
  ADD COLUMN IF NOT EXISTS vinculado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gift_cards_cliente_vinculado_idx
  ON public.gift_cards (cliente_vinculado_id)
  WHERE cliente_vinculado_id IS NOT NULL;

ALTER TABLE public.gift_card_usos
  ADD COLUMN IF NOT EXISTS venta_id uuid REFERENCES public.ventas(id) ON DELETE SET NULL;

-- ── Códigos ACT: 6 dígitos (compatibles con códigos antiguos de 8 alfanuméricos) ──

CREATE OR REPLACE FUNCTION public.generate_gift_card_activation_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  result text;
  attempts int := 0;
BEGIN
  LOOP
    result := 'ACT-' || lpad((floor(random() * 1000000))::int::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.gift_card_activation_codes g
      WHERE upper(g.codigo_activacion) = upper(result)
    );
    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'No se pudo generar código de activación único';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- ── Helpers JSON tarjeta staff ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gift_card_staff_json(p_row public.gift_cards)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_cliente_nombre text;
BEGIN
  IF p_row.cliente_vinculado_id IS NOT NULL THEN
    SELECT c.nombre INTO v_cliente_nombre
    FROM public.clientes c
    WHERE c.id = p_row.cliente_vinculado_id
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'id', p_row.id,
    'codigo', p_row.codigo,
    'monto_inicial', p_row.monto_inicial,
    'saldo', p_row.saldo,
    'para_nombre', p_row.para_nombre,
    'de_nombre', p_row.de_nombre,
    'mensaje', p_row.mensaje,
    'estado', p_row.estado,
    'emitida_en', p_row.emitida_en,
    'vence_en', p_row.vence_en,
    'activada_en', p_row.activada_en,
    'activada_en_sucursal_id', p_row.activada_en_sucursal_id,
    'cliente_vinculado_id', p_row.cliente_vinculado_id,
    'cliente_vinculado_nombre', v_cliente_nombre,
    'vinculado_en', p_row.vinculado_en
  );
END;
$$;

-- ── Consultas staff (actualizadas) ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lookup_gift_card_staff(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.gift_cards%ROWTYPE;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_estado text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF v_codigo = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código inválido.');
  END IF;

  SELECT * INTO v_row FROM public.gift_cards WHERE upper(codigo) = v_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta no encontrada.');
  END IF;

  v_estado := public.gift_card_refresh_estado(v_row);
  IF v_estado = 'expired' AND v_row.estado NOT IN ('expired', 'depleted', 'cancelled') THEN
    UPDATE public.gift_cards SET estado = 'expired', updated_at = now() WHERE id = v_row.id;
    v_row.estado := 'expired';
  END IF;

  RETURN jsonb_build_object('ok', true, 'card', public.gift_card_staff_json(v_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.list_gift_cards_staff(p_limit int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  SELECT coalesce(jsonb_agg(public.gift_card_staff_json(g.*) ORDER BY g.emitida_en DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT *
    FROM public.gift_cards
    ORDER BY emitida_en DESC
    LIMIT greatest(1, least(coalesce(p_limit, 30), 100))
  ) g;

  RETURN jsonb_build_object('ok', true, 'cards', v_rows);
END;
$$;

-- ── Vinculación ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.link_gift_card_to_cliente(
  p_codigo text,
  p_cliente_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.gift_cards%ROWTYPE;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_uid uuid := auth.uid();
  v_cliente public.clientes%ROWTYPE;
  v_other uuid;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF p_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cliente inválido.');
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = p_cliente_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cliente no encontrado.');
  END IF;

  SELECT id INTO v_other
  FROM public.gift_cards
  WHERE cliente_vinculado_id = p_cliente_id
    AND estado = 'activated'
    AND saldo > 0
    AND upper(codigo) <> v_codigo
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este cliente ya tiene otra tarjeta activa vinculada.');
  END IF;

  SELECT * INTO v_row FROM public.gift_cards WHERE upper(codigo) = v_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta no encontrada.');
  END IF;

  IF v_row.estado <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo se vinculan tarjetas activadas con saldo.');
  END IF;

  IF v_row.saldo <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La tarjeta no tiene saldo.');
  END IF;

  UPDATE public.gift_cards
  SET cliente_vinculado_id = p_cliente_id,
      vinculado_en = now(),
      vinculado_por = v_uid,
      updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'card', public.gift_card_staff_json(v_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_gift_card_from_cliente(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.gift_cards%ROWTYPE;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  SELECT * INTO v_row FROM public.gift_cards WHERE upper(codigo) = v_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta no encontrada.');
  END IF;

  UPDATE public.gift_cards
  SET cliente_vinculado_id = NULL,
      vinculado_en = NULL,
      vinculado_por = NULL,
      updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'card', public.gift_card_staff_json(v_row));
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_gift_card_for_cliente(p_cliente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.gift_cards%ROWTYPE;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF p_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'card', null);
  END IF;

  SELECT * INTO v_row
  FROM public.gift_cards
  WHERE cliente_vinculado_id = p_cliente_id
    AND estado = 'activated'
    AND saldo > 0
    AND vence_en >= now()
  ORDER BY vinculado_en DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'card', null);
  END IF;

  RETURN jsonb_build_object('ok', true, 'card', public.gift_card_staff_json(v_row));
END;
$$;

-- ── Uso de saldo (con venta_id + auto-desvincular) ───────────────────────────

CREATE OR REPLACE FUNCTION public.register_gift_card_use(
  p_codigo text,
  p_monto numeric,
  p_notas text DEFAULT NULL,
  p_venta_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.gift_cards%ROWTYPE;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_monto numeric := round(coalesce(p_monto, 0)::numeric, 2);
  v_uid uuid := auth.uid();
  v_sucursal uuid;
  v_nuevo_saldo numeric;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF v_monto <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Monto inválido.');
  END IF;

  SELECT * INTO v_row FROM public.gift_cards WHERE upper(codigo) = v_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta no encontrada.');
  END IF;

  IF v_row.estado <> 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La tarjeta debe estar activada.');
  END IF;

  IF v_row.vence_en < now() THEN
    UPDATE public.gift_cards SET estado = 'expired', updated_at = now() WHERE id = v_row.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta vencida.');
  END IF;

  IF v_monto > v_row.saldo THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Monto mayor al saldo disponible.');
  END IF;

  SELECT sucursal_id INTO v_sucursal FROM public.profiles WHERE id = v_uid LIMIT 1;

  v_nuevo_saldo := round(v_row.saldo - v_monto, 2);

  INSERT INTO public.gift_card_usos (gift_card_id, monto, sucursal_id, registrado_por, notas, venta_id)
  VALUES (v_row.id, v_monto, v_sucursal, v_uid, nullif(trim(p_notas), ''), p_venta_id);

  UPDATE public.gift_cards
  SET saldo = v_nuevo_saldo,
      estado = CASE WHEN v_nuevo_saldo <= 0 THEN 'depleted' ELSE 'activated' END,
      cliente_vinculado_id = CASE WHEN v_nuevo_saldo <= 0 THEN NULL ELSE cliente_vinculado_id END,
      vinculado_en = CASE WHEN v_nuevo_saldo <= 0 THEN NULL ELSE vinculado_en END,
      vinculado_por = CASE WHEN v_nuevo_saldo <= 0 THEN NULL ELSE vinculado_por END,
      updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'card', public.gift_card_staff_json(v_row));
END;
$$;

-- ── Redeem ACT (regex dual: 6 dígitos o 8 alfanuméricos legacy) ──────────────

CREATE OR REPLACE FUNCTION public.redeem_gift_card_activation_code(p_codigo_activacion text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := upper(nullif(trim(p_codigo_activacion), ''));
  v_act public.gift_card_activation_codes%ROWTYPE;
  v_card public.gift_cards%ROWTYPE;
  v_gc text;
  v_comprador_email text;
BEGIN
  IF v_code IS NULL OR v_code !~ '^ACT-([0-9]{6}|[A-Z0-9]{8})$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código de activación inválido.');
  END IF;

  SELECT * INTO v_act
  FROM public.gift_card_activation_codes
  WHERE upper(codigo_activacion) = v_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código no encontrado.');
  END IF;

  IF v_act.status = 'cancelled' OR v_act.status = 'expired' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este código ya no está disponible.');
  END IF;

  IF v_act.status = 'redeemed' AND v_act.gift_card_id IS NOT NULL THEN
    SELECT * INTO v_card FROM public.gift_cards WHERE id = v_act.gift_card_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'already_redeemed', true,
        'codigo', v_card.codigo,
        'monto', v_card.monto_inicial,
        'para_nombre', v_card.para_nombre,
        'de_nombre', v_card.de_nombre,
        'mensaje', v_card.mensaje,
        'vence_en', v_card.vence_en,
        'emitida_en', v_card.emitida_en
      );
    END IF;
  END IF;

  IF v_act.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código no disponible.');
  END IF;

  v_comprador_email := coalesce(
    nullif(trim(v_act.comprador_email), ''),
    CASE
      WHEN nullif(trim(v_act.comprador_telefono), '') IS NOT NULL
      THEN trim(v_act.comprador_telefono) || '@whatsapp.salon'
      ELSE 'sin-correo@whatsapp.salon'
    END
  );

  v_gc := public.generate_gift_card_code();

  INSERT INTO public.gift_cards (
    codigo,
    monto_inicial,
    saldo,
    para_nombre,
    de_nombre,
    mensaje,
    comprador_email,
    stripe_payment_intent_id,
    payment_provider,
    payment_reference,
    estado,
    emitida_en,
    vence_en
  ) VALUES (
    v_gc,
    v_act.monto,
    v_act.monto,
    v_act.para_nombre,
    v_act.de_nombre,
    v_act.mensaje,
    v_comprador_email,
    v_act.codigo_activacion,
    'salon_manual',
    v_act.codigo_activacion,
    'issued',
    now(),
    now() + interval '30 days'
  )
  RETURNING * INTO v_card;

  UPDATE public.gift_card_activation_codes
  SET status = 'redeemed',
      gift_card_id = v_card.id,
      redeemed_at = now(),
      updated_at = now()
  WHERE id = v_act.id;

  RETURN jsonb_build_object(
    'ok', true,
    'codigo', v_card.codigo,
    'monto', v_card.monto_inicial,
    'para_nombre', v_card.para_nombre,
    'de_nombre', v_card.de_nombre,
    'mensaje', v_card.mensaje,
    'vence_en', v_card.vence_en,
    'emitida_en', v_card.emitida_en,
    'gift_card_id', v_card.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_gift_card_activation_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_gift_card_to_cliente(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_gift_card_from_cliente(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_gift_card_for_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_gift_card_use(text, numeric, text, uuid) TO authenticated;
