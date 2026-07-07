-- Reseñas públicas del Club Tu Cumpleaños (web, lectura anónima)
-- Ejecutar en Supabase → SQL Editor

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
      trim(r.comment) AS comment,
      coalesce(
        nullif(split_part(trim(coalesce(r.author_name, 'Cliente')), ' ', 1), ''),
        'Cliente'
      ) AS author_first_name,
      coalesce(r.updated_at, r.created_at) AS published_at
    FROM public.birthday_club_reactions r
    WHERE r.reaction IN ('like', 'love')
      AND nullif(trim(r.comment), '') IS NOT NULL
    ORDER BY coalesce(r.updated_at, r.created_at) DESC
    LIMIT v_limit
  ) t;

  RETURN jsonb_build_object('ok', true, 'reviews', v_rows);
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_birthday_club_testimonials(int) TO anon, authenticated;
