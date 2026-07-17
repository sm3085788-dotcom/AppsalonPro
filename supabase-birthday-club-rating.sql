-- Club Tu Cumpleaños: calificación explícita 1–5 estrellas en reseñas web.
-- Ejecutar en Supabase → SQL Editor.

ALTER TABLE public.birthday_club_reactions
  ADD COLUMN IF NOT EXISTS rating smallint
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

DROP FUNCTION IF EXISTS public.set_birthday_club_reaction(text, text);

CREATE OR REPLACE FUNCTION public.set_birthday_club_reaction(
  p_reaction text,
  p_comment text DEFAULT NULL,
  p_rating smallint DEFAULT NULL
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
  v_rating smallint := p_rating;
  v_row public.birthday_club_reactions%ROWTYPE;
BEGIN
  IF v_rating IS NOT NULL THEN
    IF v_rating < 1 OR v_rating > 5 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'La calificación debe ser entre 1 y 5 estrellas.');
    END IF;
    v_reaction := CASE
      WHEN v_rating >= 5 THEN 'love'
      WHEN v_rating >= 4 THEN 'like'
      ELSE 'dislike'
    END;
  ELSIF v_reaction NOT IN ('like', 'dislike', 'love') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reacción inválida.');
  END IF;

  v_cliente_id := public.birthday_club_cliente_for_user();
  IF v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.birthday_club_enrollments WHERE cliente_id = v_cliente_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes unirte al club primero.');
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = v_cliente_id;

  INSERT INTO public.birthday_club_reactions (
    cliente_id, user_id, reaction, comment, author_name, rating
  ) VALUES (
    v_cliente_id,
    auth.uid(),
    v_reaction,
    nullif(trim(p_comment), ''),
    nullif(trim(v_cliente.nombre), ''),
    v_rating
  )
  ON CONFLICT (cliente_id) DO UPDATE
  SET reaction = EXCLUDED.reaction,
      comment = EXCLUDED.comment,
      author_name = EXCLUDED.author_name,
      rating = EXCLUDED.rating,
      updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'reaction', row_to_json(v_row)::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_birthday_club_testimonials(p_limit int DEFAULT 24)
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
      coalesce(
        r.rating,
        CASE r.reaction
          WHEN 'love' THEN 5
          WHEN 'like' THEN 4
          WHEN 'dislike' THEN 2
          ELSE 5
        END
      ) AS rating,
      trim(r.comment) AS comment,
      coalesce(
        nullif(split_part(trim(coalesce(r.author_name, 'Cliente')), ' ', 1), ''),
        'Cliente'
      ) AS author_first_name,
      coalesce(r.updated_at, r.created_at) AS published_at
    FROM public.birthday_club_reactions r
    WHERE nullif(trim(r.comment), '') IS NOT NULL
      AND (
        coalesce(r.rating, 0) >= 3
        OR r.reaction IN ('like', 'love')
      )
    ORDER BY coalesce(r.updated_at, r.created_at) DESC
    LIMIT v_limit
  ) t;

  RETURN jsonb_build_object('ok', true, 'reviews', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_birthday_club_reaction(text, text, smallint) TO authenticated;
