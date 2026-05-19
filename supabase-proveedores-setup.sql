-- =============================================================================
-- AppSalon Pro — Proveedores (tabla + RLS + Storage logos)
-- Ejecutar TODO en Supabase → SQL Editor → New query → Run
-- =============================================================================

-- 1) Tabla proveedores
CREATE TABLE IF NOT EXISTS public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_compania text NOT NULL,
  nit text,
  telefono text,
  email text,
  direccion text,
  sitio_web text,
  notas text,
  logo_url text,
  nombre_agente text,
  telefono_agente text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proveedores_nombre_compania_idx
  ON public.proveedores (nombre_compania);

-- Columnas por si la tabla existía incompleta
ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS nombre_compania text,
  ADD COLUMN IF NOT EXISTS nit text,
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS sitio_web text,
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS nombre_agente text,
  ADD COLUMN IF NOT EXISTS telefono_agente text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2) RLS (solo admin / staff del salón vía is_staff_or_admin)
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proveedores_role_select ON public.proveedores;
CREATE POLICY proveedores_role_select
ON public.proveedores FOR SELECT
TO authenticated
USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS proveedores_role_insert ON public.proveedores;
CREATE POLICY proveedores_role_insert
ON public.proveedores FOR INSERT
TO authenticated
WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS proveedores_role_update ON public.proveedores;
CREATE POLICY proveedores_role_update
ON public.proveedores FOR UPDATE
TO authenticated
USING (public.is_staff_or_admin())
WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS proveedores_role_delete ON public.proveedores;
CREATE POLICY proveedores_role_delete
ON public.proveedores FOR DELETE
TO authenticated
USING (public.is_staff_or_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proveedores TO authenticated;

-- 3) Bucket Storage "proveedores" (logos de compañías)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proveedores',
  'proveedores',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS proveedores_public_read ON storage.objects;
CREATE POLICY proveedores_public_read
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'proveedores');

DROP POLICY IF EXISTS proveedores_staff_insert ON storage.objects;
CREATE POLICY proveedores_staff_insert
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proveedores' AND public.is_staff_or_admin());

DROP POLICY IF EXISTS proveedores_staff_update ON storage.objects;
CREATE POLICY proveedores_staff_update
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'proveedores' AND public.is_staff_or_admin())
WITH CHECK (bucket_id = 'proveedores' AND public.is_staff_or_admin());

DROP POLICY IF EXISTS proveedores_staff_delete ON storage.objects;
CREATE POLICY proveedores_staff_delete
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proveedores' AND public.is_staff_or_admin());

-- 4) Refrescar caché de PostgREST (evita "table not in schema cache")
NOTIFY pgrst, 'reload schema';
