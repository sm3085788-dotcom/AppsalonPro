-- Migración QPayPro: tablas genéricas de pago (convive con columnas stripe_* legacy)
-- Ejecutar en Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.payment_checkout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('product', 'gift_card', 'membership', 'tienda_domicilio')),
  client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  amount_gtq numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'gtq',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  payment_provider text NOT NULL DEFAULT 'qpaypro',
  session_id text,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_checkout_drafts_session
  ON public.payment_checkout_drafts(session_id);

CREATE INDEX IF NOT EXISTS idx_payment_checkout_drafts_reference
  ON public.payment_checkout_drafts(payment_reference);

ALTER TABLE public.gift_card_checkout_drafts
  ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'qpaypro',
  ADD COLUMN IF NOT EXISTS payment_session_id text;

ALTER TABLE public.gift_cards
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_session_id text,
  ADD COLUMN IF NOT EXISTS payment_reference text;

ALTER TABLE public.ecommerce_orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_session_id text,
  ADD COLUMN IF NOT EXISTS payment_reference text;

-- Extiende finalize para QPayPro (compatibilidad con stripe_payment_intent_id)
CREATE OR REPLACE FUNCTION public.finalize_gift_card_payment(
  p_payment_intent_id text,
  p_payment_session_id text DEFAULT NULL,
  p_payment_provider text DEFAULT 'qpaypro'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text := nullif(trim(p_payment_intent_id), '');
  v_session text := nullif(trim(p_payment_session_id), '');
  v_draft public.gift_card_checkout_drafts%ROWTYPE;
  v_existing public.gift_cards%ROWTYPE;
  v_codigo text;
  v_card public.gift_cards%ROWTYPE;
BEGIN
  IF v_ref IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Referencia de pago inválida.');
  END IF;

  SELECT * INTO v_existing
  FROM public.gift_cards
  WHERE stripe_payment_intent_id = v_ref
     OR payment_reference = v_ref
     OR (v_session IS NOT NULL AND payment_session_id = v_session)
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
  WHERE payment_intent_id = v_ref
     OR (v_session IS NOT NULL AND payment_session_id = v_session)
  ORDER BY created_at DESC
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
    payment_provider,
    payment_session_id,
    payment_reference,
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
    v_ref,
    coalesce(p_payment_provider, 'qpaypro'),
    v_session,
    v_ref,
    'issued',
    now(),
    now() + interval '30 days'
  )
  RETURNING * INTO v_card;

  UPDATE public.gift_card_checkout_drafts
  SET status = 'completed',
      gift_card_id = v_card.id,
      payment_intent_id = coalesce(payment_intent_id, v_ref),
      payment_session_id = coalesce(v_session, payment_session_id),
      payment_provider = coalesce(p_payment_provider, 'qpaypro'),
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

GRANT EXECUTE ON FUNCTION public.finalize_gift_card_payment(text, text, text) TO service_role;
