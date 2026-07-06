-- Códigos de activación tarjeta regalo (Salón → comprador → web)
-- Ejecutar en Supabase SQL Editor después de supabase-gift-cards.sql

ALTER TABLE public.gift_cards
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_session_id text,
  ADD COLUMN IF NOT EXISTS payment_reference text;

CREATE TABLE IF NOT EXISTS public.gift_card_activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_activacion text NOT NULL UNIQUE,
  monto numeric(12, 2) NOT NULL CHECK (monto > 0),
  para_nombre text NOT NULL,
  de_nombre text NOT NULL,
  mensaje text,
  comprador_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'redeemed', 'expired', 'cancelled')),
  gift_card_id uuid REFERENCES public.gift_cards(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_card_activation_codes_status_idx
  ON public.gift_card_activation_codes (status, created_at DESC);

CREATE INDEX IF NOT EXISTS gift_card_activation_codes_codigo_idx
  ON public.gift_card_activation_codes (upper(codigo_activacion));

ALTER TABLE public.gift_card_activation_codes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_gift_card_activation_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'ACT-';
  i int;
  attempts int := 0;
BEGIN
  LOOP
    result := 'ACT-';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, (floor(random() * length(chars))::int + 1), 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.gift_card_activation_codes g
      WHERE upper(g.codigo_activacion) = upper(result)
    );
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'No se pudo generar código de activación único';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_gift_card_activation_code(
  p_monto numeric,
  p_para_nombre text,
  p_de_nombre text,
  p_mensaje text DEFAULT NULL,
  p_comprador_email text DEFAULT NULL
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
  v_email text := lower(nullif(trim(p_comprador_email), ''));
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
  IF v_email IS NULL OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Correo del comprador inválido.');
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
    status,
    created_by,
    sucursal_id
  ) VALUES (
    v_codigo,
    v_monto,
    v_para,
    v_de,
    v_mensaje,
    v_email,
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
    'comprador_email', v_row.comprador_email,
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
      comprador_email,
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
    v_act.comprador_email,
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
GRANT EXECUTE ON FUNCTION public.list_gift_card_activation_codes_staff(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card_activation_code(text) TO anon, authenticated;
