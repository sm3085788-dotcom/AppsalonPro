-- Densidad de franjas de citas por día/sucursal (sin exponer datos de clientes).
-- Ejecutar en Supabase → SQL Editor. Permite aviso de saturación en web sin service role.
-- p_categoria (opcional): solo cuenta citas de la misma categoría/rama de servicio.

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
  WITH active AS (
    SELECT
      c.fecha_hora AT TIME ZONE 'America/Guatemala' AS local_ts,
      NULLIF(trim(i.categoria), '') AS categoria
    FROM public.citas c
    LEFT JOIN public.inventario i
      ON lower(trim(i.nombre)) = lower(trim(c.servicio))
    WHERE c.sucursal_id = p_sucursal_id
      AND (c.fecha_hora AT TIME ZONE 'America/Guatemala')::date = p_date
      AND lower(c.estado) IN ('pendiente', 'confirmada', 'confirmado')
      AND c.visita_validada_en IS NULL
      AND c.fecha_hora + (COALESCE(c.duracion_minutos, 60) || ' minutes')::interval >= now()
      AND (
        p_categoria IS NULL
        OR (
          i.categoria IS NOT NULL
          AND lower(trim(i.categoria)) = lower(trim(p_categoria))
        )
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

-- Compatibilidad: vista global sin filtro por categoría.
CREATE OR REPLACE FUNCTION public.get_booking_slot_density(
  p_date date,
  p_sucursal_id uuid
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT public.get_booking_slot_density(p_date, p_sucursal_id, NULL::text);
$$;

REVOKE ALL ON FUNCTION public.get_booking_slot_density(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_slot_density(date, uuid) TO anon, authenticated;
