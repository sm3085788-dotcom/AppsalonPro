-- Reseñas de Tarjeta Regalo (web + alertas marketing salón)
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS public.gift_card_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL UNIQUE REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  gift_card_id uuid REFERENCES public.gift_cards(id) ON DELETE SET NULL,
  reaction text NOT NULL CHECK (reaction IN ('like', 'dislike', 'love')),
  comment text,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_card_reactions_created_idx
  ON public.gift_card_reactions (created_at DESC);

CREATE INDEX IF NOT EXISTS gift_card_reactions_gift_card_idx
  ON public.gift_card_reactions (gift_card_id);

ALTER TABLE public.gift_card_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'gift_card_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_card_reactions;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.gift_card_review_cliente_for_user()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_id FROM public.clientes WHERE user_id = v_uid LIMIT 1;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cliente_has_linked_gift_card(p_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gift_cards g
    WHERE g.cliente_vinculado_id = p_cliente_id
      AND g.estado IN ('activated', 'depleted')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_gift_card_review_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_reaction public.gift_card_reactions%ROWTYPE;
  v_card public.gift_cards%ROWTYPE;
BEGIN
  v_cliente_id := public.gift_card_review_cliente_for_user();
  IF v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'logged_in', false);
  END IF;

  SELECT * INTO v_reaction FROM public.gift_card_reactions WHERE cliente_id = v_cliente_id;

  SELECT * INTO v_card
  FROM public.gift_cards g
  WHERE g.cliente_vinculado_id = v_cliente_id
    AND g.estado IN ('activated', 'depleted')
  ORDER BY coalesce(g.activada_en, g.emitida_en) DESC NULLS LAST
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', true,
    'logged_in', true,
    'eligible', public.cliente_has_linked_gift_card(v_cliente_id),
    'gift_card_codigo', v_card.codigo,
    'reaction', CASE WHEN v_reaction.id IS NOT NULL THEN row_to_json(v_reaction)::jsonb ELSE null END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_gift_card_reaction(
  p_reaction text,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_cliente public.clientes%ROWTYPE;
  v_reaction text := lower(trim(coalesce(p_reaction, '')));
  v_card_id uuid;
  v_row public.gift_card_reactions%ROWTYPE;
BEGIN
  IF v_reaction NOT IN ('like', 'dislike', 'love') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reacción inválida.');
  END IF;

  v_cliente_id := public.gift_card_review_cliente_for_user();
  IF v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión.');
  END IF;

  IF NOT public.cliente_has_linked_gift_card(v_cliente_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Tu tarjeta regalo debe estar vinculada y activada en el salón.'
    );
  END IF;

  SELECT g.id INTO v_card_id
  FROM public.gift_cards g
  WHERE g.cliente_vinculado_id = v_cliente_id
    AND g.estado IN ('activated', 'depleted')
  ORDER BY coalesce(g.activada_en, g.emitida_en) DESC NULLS LAST
  LIMIT 1;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = v_cliente_id;

  INSERT INTO public.gift_card_reactions (
    cliente_id, user_id, gift_card_id, reaction, comment, author_name
  ) VALUES (
    v_cliente_id,
    auth.uid(),
    v_card_id,
    v_reaction,
    nullif(trim(p_comment), ''),
    nullif(trim(v_cliente.nombre), '')
  )
  ON CONFLICT (cliente_id) DO UPDATE
  SET reaction = EXCLUDED.reaction,
      comment = EXCLUDED.comment,
      author_name = EXCLUDED.author_name,
      gift_card_id = EXCLUDED.gift_card_id,
      updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'reaction', row_to_json(v_row)::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_gift_card_testimonials(p_limit int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := greatest(1, least(coalesce(p_limit, 24), 50));
  v_rows jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.published_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      r.id,
      r.reaction,
      trim(r.comment) AS comment,
      coalesce(
        nullif(split_part(trim(coalesce(r.author_name, 'Cliente')), ' ', 1), ''),
        'Cliente'
      ) AS author_first_name,
      coalesce(r.updated_at, r.created_at) AS published_at
    FROM public.gift_card_reactions r
    WHERE r.reaction IN ('like', 'love')
      AND nullif(trim(r.comment), '') IS NOT NULL
    ORDER BY coalesce(r.updated_at, r.created_at) DESC
    LIMIT v_limit
  ) t;

  RETURN jsonb_build_object('ok', true, 'reviews', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_gift_card_review_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_gift_card_reaction(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_gift_card_testimonials(int) TO anon, authenticated;
