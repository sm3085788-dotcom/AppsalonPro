-- Referidos ANDREAS en cadena — base para TODOS los clientes verificados
-- Ejecutar en Supabase → SQL Editor después de:
--   supabase-andreas-premios.sql
--   supabase-membresias-referidos-programa.sql
--   supabase-referidos-premios-fix.sql (o incluir este archivo ANTES del fix)

-- ─── 1) Código determinístico desde user_id (mismo que la app) ───────────────
CREATE OR REPLACE FUNCTION public.codigo_referido_from_user_id(p_uid uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_uid IS NULL THEN NULL
    WHEN length(replace(p_uid::text, '-', '')) < 8 THEN
      'ANDREAS-' || upper(substring(replace(p_uid::text, '-', ''), 1, 12))
    ELSE
      'ANDREAS-' || upper(
        substring(r from 1 for 6) || substring(r from greatest(1, length(r) - 5) for 6)
      )
  END
  FROM (SELECT replace(p_uid::text, '-', '') AS r) s;
$$;

COMMENT ON FUNCTION public.codigo_referido_from_user_id(uuid) IS
  'Genera ANDREAS-{6 primeros + 6 últimos hex del UUID sin guiones}. Igual que App Clientes.';

-- ─── 2) Resolver código → referidor (columna guardada O calculada) ───────────
CREATE OR REPLACE FUNCTION public.resolve_codigo_referido_andreas(p_codigo text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH norm AS (
    SELECT upper(trim(COALESCE(p_codigo, ''))) AS c
  )
  SELECT c.user_id
  FROM public.clientes c, norm n
  WHERE c.user_id IS NOT NULL
    AND n.c <> ''
    AND (
      (c.codigo_referido IS NOT NULL AND upper(trim(c.codigo_referido)) = n.c)
      OR public.codigo_referido_from_user_id(c.user_id) = n.c
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_codigo_referido_andreas(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_codigo_referido_andreas(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_codigo_referido_andreas(text) TO service_role;

-- ─── 3) Asegurar código propio al crear/enlazar ficha app ────────────────────
CREATE OR REPLACE FUNCTION public.ensure_cliente_codigo_referido(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_code := public.codigo_referido_from_user_id(p_user_id);

  UPDATE public.clientes c
  SET codigo_referido = v_code
  WHERE c.user_id = p_user_id
    AND (
      c.codigo_referido IS NULL
      OR trim(c.codigo_referido) = ''
      OR upper(trim(c.codigo_referido)) = v_code
    );

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_cliente_codigo_referido(uuid) TO authenticated;

-- Parche ensure_cliente_for_auth_user: cada cuenta app obtiene su código al nacer
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
    PERFORM public.ensure_cliente_codigo_referido(p_user_id);
    RETURN cid;
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT COALESCE(public.is_staff_or_admin(), false) THEN
    RAISE EXCEPTION 'No autorizado para crear ficha de otro usuario';
  END IF;

  nom := COALESCE(NULLIF(trim(p_nombre), ''), 'Cliente');
  em := NULLIF(lower(trim(COALESCE(p_email, ''))), '');

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
        tipo_registro = 'app_clientes',
        codigo_referido = COALESCE(
          NULLIF(trim(c.codigo_referido), ''),
          public.codigo_referido_from_user_id(p_user_id)
        )
      WHERE c.id = cid;
      RETURN cid;
    END IF;
  END IF;

  INSERT INTO public.clientes (user_id, nombre, email, telefono, tipo_registro, categoria, codigo_referido)
  VALUES (
    p_user_id,
    nom,
    NULLIF(trim(COALESCE(p_email, '')), ''),
    NULLIF(trim(COALESCE(p_telefono, '')), ''),
    'app_clientes',
    'Nuevo',
    public.codigo_referido_from_user_id(p_user_id)
  )
  RETURNING id INTO cid;

  RETURN cid;
EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO cid FROM public.clientes WHERE user_id = p_user_id LIMIT 1;
    IF cid IS NOT NULL THEN
      PERFORM public.ensure_cliente_codigo_referido(p_user_id);
      RETURN cid;
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_cliente_for_auth_user(uuid, text, text, text) TO authenticated;

-- ─── 4) Backfill: todo cliente con user_id puede referir en cadena ───────────
UPDATE public.clientes c
SET codigo_referido = public.codigo_referido_from_user_id(c.user_id)
WHERE c.user_id IS NOT NULL
  AND (
    c.codigo_referido IS NULL
    OR trim(c.codigo_referido) = ''
  );

-- ─── 5) Verificación ───────────────────────────────────────────────────────
SELECT
  count(*) FILTER (WHERE user_id IS NOT NULL) AS cuentas_app,
  count(*) FILTER (WHERE user_id IS NOT NULL AND codigo_referido IS NOT NULL AND trim(codigo_referido) <> '') AS con_codigo,
  count(*) FILTER (WHERE referido_por IS NOT NULL) AS invitados_vinculados
FROM public.clientes;
