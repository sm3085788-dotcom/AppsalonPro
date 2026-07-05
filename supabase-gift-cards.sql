-- AppSalon Pro — Tarjetas de regalo VIP (web guest + Stripe + App Salón)
-- Ejecutar en Supabase → SQL Editor

-- ── Tablas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  monto_inicial numeric(12, 2) NOT NULL CHECK (monto_inicial > 0),
  saldo numeric(12, 2) NOT NULL CHECK (saldo >= 0),
  para_nombre text NOT NULL,
  de_nombre text NOT NULL,
  mensaje text,
  comprador_email text NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  estado text NOT NULL DEFAULT 'issued'
    CHECK (estado IN ('issued', 'activated', 'depleted', 'expired', 'cancelled')),
  emitida_en timestamptz NOT NULL DEFAULT now(),
  vence_en timestamptz NOT NULL,
  activada_en timestamptz,
  activada_en_sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  activada_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cumpleanos_verificado boolean NOT NULL DEFAULT false,
  cumpleanos_verificado_en timestamptz,
  cumpleanos_verificado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cumpleanos_bonus_disponible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_cards_codigo_idx ON public.gift_cards (upper(codigo));
CREATE INDEX IF NOT EXISTS gift_cards_estado_idx ON public.gift_cards (estado, emitida_en DESC);
CREATE INDEX IF NOT EXISTS gift_cards_emitida_idx ON public.gift_cards (emitida_en DESC);

CREATE TABLE IF NOT EXISTS public.gift_card_checkout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id text UNIQUE,
  monto numeric(12, 2) NOT NULL CHECK (monto > 0),
  para_nombre text NOT NULL,
  de_nombre text NOT NULL,
  mensaje text,
  comprador_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  gift_card_id uuid REFERENCES public.gift_cards(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_card_drafts_pi_idx
  ON public.gift_card_checkout_drafts (payment_intent_id);

CREATE TABLE IF NOT EXISTS public.gift_card_usos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  monto numeric(12, 2) NOT NULL CHECK (monto > 0),
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_card_usos_card_idx
  ON public.gift_card_usos (gift_card_id, created_at DESC);

-- ── Realtime (notificaciones App Salón) ──────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'gift_cards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_cards;
  END IF;
END $$;

-- ── Helpers ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_gift_card_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'GC-';
  i int;
  attempts int := 0;
BEGIN
  LOOP
    result := 'GC-';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, (floor(random() * length(chars))::int + 1), 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.gift_cards g WHERE upper(g.codigo) = upper(result));
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'No se pudo generar código único de tarjeta regalo';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.gift_card_refresh_estado(p_card public.gift_cards)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_card.estado IN ('cancelled', 'depleted') THEN
    RETURN p_card.estado;
  END IF;
  IF p_card.vence_en < now() THEN
    RETURN 'expired';
  END IF;
  IF p_card.saldo <= 0 THEN
    RETURN 'depleted';
  END IF;
  RETURN p_card.estado;
END;
$$;

