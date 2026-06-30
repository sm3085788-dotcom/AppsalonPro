-- Eventos profesionales · App Clientes + App Salón
-- Imagen recomendada: 626 × 417 px (mismo hero marketing).
-- Ejecutar en Supabase → SQL Editor (todo el archivo de una vez).

-- Helper staff ANTES de policies que lo referencian
CREATE OR REPLACE FUNCTION public.is_salon_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND COALESCE(p.role, '') IN (
        'admin', 'staff', 'owner', 'salon_admin',
        'branch_admin', 'admin_sucursal'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_salon_staff() TO authenticated;

CREATE TABLE IF NOT EXISTS public.eventos_profesionales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'evento',
  imagen_url text,
  precio_label text,
  badge text,
  compare_at_label text,
  rating numeric(3,2) NOT NULL DEFAULT 4.5,
  review_count int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eventos_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos_profesionales(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensaje text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'pending'
    CHECK (estado IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eventos_profesionales_activo_idx
  ON public.eventos_profesionales (activo, orden, created_at DESC);

CREATE INDEX IF NOT EXISTS eventos_solicitudes_evento_idx
  ON public.eventos_solicitudes (evento_id, created_at DESC);

CREATE INDEX IF NOT EXISTS eventos_solicitudes_estado_idx
  ON public.eventos_solicitudes (estado, created_at DESC);

ALTER TABLE public.eventos_profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_solicitudes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eventos_profesionales_client_read ON public.eventos_profesionales;
CREATE POLICY eventos_profesionales_client_read
ON public.eventos_profesionales FOR SELECT
TO authenticated
USING (activo = true);

DROP POLICY IF EXISTS eventos_profesionales_staff_all ON public.eventos_profesionales;
CREATE POLICY eventos_profesionales_staff_all
ON public.eventos_profesionales FOR ALL
TO authenticated
USING (public.is_salon_staff())
WITH CHECK (public.is_salon_staff());

DROP POLICY IF EXISTS eventos_solicitudes_client_insert ON public.eventos_solicitudes;
CREATE POLICY eventos_solicitudes_client_insert
ON public.eventos_solicitudes FOR INSERT
TO authenticated
WITH CHECK (client_user_id = auth.uid());

DROP POLICY IF EXISTS eventos_solicitudes_client_select ON public.eventos_solicitudes;
CREATE POLICY eventos_solicitudes_client_select
ON public.eventos_solicitudes FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

DROP POLICY IF EXISTS eventos_solicitudes_staff_all ON public.eventos_solicitudes;
CREATE POLICY eventos_solicitudes_staff_all
ON public.eventos_solicitudes FOR ALL
TO authenticated
USING (public.is_salon_staff())
WITH CHECK (public.is_salon_staff());

GRANT SELECT ON public.eventos_profesionales TO authenticated;
GRANT SELECT, INSERT ON public.eventos_solicitudes TO authenticated;

-- Staff también necesita INSERT/UPDATE/DELETE en tablas (RLS is_salon_staff)
GRANT INSERT, UPDATE, DELETE ON public.eventos_profesionales TO authenticated;
GRANT UPDATE, DELETE ON public.eventos_solicitudes TO authenticated;

-- Storage bucket eventos (626×417)
INSERT INTO storage.buckets (id, name, public)
VALUES ('eventos-profesionales', 'eventos-profesionales', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS eventos_prof_storage_read ON storage.objects;
CREATE POLICY eventos_prof_storage_read
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'eventos-profesionales');

DROP POLICY IF EXISTS eventos_prof_storage_staff_write ON storage.objects;
CREATE POLICY eventos_prof_storage_staff_write
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'eventos-profesionales' AND public.is_salon_staff());

DROP POLICY IF EXISTS eventos_prof_storage_staff_update ON storage.objects;
CREATE POLICY eventos_prof_storage_staff_update
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'eventos-profesionales' AND public.is_salon_staff());

DROP POLICY IF EXISTS eventos_prof_storage_staff_delete ON storage.objects;
CREATE POLICY eventos_prof_storage_staff_delete
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'eventos-profesionales' AND public.is_salon_staff());
