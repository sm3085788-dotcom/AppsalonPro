-- Login de sucursales por teléfono interno (+502999xxxxx), igual que matriz (Auth phone + contraseña 6+)
-- Ejecutar en Supabase SQL Editor después de supabase-sucursales-setup.sql

ALTER TABLE public.sucursales
  ADD COLUMN IF NOT EXISTS login_phone text;

CREATE UNIQUE INDEX IF NOT EXISTS sucursales_login_phone_unique
  ON public.sucursales (login_phone)
  WHERE login_phone IS NOT NULL;

-- Mismo algoritmo que apps/salon/services/branchAdminSetup.js (branchLoginPhoneFromCodigo)
CREATE OR REPLACE FUNCTION public.branch_login_phone_from_codigo(p_codigo text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  c text := upper(trim(regexp_replace(COALESCE(p_codigo, ''), '\s', '', 'g')));
  h bigint := 0;
  i int;
  ch int;
  uh bigint;
  suffix text;
BEGIN
  IF c = '' OR c !~ '^[A-Z0-9_-]+$' THEN
    RETURN NULL;
  END IF;
  FOR i IN 1..length(c) LOOP
    ch := ascii(substr(c, i, 1));
    h := h * 31 + ch;
    uh := h & 4294967295;
    h := uh;
  END LOOP;
  suffix := lpad((h % 100000)::text, 5, '0');
  RETURN '+502999' || suffix;
END;
$$;

UPDATE public.sucursales s
SET login_phone = public.branch_login_phone_from_codigo(s.codigo)
WHERE s.login_phone IS NULL AND s.codigo IS NOT NULL;

CREATE OR REPLACE FUNCTION public.crear_sucursal(p_codigo text, p_nombre text, p_direccion text DEFAULT NULL, p_telefono text DEFAULT NULL)
RETURNS public.sucursales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.sucursales;
  v_codigo text := upper(trim(p_codigo));
  v_phone text;
BEGIN
  IF NOT public.is_admin_global() THEN
    RAISE EXCEPTION 'Solo admin global puede crear sucursales';
  END IF;

  v_phone := public.branch_login_phone_from_codigo(v_codigo);
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Código de sucursal inválido';
  END IF;

  IF EXISTS (SELECT 1 FROM public.sucursales s WHERE s.login_phone = v_phone AND upper(s.codigo) <> v_codigo) THEN
    RAISE EXCEPTION 'Colisión de teléfono interno; usá otro código de sucursal';
  END IF;

  INSERT INTO public.sucursales (codigo, nombre, direccion, telefono, login_phone, es_matriz, activa)
  VALUES (
    v_codigo,
    trim(p_nombre),
    nullif(trim(COALESCE(p_direccion, '')), ''),
    nullif(trim(COALESCE(p_telefono, '')), ''),
    v_phone,
    false,
    true
  )
  RETURNING * INTO row;
  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.branch_login_phone_from_codigo(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crear_sucursal(text, text, text, text) TO authenticated;