-- ── Finalizar pago (webhook / demo) ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.finalize_gift_card_payment(p_payment_intent_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pi text := nullif(trim(p_payment_intent_id), '');
  v_draft public.gift_card_checkout_drafts%ROWTYPE;
  v_existing public.gift_cards%ROWTYPE;
  v_codigo text;
  v_card public.gift_cards%ROWTYPE;
BEGIN
  IF v_pi IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PaymentIntent inválido.');
  END IF;

  SELECT * INTO v_existing
  FROM public.gift_cards
  WHERE stripe_payment_intent_id = v_pi
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'codigo', v_existing.codigo,
      'gift_card_id', v_existing.id,
      'already_exists', true
    );
  END IF;

  SELECT * INTO v_draft
  FROM public.gift_card_checkout_drafts
  WHERE payment_intent_id = v_pi
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Borrador de tarjeta no encontrado.');
  END IF;

  IF v_draft.status = 'completed' AND v_draft.gift_card_id IS NOT NULL THEN
    SELECT codigo INTO v_codigo FROM public.gift_cards WHERE id = v_draft.gift_card_id;
    RETURN jsonb_build_object('ok', true, 'codigo', v_codigo, 'gift_card_id', v_draft.gift_card_id, 'already_exists', true);
  END IF;

  v_codigo := public.generate_gift_card_code();

  INSERT INTO public.gift_cards (
    codigo,
    monto_inicial,
    saldo,
    para_nombre,
    de_nombre,
    mensaje,
    comprador_email,
    stripe_payment_intent_id,
    estado,
    emitida_en,
    vence_en
  ) VALUES (
    v_codigo,
    v_draft.monto,
    v_draft.monto,
    v_draft.para_nombre,
    v_draft.de_nombre,
    v_draft.mensaje,
    v_draft.comprador_email,
    v_pi,
    'issued',
    now(),
    now() + interval '30 days'
  )
  RETURNING * INTO v_card;

  UPDATE public.gift_card_checkout_drafts
  SET status = 'completed',
      gift_card_id = v_card.id,
      updated_at = now()
  WHERE id = v_draft.id;

  RETURN jsonb_build_object(
    'ok', true,
    'codigo', v_card.codigo,
    'gift_card_id', v_card.id,
    'monto', v_card.monto_inicial,
    'vence_en', v_card.vence_en
  );
END;
$$;

-- Demo: finalizar borrador sin Stripe (solo service role / servidor)
CREATE OR REPLACE FUNCTION public.finalize_gift_card_draft_demo(p_draft_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft public.gift_card_checkout_drafts%ROWTYPE;
  v_demo_pi text;
BEGIN
  SELECT * INTO v_draft FROM public.gift_card_checkout_drafts WHERE id = p_draft_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Borrador no encontrado.');
  END IF;

  v_demo_pi := coalesce(v_draft.payment_intent_id, 'demo_gift_' || v_draft.id::text);

  IF v_draft.payment_intent_id IS NULL THEN
    UPDATE public.gift_card_checkout_drafts
    SET payment_intent_id = v_demo_pi, updated_at = now()
    WHERE id = v_draft.id;
  END IF;

  RETURN public.finalize_gift_card_payment(v_demo_pi);
END;
$$;

-- ── Consultas staff ──────────────────────────────────────────────────────────

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

  RETURN jsonb_build_object(
    'ok', true,
    'card', jsonb_build_object(
      'id', v_row.id,
      'codigo', v_row.codigo,
      'monto_inicial', v_row.monto_inicial,
      'saldo', v_row.saldo,
      'para_nombre', v_row.para_nombre,
      'de_nombre', v_row.de_nombre,
      'mensaje', v_row.mensaje,
      'estado', v_row.estado,
      'emitida_en', v_row.emitida_en,
      'vence_en', v_row.vence_en,
      'activada_en', v_row.activada_en,
      'activada_en_sucursal_id', v_row.activada_en_sucursal_id,
      'cumpleanos_verificado', v_row.cumpleanos_verificado,
      'cumpleanos_bonus_disponible', v_row.cumpleanos_bonus_disponible
    )
  );
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

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.emitida_en DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT id, codigo, monto_inicial, saldo, para_nombre, de_nombre, estado, emitida_en, vence_en, activada_en
    FROM public.gift_cards
    ORDER BY emitida_en DESC
    LIMIT greatest(1, least(coalesce(p_limit, 30), 100))
  ) t;

  RETURN jsonb_build_object('ok', true, 'cards', v_rows);
END;
$$;

