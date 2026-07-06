-- Tarjetas regalo: teléfono del comprador (WhatsApp) en lugar de correo en códigos ACT-
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.gift_card_activation_codes
  ADD COLUMN IF NOT EXISTS comprador_telefono text;

ALTER TABLE public.gift_card_activation_codes
  ALTER COLUMN comprador_email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_gt_whatsapp_phone(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits text := regexp_replace(coalesce(trim(p_raw), ''), '\D', '', 'g');
BEGIN
  IF v_digits = '' THEN
    RETURN NULL;
  END IF;
  IF length(v_digits) = 8 THEN
    RETURN '502' || v_digits;
  END IF;
  IF v_digits ~ '^502' AND length(v_digits) = 11 THEN
    RETURN v_digits;
  END IF;
  RETURN NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.create_gift_card_activation_code(numeric, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_gift_card_activation_code(
  p_monto numeric,
  p_para_nombre text,
  p_de_nombre text,
  p_mensaje text DEFAULT NULL,
  p_comprador_telefono text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monto numeric := round(p_monto::numeric, 2);
  v_para text := nullif(trim(p_para_nombre), '');
  v_de text := nullif(trim(p_de_nombre), '');
  v_phone text := public.normalize_gt_whatsapp_phone(p_comprador_telefono);
  v_mensaje text := nullif(trim(p_mensaje), '');
  v_codigo text;
  v_row public.gift_card_activation_codes%ROWTYPE;
  v_sucursal uuid;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF v_monto IS NULL OR v_monto < 50 OR v_monto > 2000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El monto debe estar entre Q50 y Q2000.');
  END IF;
  IF v_para IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Indica el nombre del destinatario.');
  END IF;
  IF v_de IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Indica el nombre del comprador.');
  END IF;
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ingresá un número de teléfono válido (8 dígitos o 502 + 8).');
  END IF;

  SELECT sucursal_id INTO v_sucursal FROM public.profiles WHERE id = auth.uid() LIMIT 1;

  v_codigo := public.generate_gift_card_activation_code();

  INSERT INTO public.gift_card_activation_codes (
    codigo_activacion,
    monto,
    para_nombre,
    de_nombre,
    mensaje,
    comprador_email,
    comprador_telefono,
    status,
    created_by,
    sucursal_id
  ) VALUES (
    v_codigo,
    v_monto,
    v_para,
    v_de,
    v_mensaje,
    NULL,
    v_phone,
    'pending',
    auth.uid(),
    v_sucursal
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'codigo_activacion', v_row.codigo_activacion,
    'monto', v_row.monto,
    'para_nombre', v_row.para_nombre,
    'de_nombre', v_row.de_nombre,
    'comprador_telefono', v_row.comprador_telefono,
    'created_at', v_row.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_gift_card_activation_codes_staff(p_limit int DEFAULT 20)
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

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      id,
      codigo_activacion,
      monto,
      para_nombre,
      de_nombre,
      comprador_telefono,
      status,
      created_at,
      redeemed_at
    FROM public.gift_card_activation_codes
    WHERE status = 'pending'
      AND created_at >= now() - interval '7 days'
    ORDER BY created_at DESC
    LIMIT greatest(1, least(coalesce(p_limit, 20), 50))
  ) t;

  RETURN jsonb_build_object('ok', true, 'codes', v_rows);
END;
$$;

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
  IF v_code IS NULL OR v_code !~ '^ACT-[A-Z0-9]{8}$' THEN
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
    v_act.comprador_telefono || '@whatsapp.salon'
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

GRANT EXECUTE ON FUNCTION public.create_gift_card_activation_code(numeric, text, text, text, text) TO authenticated;
