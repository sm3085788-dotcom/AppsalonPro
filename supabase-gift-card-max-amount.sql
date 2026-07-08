-- Aumenta tope de monto en códigos ACT (Q50–Q10,000)
-- Ejecutar en Supabase → SQL Editor

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

  IF v_monto IS NULL OR v_monto < 50 OR v_monto > 10000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El monto debe estar entre Q50 y Q10,000.');
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
