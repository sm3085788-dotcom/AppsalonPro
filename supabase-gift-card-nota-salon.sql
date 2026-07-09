-- Nota interna del salón en códigos ACT (separada del mensaje personal de la tarjeta web)
-- Ejecutar en Supabase → SQL Editor

ALTER TABLE public.gift_card_activation_codes
  ADD COLUMN IF NOT EXISTS nota_salon text;

-- Notas que el equipo escribió antes en mensaje quedan como nota interna (no van a la tarjeta)
UPDATE public.gift_card_activation_codes
SET nota_salon = nullif(trim(mensaje), ''),
    mensaje = NULL
WHERE nullif(trim(mensaje), '') IS NOT NULL
  AND nullif(trim(nota_salon), '') IS NULL;

DROP FUNCTION IF EXISTS public.create_gift_card_activation_code(numeric, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_gift_card_activation_code(
  p_monto numeric,
  p_para_nombre text,
  p_de_nombre text,
  p_nota_salon text DEFAULT NULL,
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
  v_nota text := nullif(trim(p_nota_salon), '');
  v_codigo text;
  v_row public.gift_card_activation_codes%ROWTYPE;
  v_sucursal uuid;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF v_monto IS NULL OR v_monto < 50 OR v_monto > 10000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El monto debe estar entre Q50 y Q10,000.');
  END IF;
  IF v_phone IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ingresá un número de teléfono válido (8 dígitos o 502 + 8).');
  END IF;

  v_para := coalesce(v_para, 'Destinatario');
  v_de := coalesce(v_de, 'Cliente');

  SELECT sucursal_id INTO v_sucursal FROM public.profiles WHERE id = auth.uid() LIMIT 1;

  v_codigo := public.generate_gift_card_activation_code();

  INSERT INTO public.gift_card_activation_codes (
    codigo_activacion,
    monto,
    para_nombre,
    de_nombre,
    mensaje,
    nota_salon,
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
    NULL,
    v_nota,
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
    'nota_salon', v_row.nota_salon,
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
      nota_salon,
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

CREATE OR REPLACE FUNCTION public.restore_gift_card_activation_code_staff(p_snapshot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := nullif(p_snapshot->>'id', '')::uuid;
  v_codigo text := upper(nullif(trim(p_snapshot->>'codigo_activacion'), ''));
  v_status text;
  v_email text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;
  IF v_codigo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código ACT inválido en respaldo.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.gift_card_activation_codes g
    WHERE upper(g.codigo_activacion) = v_codigo
      AND (v_id IS NULL OR g.id IS DISTINCT FROM v_id)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ya existe un código ACT con ese folio.');
  END IF;

  v_status := coalesce(nullif(trim(p_snapshot->>'status'), ''), 'pending');
  IF v_status = 'redeemed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No se puede restaurar un código ya canjeado.');
  END IF;

  v_email := coalesce(
    nullif(trim(p_snapshot->>'comprador_email'), ''),
    nullif(trim(p_snapshot->>'comprador_telefono'), '') || '@whatsapp.salon',
    'restored@salon.local'
  );

  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.gift_card_activation_codes WHERE id = v_id) THEN
    UPDATE public.gift_card_activation_codes SET
      codigo_activacion = v_codigo,
      monto = coalesce((p_snapshot->>'monto')::numeric, monto),
      para_nombre = coalesce(nullif(trim(p_snapshot->>'para_nombre'), ''), para_nombre),
      de_nombre = coalesce(nullif(trim(p_snapshot->>'de_nombre'), ''), de_nombre),
      mensaje = NULL,
      nota_salon = coalesce(
        nullif(trim(p_snapshot->>'nota_salon'), ''),
        nullif(trim(p_snapshot->>'mensaje'), ''),
        nota_salon
      ),
      comprador_email = v_email,
      comprador_telefono = nullif(trim(p_snapshot->>'comprador_telefono'), ''),
      status = v_status,
      gift_card_id = nullif(p_snapshot->>'gift_card_id', '')::uuid,
      sucursal_id = nullif(p_snapshot->>'sucursal_id', '')::uuid,
      redeemed_at = (p_snapshot->>'redeemed_at')::timestamptz,
      updated_at = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO public.gift_card_activation_codes (
      id,
      codigo_activacion,
      monto,
      para_nombre,
      de_nombre,
      mensaje,
      nota_salon,
      comprador_email,
      comprador_telefono,
      status,
      gift_card_id,
      created_by,
      sucursal_id,
      redeemed_at,
      created_at
    ) VALUES (
      coalesce(v_id, gen_random_uuid()),
      v_codigo,
      coalesce((p_snapshot->>'monto')::numeric, 0),
      coalesce(nullif(trim(p_snapshot->>'para_nombre'), ''), 'Restaurado'),
      coalesce(nullif(trim(p_snapshot->>'de_nombre'), ''), 'Restaurado'),
      NULL,
      coalesce(
        nullif(trim(p_snapshot->>'nota_salon'), ''),
        nullif(trim(p_snapshot->>'mensaje'), '')
      ),
      v_email,
      nullif(trim(p_snapshot->>'comprador_telefono'), ''),
      v_status,
      nullif(p_snapshot->>'gift_card_id', '')::uuid,
      nullif(p_snapshot->>'created_by', '')::uuid,
      nullif(p_snapshot->>'sucursal_id', '')::uuid,
      (p_snapshot->>'redeemed_at')::timestamptz,
      coalesce((p_snapshot->>'created_at')::timestamptz, now())
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'codigo_activacion', v_codigo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_gift_card_activation_code(numeric, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_gift_card_activation_codes_staff(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card_activation_code(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_gift_card_activation_code_staff(jsonb) TO authenticated;
