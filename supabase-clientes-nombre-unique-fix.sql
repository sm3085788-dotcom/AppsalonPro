-- App Clientes: permitir varios clientes con el mismo nombre (y email en ficha manual)
-- Ejecutar en Supabase → SQL Editor (una vez).
-- Error: duplicate key value violates unique constraint "clientes_nombre_unique" (u otro en clientes)

-- Quitar UNIQUE indebidos en nombre / email / teléfono (no deben bloquear registros distintos)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname AS name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'clientes'
      AND c.contype = 'u'
      AND (
        c.conname ILIKE '%nombre%'
        OR c.conname ILIKE '%email%'
        OR c.conname ILIKE '%telefono%'
        OR c.conname ILIKE '%phone%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS %I', r.name);
    RAISE NOTICE 'Dropped constraint %', r.name;
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'clientes'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexname NOT ILIKE '%user_id%'
      AND indexname NOT ILIKE '%codigo_referido%'
      AND (
        indexname ILIKE '%nombre%'
        OR indexname ILIKE '%email%'
        OR indexname ILIKE '%telefono%'
        OR indexname ILIKE '%phone%'
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
    RAISE NOTICE 'Dropped index %', r.indexname;
  END LOOP;
END $$;

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_nombre_unique;
DROP INDEX IF EXISTS public.clientes_nombre_unique;
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_email_unique;
DROP INDEX IF EXISTS public.clientes_email_unique;
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_telefono_unique;
DROP INDEX IF EXISTS public.clientes_telefono_unique;

-- Una cuenta Auth = una ficha cliente
CREATE UNIQUE INDEX IF NOT EXISTS clientes_user_id_unique
  ON public.clientes (user_id)
  WHERE user_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.ensure_cliente_for_auth_user(uuid, text, text);
DROP FUNCTION IF EXISTS public.ensure_cliente_for_auth_user(uuid, text, text, text);

-- Crear o enlazar ficha (SECURITY DEFINER: ignora RLS, no exige nombre único)
CREATE OR REPLACE FUNCTION public.ensure_cliente_for_auth_user(
  p_user_id uuid,
  p_nombre text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefono text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  nom text;
  em text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO cid FROM public.clientes WHERE user_id = p_user_id LIMIT 1;
  IF cid IS NOT NULL THEN
    RETURN cid;
  END IF;

  IF auth.uid() IS NOT NULL
     AND auth.uid() IS DISTINCT FROM p_user_id
     AND NOT COALESCE(public.is_staff_or_admin(), false) THEN
    RAISE EXCEPTION 'No autorizado para crear ficha de otro usuario';
  END IF;

  nom := COALESCE(NULLIF(trim(p_nombre), ''), 'Cliente');
  em := NULLIF(lower(trim(COALESCE(p_email, ''))), '');

  -- Enlazar ficha manual sin user_id (mismo correo, distinto nombre permitido)
  IF em IS NOT NULL THEN
    SELECT c.id INTO cid
    FROM public.clientes c
    WHERE c.user_id IS NULL
      AND c.email IS NOT NULL
      AND lower(trim(c.email)) = em
    ORDER BY c.created_at ASC NULLS LAST
    LIMIT 1;

    IF cid IS NOT NULL THEN
      UPDATE public.clientes c
      SET
        user_id = p_user_id,
        nombre = COALESCE(NULLIF(trim(c.nombre), ''), nom),
        email = COALESCE(c.email, NULLIF(trim(p_email), '')),
        tipo_registro = 'app_clientes'
      WHERE c.id = cid;
      RETURN cid;
    END IF;
  END IF;

  INSERT INTO public.clientes (user_id, nombre, email, telefono, tipo_registro, categoria)
  VALUES (
    p_user_id,
    nom,
    NULLIF(trim(COALESCE(p_email, '')), ''),
    NULLIF(trim(COALESCE(p_telefono, '')), ''),
    'app_clientes',
    'Nuevo'
  )
  RETURNING id INTO cid;

  RETURN cid;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO cid FROM public.clientes WHERE user_id = p_user_id LIMIT 1;
    IF cid IS NOT NULL THEN
      RETURN cid;
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_cliente_for_auth_user(uuid, text, text, text) TO authenticated;

-- Política INSERT app clientes (por si falta)
GRANT SELECT, INSERT, UPDATE ON public.clientes TO authenticated;

DROP POLICY IF EXISTS clientes_client_insert ON public.clientes;
CREATE POLICY clientes_client_insert
ON public.clientes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS clientes_client_select ON public.clientes;
CREATE POLICY clientes_client_select
ON public.clientes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS clientes_client_update ON public.clientes;
CREATE POLICY clientes_client_update
ON public.clientes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
