-- Densidad de franjas de citas por día/sucursal (sin exponer datos de clientes).
-- Ejecutar en Supabase → SQL Editor. Permite aviso de saturación en web sin service role.
-- p_categoria (opcional): solo cuenta citas de la misma categoría/rama de servicio.

CREATE OR REPLACE FUNCTION public.norm_congestion_text(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(
    trim(
      translate(
        COALESCE(p, ''),
        'áéíóúüñÁÉÍÓÚÜÑ',
        'aeiouunaeiouun'
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.infer_cita_congestion_categoria(p_servicio text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  n text;
BEGIN
  n := public.norm_congestion_text(p_servicio);
  IF n = '' THEN
    RETURN NULL;
  END IF;

  IF n ~ '(manic|unas|nail|gelish|acrilic)' THEN RETURN 'Manicure'; END IF;
  IF n ~ '(pedic|pie|podolog|pies)' THEN RETURN 'Pedicure'; END IF;
  IF n ~ '(corte|peinado|brush|estilo|blow)' THEN RETURN 'Corte y peinado'; END IF;
  IF n ~ '(color|mechas|balayage|tinte|rubio|tono|decolor)' THEN RETURN 'Coloración'; END IF;
  IF n ~ '(tratamiento capilar|hidrat|reconstruc|ampolla|botox capilar)' THEN RETURN 'Tratamientos capilares'; END IF;
  IF n ~ '(kerat|alisado|progressiva|liss)' THEN RETURN 'Keratina / alisado'; END IF;
  IF n ~ '(facial|piel|spa|masaje|relax|ritual)' THEN RETURN 'Facial / spa'; END IF;
  IF n ~ '(maquillaje|makeup|evento|novia)' THEN RETURN 'Maquillaje'; END IF;
  IF n ~ '(ceja|pestana|pestana|lash|brow|lifting|mirada)' THEN RETURN 'Cejas y pestañas'; END IF;
  IF n ~ '(barber|barba|fade|afeit)' THEN RETURN 'Barbería'; END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_cita_congestion_categoria(p_servicio text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH segments AS (
    SELECT trim(part) AS seg
    FROM unnest(
      regexp_split_to_array(COALESCE(p_servicio, ''), '\s*[·|,]\s*')
    ) AS part
    WHERE trim(part) <> ''
  ),
  inv_exact AS (
    SELECT NULLIF(trim(i.categoria), '') AS categoria
    FROM public.inventario i
    WHERE public.norm_congestion_text(i.nombre) = public.norm_congestion_text(p_servicio)
    LIMIT 1
  ),
  inv_fuzzy AS (
    SELECT NULLIF(trim(i.categoria), '') AS categoria
    FROM public.inventario i
    LEFT JOIN segments s ON true
    WHERE public.norm_congestion_text(i.nombre) <> ''
      AND (
        public.norm_congestion_text(s.seg) = public.norm_congestion_text(i.nombre)
        OR public.norm_congestion_text(p_servicio) LIKE '%' || public.norm_congestion_text(i.nombre) || '%'
        OR public.norm_congestion_text(i.nombre) LIKE '%' || public.norm_congestion_text(s.seg) || '%'
      )
    ORDER BY length(i.nombre) DESC
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT categoria FROM inv_exact),
    (SELECT categoria FROM inv_fuzzy),
    public.infer_cita_congestion_categoria(p_servicio)
  );
$$;

-- Eliminar overload de 2 args (ambiguo con el default NULL del tercer parámetro).
DROP FUNCTION IF EXISTS public.get_booking_slot_density(date, uuid);

CREATE OR REPLACE FUNCTION public.get_booking_slot_density(
  p_date date,
  p_sucursal_id uuid,
  p_categoria text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH citas_scoped AS (
    SELECT
      c.fecha_hora AT TIME ZONE 'America/Guatemala' AS local_ts,
      public.resolve_cita_congestion_categoria(c.servicio) AS congestion_cat
    FROM public.citas c
    WHERE c.sucursal_id = p_sucursal_id
      AND (c.fecha_hora AT TIME ZONE 'America/Guatemala')::date = p_date
      AND lower(c.estado) IN ('pendiente', 'confirmada', 'confirmado')
      AND c.visita_validada_en IS NULL
      AND c.fecha_hora + (COALESCE(c.duracion_minutos, 60) || ' minutes')::interval >= now()
  ),
  active AS (
    SELECT local_ts
    FROM citas_scoped
    WHERE
      p_categoria IS NULL
      OR (
        congestion_cat IS NOT NULL
        AND public.norm_congestion_text(congestion_cat) = public.norm_congestion_text(p_categoria)
      )
  ),
  slotted AS (
    SELECT
      to_char(
        time '08:00'
          + (
            round(
              extract(epoch FROM (local_ts - time '08:00')) / 3600.0
            ) * interval '1 hour'
          ),
        'HH24:MI'
      ) AS slot_time
    FROM active
    WHERE local_ts::time BETWEEN time '08:00' AND time '22:00'
  )
  SELECT COALESCE(
    jsonb_object_agg(slot_time, cnt),
    '{}'::jsonb
  )
  FROM (
    SELECT slot_time, COUNT(*)::int AS cnt
    FROM slotted
    GROUP BY slot_time
  ) agg;
$$;

REVOKE ALL ON FUNCTION public.get_booking_slot_density(date, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_slot_density(date, uuid, text) TO anon, authenticated;
