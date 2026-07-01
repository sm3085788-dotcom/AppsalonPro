-- Preview de código de membresía (sin canjear) + referencia para pago Stripe.
-- Ejecutar en Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.preview_membresia_codigo(p_codigo text)
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
  v_price numeric;
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
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código inválido, ya usado o vencido.');
  END IF;
  IF v_row.cliente_id IS DISTINCT FROM v_cliente.id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este código no corresponde a tu perfil. Pedí uno nuevo en el salón.');
  END IF;

  v_price := CASE lower(v_row.nivel)
    WHEN 'bronce' THEN 350
    WHEN 'plata' THEN 850
    WHEN 'vip' THEN 2400
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'nivel', v_row.nivel,
    'label', initcap(v_row.nivel),
    'price_gtq', v_price,
    'codigo', v_codigo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_membresia_codigo(text) TO authenticated;
