-- =============================================================================
-- AppSalon Pro — Foto de empleados (columna + Storage)
-- Ejecutar en Supabase → SQL Editor si la app no guarda o muestra la foto.
-- =============================================================================

ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS foto_url text;

-- Bucket Storage "empleados" (fotos de fichas manuales)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'empleados',
  'empleados',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS empleados_public_read ON storage.objects;
CREATE POLICY empleados_public_read
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'empleados');

DROP POLICY IF EXISTS empleados_staff_insert ON storage.objects;
CREATE POLICY empleados_staff_insert
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'empleados' AND public.is_staff_or_admin());

DROP POLICY IF EXISTS empleados_staff_update ON storage.objects;
CREATE POLICY empleados_staff_update
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'empleados' AND public.is_staff_or_admin())
WITH CHECK (bucket_id = 'empleados' AND public.is_staff_or_admin());

DROP POLICY IF EXISTS empleados_staff_delete ON storage.objects;
CREATE POLICY empleados_staff_delete
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'empleados' AND public.is_staff_or_admin());

NOTIFY pgrst, 'reload schema';
