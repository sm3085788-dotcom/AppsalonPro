-- =============================================================================
-- AppSalon Pro — Storage bucket "mensajes" (chat + pulso masivo + App Clientes)
-- Ejecutar en Supabase → SQL Editor si ves "Bucket not found" al adjuntar fotos.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mensajes',
  'mensajes',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura pública (URLs en burbujas de chat)
DROP POLICY IF EXISTS mensajes_public_read ON storage.objects;
CREATE POLICY mensajes_public_read
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mensajes');

-- App Salón: subir / editar / borrar (admin/staff)
DROP POLICY IF EXISTS mensajes_staff_insert ON storage.objects;
CREATE POLICY mensajes_staff_insert
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mensajes' AND public.is_staff_or_admin());

DROP POLICY IF EXISTS mensajes_staff_update ON storage.objects;
CREATE POLICY mensajes_staff_update
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'mensajes' AND public.is_staff_or_admin())
WITH CHECK (bucket_id = 'mensajes' AND public.is_staff_or_admin());

DROP POLICY IF EXISTS mensajes_staff_delete ON storage.objects;
CREATE POLICY mensajes_staff_delete
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'mensajes' AND public.is_staff_or_admin());

-- App Clientes: subir foto en chat (cuenta con ficha clientes.user_id)
DROP POLICY IF EXISTS mensajes_client_insert ON storage.objects;
CREATE POLICY mensajes_client_insert
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mensajes'
  AND EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.user_id = auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
