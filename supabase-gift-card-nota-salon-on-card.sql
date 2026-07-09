-- Quién atendió (nota_salon del ACT) en la tarjeta emitida para App Salón.
-- Ejecutar en Supabase → SQL Editor

ALTER TABLE public.gift_cards
  ADD COLUMN IF NOT EXISTS nota_salon text;

-- Tarjetas ya emitidas desde ACT manual del salón
UPDATE public.gift_cards g
SET nota_salon = coalesce(nullif(trim(g.nota_salon), ''), nullif(trim(a.nota_salon), ''))
FROM public.gift_card_activation_codes a
WHERE g.nota_salon IS NULL
  AND nullif(trim(a.nota_salon), '') IS NOT NULL
  AND (
    upper(coalesce(g.payment_reference, '')) = upper(a.codigo_activacion)
    OR upper(coalesce(g.stripe_payment_intent_id, '')) = upper(a.codigo_activacion)
  );

CREATE OR REPLACE FUNCTION public.gift_card_staff_json(p_row public.gift_cards)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_cliente_nombre text;
  v_nota text := nullif(trim(p_row.nota_salon), '');
BEGIN
  IF v_nota IS NULL AND coalesce(p_row.payment_provider, '') = 'salon_manual' THEN
    SELECT nullif(trim(a.nota_salon), '') INTO v_nota
    FROM public.gift_card_activation_codes a
    WHERE upper(a.codigo_activacion) = upper(coalesce(p_row.payment_reference, p_row.stripe_payment_intent_id, ''))
    LIMIT 1;
  END IF;

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
    'nota_salon', v_nota,
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
    nota_salon,
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
    nullif(trim(v_act.nota_salon), ''),
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

CREATE OR REPLACE FUNCTION public.search_gift_cards_staff(
  p_query text,
  p_limit int DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := upper(trim(coalesce(p_query, '')));
  v_lim int := greatest(1, least(coalesce(p_limit, 8), 20));
  v_cards jsonb := '[]'::jsonb;
  v_acts jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF length(v_q) < 3 THEN
    RETURN jsonb_build_object('ok', true, 'results', '[]'::jsonb);
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', 'card',
        'codigo', j->>'codigo',
        'monto', (j->>'monto_inicial')::numeric,
        'saldo', (j->>'saldo')::numeric,
        'estado', j->>'estado',
        'para_nombre', j->>'para_nombre',
        'de_nombre', j->>'de_nombre',
        'nota_salon', j->>'nota_salon',
        'cliente_vinculado_id', j->>'cliente_vinculado_id',
        'cliente_vinculado_nombre', j->>'cliente_vinculado_nombre'
      )
      ORDER BY sub.emitida_en DESC
    ),
    '[]'::jsonb
  )
  INTO v_cards
  FROM (
    SELECT public.gift_card_staff_json(g.*) AS j, g.emitida_en
    FROM public.gift_cards g
    WHERE upper(g.codigo) LIKE '%' || v_q || '%'
    ORDER BY g.emitida_en DESC
    LIMIT v_lim
  ) sub;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', 'activation',
        'codigo', a.codigo_activacion,
        'monto', a.monto,
        'saldo', a.monto,
        'estado', a.status,
        'para_nombre', a.para_nombre,
        'de_nombre', a.de_nombre,
        'nota_salon', a.nota_salon,
        'cliente_vinculado_id', NULL,
        'cliente_vinculado_nombre', NULL
      )
      ORDER BY a.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_acts
  FROM (
    SELECT *
    FROM public.gift_card_activation_codes
    WHERE status = 'pending'
      AND upper(codigo_activacion) LIKE '%' || v_q || '%'
    ORDER BY created_at DESC
    LIMIT v_lim
  ) a;

  RETURN jsonb_build_object(
    'ok', true,
    'results', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'kind', x->>'codigo'), '[]'::jsonb)
      FROM (
        SELECT jsonb_array_elements(v_cards) AS x
        UNION ALL
        SELECT jsonb_array_elements(v_acts) AS x
        LIMIT v_lim
      ) merged
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_gift_cards_staff(text, int) TO authenticated;
