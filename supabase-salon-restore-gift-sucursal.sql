-- App Salón — restaurar desde basurero: tarjetas regalo, códigos ACT, sucursales
-- Ejecutar en Supabase → SQL Editor (después de supabase-salon-delete-gift-sucursal.sql)

CREATE OR REPLACE FUNCTION public.restore_gift_card_staff(p_snapshot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_codigo text;
  v_email text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;
  IF p_snapshot IS NULL OR p_snapshot = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin copia para restaurar.');
  END IF;

  v_id := nullif(trim(p_snapshot->>'id'), '')::uuid;
  v_codigo := upper(nullif(trim(p_snapshot->>'codigo'), ''));
  IF v_codigo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código de tarjeta inválido en la copia.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.gift_cards g
    WHERE upper(g.codigo) = v_codigo
      AND (v_id IS NULL OR g.id IS DISTINCT FROM v_id)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ya existe una tarjeta con ese código.');
  END IF;

  v_email := coalesce(
    nullif(trim(p_snapshot->>'comprador_email'), ''),
    'restored@salon.local'
  );

  IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.gift_cards WHERE id = v_id) THEN
    UPDATE public.gift_cards SET
      codigo = v_codigo,
      monto_inicial = coalesce((p_snapshot->>'monto_inicial')::numeric, monto_inicial),
      saldo = coalesce((p_snapshot->>'saldo')::numeric, saldo),
      para_nombre = coalesce(nullif(trim(p_snapshot->>'para_nombre'), ''), para_nombre),
      de_nombre = coalesce(nullif(trim(p_snapshot->>'de_nombre'), ''), de_nombre),
      mensaje = p_snapshot->>'mensaje',
      comprador_email = v_email,
      estado = coalesce(nullif(trim(p_snapshot->>'estado'), ''), estado),
      emitida_en = coalesce((p_snapshot->>'emitida_en')::timestamptz, emitida_en),
      vence_en = coalesce((p_snapshot->>'vence_en')::timestamptz, vence_en),
      activada_en = (p_snapshot->>'activada_en')::timestamptz,
      activada_en_sucursal_id = nullif(p_snapshot->>'activada_en_sucursal_id', '')::uuid,
      cliente_vinculado_id = nullif(p_snapshot->>'cliente_vinculado_id', '')::uuid,
      vinculado_en = (p_snapshot->>'vinculado_en')::timestamptz,
      updated_at = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO public.gift_cards (
      id,
      codigo,
      monto_inicial,
      saldo,
      para_nombre,
      de_nombre,
      mensaje,
      comprador_email,
      estado,
      emitida_en,
      vence_en,
      activada_en,
      activada_en_sucursal_id,
      cliente_vinculado_id,
      vinculado_en,
      payment_provider,
      payment_session_id,
      payment_reference
    ) VALUES (
      coalesce(v_id, gen_random_uuid()),
      v_codigo,
      coalesce((p_snapshot->>'monto_inicial')::numeric, 0),
      coalesce((p_snapshot->>'saldo')::numeric, (p_snapshot->>'monto_inicial')::numeric, 0),
      coalesce(nullif(trim(p_snapshot->>'para_nombre'), ''), 'Restaurado'),
      coalesce(nullif(trim(p_snapshot->>'de_nombre'), ''), 'Restaurado'),
      p_snapshot->>'mensaje',
      v_email,
      coalesce(nullif(trim(p_snapshot->>'estado'), ''), 'issued'),
      coalesce((p_snapshot->>'emitida_en')::timestamptz, now()),
      coalesce((p_snapshot->>'vence_en')::timestamptz, now() + interval '30 days'),
      (p_snapshot->>'activada_en')::timestamptz,
      nullif(p_snapshot->>'activada_en_sucursal_id', '')::uuid,
      nullif(p_snapshot->>'cliente_vinculado_id', '')::uuid,
      (p_snapshot->>'vinculado_en')::timestamptz,
      p_snapshot->>'payment_provider',
      p_snapshot->>'payment_session_id',
      p_snapshot->>'payment_reference'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'codigo', v_codigo);
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_gift_card_activation_code_staff(p_snapshot jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_codigo text;
  v_email text;
  v_status text;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;
  IF p_snapshot IS NULL OR p_snapshot = '{}'::jsonb THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin copia para restaurar.');
  END IF;

  v_id := nullif(trim(p_snapshot->>'id'), '')::uuid;
  v_codigo := upper(nullif(trim(coalesce(p_snapshot->>'codigo_activacion', p_snapshot->>'codigo')), ''));
  IF v_codigo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código ACT inválido en la copia.');
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
      mensaje = p_snapshot->>'mensaje',
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
      p_snapshot->>'mensaje',
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

CREATE OR REPLACE FUNCTION public.reactivar_sucursal_staff(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.sucursales%ROWTYPE;
BEGIN
  IF NOT public.is_admin_global() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo la matriz puede reactivar sucursales.');
  END IF;
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Id inválido.');
  END IF;

  SELECT * INTO v_row FROM public.sucursales WHERE id = p_id;
  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sucursal no encontrada.');
  END IF;
  IF v_row.es_matriz THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La matriz no requiere reactivación.');
  END IF;

  UPDATE public.sucursales SET activa = true WHERE id = p_id;

  RETURN jsonb_build_object(
    'ok', true,
    'nombre', v_row.nombre,
    'codigo', v_row.codigo,
    'activa', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_gift_card_staff(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_gift_card_activation_code_staff(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivar_sucursal_staff(uuid) TO authenticated;
