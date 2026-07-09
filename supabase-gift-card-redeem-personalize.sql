-- Canje ACT: el cliente completa Para / De / mensaje en la web al activar.
-- Ejecutar en Supabase → SQL Editor

DROP FUNCTION IF EXISTS public.redeem_gift_card_activation_code(text);

CREATE OR REPLACE FUNCTION public.redeem_gift_card_activation_code(
  p_codigo_activacion text,
  p_para_nombre text DEFAULT NULL,
  p_de_nombre text DEFAULT NULL,
  p_mensaje text DEFAULT NULL
)
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
  v_para text := nullif(trim(p_para_nombre), '');
  v_de text := nullif(trim(p_de_nombre), '');
  v_msg text := nullif(trim(p_mensaje), '');
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

  IF v_para IS NULL OR v_de IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Indica Para y De (nombre y apellido) para personalizar tu tarjeta.'
    );
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
    v_para,
    v_de,
    v_msg,
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
    'emitida_en', v_card.emitida_en
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_gift_card_activation_code(text, text, text, text) TO anon, authenticated;
