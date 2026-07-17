-- Auto-cancelar citas vencidas sin visita (pendiente/confirmada).
-- Ventana: fecha_hora + duracion_minutos (default 60) sin visita_validada_en.
-- Ejecutar en Supabase → SQL Editor, o vía migración.
-- Cron Vercel: GET /api/cron/expire-citas cada 10 min (CRON_SECRET).

CREATE OR REPLACE FUNCTION public.expire_citas_sin_asistencia()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.citas
  SET
    estado = 'cancelada',
    notas_servicio = COALESCE(notas_servicio, '') ||
      CASE
        WHEN notas_servicio IS NULL OR btrim(notas_servicio) = '' THEN ''
        ELSE E'\n'
      END ||
      'Cancelada automáticamente: sin asistencia tras vencer la cita (' ||
      to_char(now() AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD HH24:MI') ||
      ' GT).'
  WHERE
    visita_validada_en IS NULL
    AND lower(btrim(estado)) IN ('pendiente', 'confirmada', 'confirmado')
    AND (
      fecha_hora + (COALESCE(duracion_minutos, 60) || ' minutes')::interval
    ) < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_citas_sin_asistencia() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_citas_sin_asistencia() TO service_role;
