-- AppSalon Pro — Caja chica independiente por sucursal
-- Ejecutar en Supabase → SQL Editor.
-- Al crear sucursal: saldo 0. Cada admin_sucursal ve/edita solo la suya.

CREATE TABLE IF NOT EXISTS public.caja_chica_sucursal (
  sucursal_id uuid PRIMARY KEY REFERENCES public.sucursales(id) ON DELETE CASCADE,
  saldo numeric(12, 2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS caja_chica_sucursal_updated_idx ON public.caja_chica_sucursal (updated_at DESC);

-- Sucursales existentes: fila en 0 si falta
INSERT INTO public.caja_chica_sucursal (sucursal_id, saldo)
SELECT s.id, 0
FROM public.sucursales s
ON CONFLICT (sucursal_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_caja_chica_for_sucursal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.caja_chica_sucursal (sucursal_id, saldo)
  VALUES (NEW.id, 0)
  ON CONFLICT (sucursal_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_caja_chica_new_sucursal ON public.sucursales;
CREATE TRIGGER trg_seed_caja_chica_new_sucursal
  AFTER INSERT ON public.sucursales
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_caja_chica_for_sucursal();

-- Refuerzo en crear_sucursal (misma firma que supabase-sucursales-login-phone.sql)
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

  INSERT INTO public.caja_chica_sucursal (sucursal_id, saldo)
  VALUES (row.id, 0)
  ON CONFLICT (sucursal_id) DO NOTHING;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_sucursal(text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.salon_caja_chica_resolve(p_sucursal_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sid uuid := p_sucursal_id;
BEGIN
  IF v_sid IS NULL THEN
    v_sid := public.current_sucursal_id();
  END IF;
  IF v_sid IS NULL AND public.is_admin_global() THEN
    SELECT s.id INTO v_sid FROM public.sucursales s WHERE s.es_matriz AND s.activa LIMIT 1;
  END IF;
  IF v_sid IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la sucursal para caja chica';
  END IF;
  IF NOT public.is_admin_global() AND NOT public.can_access_sucursal(v_sid) THEN
    RAISE EXCEPTION 'Sin permiso para la caja chica de esta sucursal';
  END IF;
  RETURN v_sid;
END;
$$;

CREATE OR REPLACE FUNCTION public.salon_caja_chica_get(p_sucursal_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sid uuid;
  v_saldo numeric;
BEGIN
  v_sid := public.salon_caja_chica_resolve(p_sucursal_id);
  SELECT c.saldo INTO v_saldo FROM public.caja_chica_sucursal c WHERE c.sucursal_id = v_sid;
  IF NOT FOUND THEN
    INSERT INTO public.caja_chica_sucursal (sucursal_id, saldo) VALUES (v_sid, 0)
    ON CONFLICT (sucursal_id) DO NOTHING;
    RETURN 0;
  END IF;
  RETURN COALESCE(v_saldo, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.salon_caja_chica_set(p_saldo numeric, p_sucursal_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sid uuid;
  v_safe numeric := GREATEST(0, ROUND(COALESCE(p_saldo, 0)::numeric, 2));
BEGIN
  v_sid := public.salon_caja_chica_resolve(p_sucursal_id);
  INSERT INTO public.caja_chica_sucursal (sucursal_id, saldo, updated_at)
  VALUES (v_sid, v_safe, now())
  ON CONFLICT (sucursal_id) DO UPDATE
    SET saldo = EXCLUDED.saldo, updated_at = now();
  RETURN v_safe;
END;
$$;

REVOKE ALL ON FUNCTION public.salon_caja_chica_resolve(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salon_caja_chica_get(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salon_caja_chica_set(numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_caja_chica_get(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salon_caja_chica_set(numeric, uuid) TO authenticated;

ALTER TABLE public.caja_chica_sucursal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caja_chica_global_all ON public.caja_chica_sucursal;
CREATE POLICY caja_chica_global_all ON public.caja_chica_sucursal
  FOR ALL TO authenticated
  USING (public.is_admin_global())
  WITH CHECK (public.is_admin_global());

DROP POLICY IF EXISTS caja_chica_branch_select ON public.caja_chica_sucursal;
CREATE POLICY caja_chica_branch_select ON public.caja_chica_sucursal
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS caja_chica_branch_update ON public.caja_chica_sucursal;
CREATE POLICY caja_chica_branch_update ON public.caja_chica_sucursal
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

GRANT SELECT, UPDATE ON public.caja_chica_sucursal TO authenticated;
