-- Búsqueda parcial de tarjetas regalo y códigos ACT (staff)
-- Ejecutar en Supabase → SQL Editor

CREATE OR REPLACE FUNCTION public.search_gift_cards_staff(
  p_query text,
  p_limit int DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text := upper(trim(coalesce(p_query, '')));
  v_lim int := greatest(1, least(coalesce(p_limit, 8), 20));
  v_cards jsonb := '[]'::jsonb;
  v_acts jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF length(v_q) < 3 THEN
    RETURN jsonb_build_object('ok', true, 'results', '[]'::jsonb);
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', 'card',
        'codigo', j->>'codigo',
        'monto', (j->>'monto_inicial')::numeric,
        'saldo', (j->>'saldo')::numeric,
        'estado', j->>'estado',
        'para_nombre', j->>'para_nombre',
        'de_nombre', j->>'de_nombre',
        'nota_salon', j->>'nota_salon',
        'cliente_vinculado_id', j->>'cliente_vinculado_id',
        'cliente_vinculado_nombre', j->>'cliente_vinculado_nombre'
      )
      ORDER BY sub.emitida_en DESC
    ),
    '[]'::jsonb
  )
  INTO v_cards
  FROM (
    SELECT public.gift_card_staff_json(g.*) AS j, g.emitida_en
    FROM public.gift_cards g
    WHERE upper(g.codigo) LIKE '%' || v_q || '%'
    ORDER BY g.emitida_en DESC
    LIMIT v_lim
  ) sub;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'kind', 'activation',
        'codigo', a.codigo_activacion,
        'monto', a.monto,
        'saldo', a.monto,
        'estado', a.status,
        'para_nombre', a.para_nombre,
        'de_nombre', a.de_nombre,
        'nota_salon', a.nota_salon,
        'cliente_vinculado_id', NULL,
        'cliente_vinculado_nombre', NULL
      )
      ORDER BY a.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_acts
  FROM (
    SELECT *
    FROM public.gift_card_activation_codes
    WHERE status = 'pending'
      AND upper(codigo_activacion) LIKE '%' || v_q || '%'
    ORDER BY created_at DESC
    LIMIT v_lim
  ) a;

  RETURN jsonb_build_object(
    'ok', true,
    'results', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'kind', x->>'codigo'), '[]'::jsonb)
      FROM (
        SELECT jsonb_array_elements(v_cards) AS x
        UNION ALL
        SELECT jsonb_array_elements(v_acts) AS x
        LIMIT v_lim
      ) merged
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_gift_cards_staff(text, int) TO authenticated;
