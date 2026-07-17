-- Densidad de franjas de citas por día/sucursal (sin exponer datos de clientes).
-- Ejecutar en Supabase → SQL Editor. Permite aviso de saturación en web sin service role.

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
  WITH active AS (
    SELECT
      fecha_hora AT TIME ZONE 'America/Guatemala' AS local_ts
    FROM public.citas
    WHERE sucursal_id = p_sucursal_id
      AND (fecha_hora AT TIME ZONE 'America/Guatemala')::date = p_date
      AND lower(estado) IN ('pendiente', 'confirmada', 'confirmado')
      AND visita_validada_en IS NULL
      AND fecha_hora + (COALESCE(duracion_minutos, 60) || ' minutes')::interval >= now()
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

REVOKE ALL ON FUNCTION public.get_booking_slot_density(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_booking_slot_density(date, uuid) TO anon, authenticated;
