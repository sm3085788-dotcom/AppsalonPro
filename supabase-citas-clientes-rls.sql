-- App Clientes: permitir agendar citas con RLS seguro por usuario autenticado
-- Ejecutar en Supabase -> SQL Editor (una vez por proyecto).

-- 1) Permisos base para rol autenticado
GRANT SELECT, INSERT, UPDATE ON public.citas TO authenticated;

-- 2) Asegurar RLS activo en citas
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- 3) Leer solo citas propias (cliente vinculado al auth.uid)
DROP POLICY IF EXISTS citas_client_select_own ON public.citas;
CREATE POLICY citas_client_select_own
ON public.citas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.id = citas.cliente_id
      AND c.user_id = auth.uid()
  )
);

-- 4) Insertar solo citas propias (cliente vinculado al auth.uid)
DROP POLICY IF EXISTS citas_client_insert_own ON public.citas;
CREATE POLICY citas_client_insert_own
ON public.citas
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.id = citas.cliente_id
      AND c.user_id = auth.uid()
  )
);

-- 5) Actualizar citas propias (reprogramar; cancelar desde la app)
DROP POLICY IF EXISTS citas_client_update_own ON public.citas;
CREATE POLICY citas_client_update_own
ON public.citas
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.id = citas.cliente_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.id = cliente_id
      AND c.user_id = auth.uid()
  )
);
