-- AppSalon Pro Web · Servicio a domicilio (Req 7)
-- Agrega coordenadas y direccion a las citas para servicios a domicilio.
-- Ejecutar en Supabase -> SQL Editor (idempotente).

ALTER TABLE public.citas
  ADD COLUMN IF NOT EXISTS latitud double precision,
  ADD COLUMN IF NOT EXISTS longitud double precision,
  ADD COLUMN IF NOT EXISTS direccion_domicilio text;

COMMENT ON COLUMN public.citas.latitud IS 'Latitud exacta para servicio a domicilio (Google Places).';
COMMENT ON COLUMN public.citas.longitud IS 'Longitud exacta para servicio a domicilio (Google Places).';
COMMENT ON COLUMN public.citas.direccion_domicilio IS 'Direccion formateada del servicio a domicilio.';

-- Nota: el realtime usa Supabase Broadcast (canal branch:<sucursal_id>),
-- no requiere agregar la tabla a ninguna publication de postgres_changes.