-- ── Operaciones salón ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.activate_gift_card_at_salon(
  p_codigo text,
  p_sucursal_id uuid DEFAULT NULL
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
  v_sucursal uuid;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  SELECT * INTO v_row FROM public.gift_cards WHERE upper(codigo) = v_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta no encontrada.');
  END IF;

  IF v_row.vence_en < now() THEN
    UPDATE public.gift_cards SET estado = 'expired', updated_at = now() WHERE id = v_row.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta vencida.');
  END IF;

  IF v_row.estado = 'activated' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta ya activada en salón.');
  END IF;

  IF v_row.estado NOT IN ('issued') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Estado no válido para activación.');
  END IF;

  v_sucursal := p_sucursal_id;
  IF v_sucursal IS NULL THEN
    SELECT sucursal_id INTO v_sucursal FROM public.profiles WHERE id = v_uid LIMIT 1;
  END IF;

  UPDATE public.gift_cards
  SET estado = 'activated',
      activada_en = now(),
      activada_en_sucursal_id = v_sucursal,
      activada_por = v_uid,
      updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'card', row_to_json(v_row)::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_gift_card_birthday(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.gift_cards%ROWTYPE;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  SELECT * INTO v_row FROM public.gift_cards WHERE upper(codigo) = v_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta no encontrada.');
  END IF;

  IF v_row.estado NOT IN ('activated', 'depleted') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Activa la tarjeta antes de verificar cumpleaños.');
  END IF;

  IF v_row.vence_en < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta vencida.');
  END IF;

  UPDATE public.gift_cards
  SET cumpleanos_verificado = true,
      cumpleanos_verificado_en = now(),
      cumpleanos_verificado_por = v_uid,
      cumpleanos_bonus_disponible = (saldo <= 0),
      updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'card', row_to_json(v_row)::jsonb,
    'message', 'Cumpleaños verificado. Tras agotar el saldo, aplicar 15% manual en caja.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.register_gift_card_use(
  p_codigo text,
  p_monto numeric,
  p_notas text DEFAULT NULL
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

  INSERT INTO public.gift_card_usos (gift_card_id, monto, sucursal_id, registrado_por, notas)
  VALUES (v_row.id, v_monto, v_sucursal, v_uid, nullif(trim(p_notas), ''));

  UPDATE public.gift_cards
  SET saldo = v_nuevo_saldo,
      estado = CASE WHEN v_nuevo_saldo <= 0 THEN 'depleted' ELSE 'activated' END,
      cumpleanos_bonus_disponible = CASE
        WHEN v_nuevo_saldo <= 0 AND cumpleanos_verificado THEN true
        ELSE cumpleanos_bonus_disponible
      END,
      updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'card', row_to_json(v_row)::jsonb);
END;
$$;

-- ── Consulta pública ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lookup_gift_card_public(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.gift_cards%ROWTYPE;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
BEGIN
  IF v_codigo = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código inválido.');
  END IF;

  SELECT * INTO v_row FROM public.gift_cards WHERE upper(codigo) = v_codigo LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tarjeta no encontrada.');
  END IF;

  IF v_row.vence_en < now() AND v_row.estado NOT IN ('expired', 'depleted', 'cancelled') THEN
    v_row.estado := 'expired';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'card', jsonb_build_object(
      'codigo', v_row.codigo,
      'monto_inicial', v_row.monto_inicial,
      'saldo', CASE WHEN v_row.estado IN ('issued', 'activated') THEN v_row.saldo ELSE 0 END,
      'para_nombre', v_row.para_nombre,
      'de_nombre', v_row.de_nombre,
      'mensaje', v_row.mensaje,
      'estado', v_row.estado,
      'emitida_en', v_row.emitida_en,
      'vence_en', v_row.vence_en,
      'activada', v_row.estado IN ('activated', 'depleted')
    )
  );
END;
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_checkout_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_usos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gift_cards_staff_select ON public.gift_cards;
CREATE POLICY gift_cards_staff_select ON public.gift_cards
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS gift_card_usos_staff_select ON public.gift_card_usos;
CREATE POLICY gift_card_usos_staff_select ON public.gift_card_usos
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin());

-- Borradores: solo service role (sin políticas para anon/authenticated)

GRANT SELECT ON public.gift_cards TO authenticated;
GRANT SELECT ON public.gift_card_usos TO authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_gift_card_payment(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_gift_card_draft_demo(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.lookup_gift_card_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_gift_card_staff(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_gift_cards_staff(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_gift_card_at_salon(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_gift_card_birthday(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_gift_card_use(text, numeric, text) TO authenticated;
