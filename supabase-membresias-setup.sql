-- AppSalon Pro — Membresías Bronce / Plata / VIP + códigos de activación
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS membresia_nivel text,
  ADD COLUMN IF NOT EXISTS membresia_activada_en timestamptz;

COMMENT ON COLUMN public.clientes.membresia_nivel IS 'bronce | plata | vip — activado con código del salón';
COMMENT ON COLUMN public.clientes.membresia_activada_en IS 'Fecha en que el cliente canjeó el código en App Clientes';

CREATE TABLE IF NOT EXISTS public.membresia_codigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nivel text NOT NULL CHECK (nivel IN ('bronce', 'plata', 'vip')),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  activo boolean NOT NULL DEFAULT true,
  usado_en timestamptz,
  notas text,
  creado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membresia_codigos_cliente_idx ON public.membresia_codigos (cliente_id);
CREATE INDEX IF NOT EXISTS membresia_codigos_codigo_idx ON public.membresia_codigos (upper(codigo));

ALTER TABLE public.membresia_codigos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membresia_codigos_role_all ON public.membresia_codigos;
CREATE POLICY membresia_codigos_role_all ON public.membresia_codigos
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin())
  WITH CHECK (public.is_staff_or_admin());

-- Canje seguro: solo el cliente dueño del código puede activar su membresía
CREATE OR REPLACE FUNCTION public.redeem_membresia_codigo(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cliente public.clientes%ROWTYPE;
  v_row public.membresia_codigos%ROWTYPE;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión.');
  END IF;

  IF v_codigo = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ingresá un código válido.');
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE user_id = v_uid LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No hay ficha de cliente vinculada a tu cuenta.');
  END IF;

  SELECT * INTO v_row
  FROM public.membresia_codigos
  WHERE upper(codigo) = v_codigo
    AND activo = true
    AND usado_en IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código inválido, ya usado o vencido.');
  END IF;

  IF v_row.cliente_id IS DISTINCT FROM v_cliente.id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este código no corresponde a tu perfil. Pedí uno nuevo en el salón.');
  END IF;

  UPDATE public.membresia_codigos
  SET usado_en = now()
  WHERE id = v_row.id;

  UPDATE public.clientes
  SET
    membresia_nivel = v_row.nivel,
    membresia_activada_en = now(),
    categoria = CASE v_row.nivel
      WHEN 'vip' THEN 'VIP'
      WHEN 'plata' THEN 'Plata'
      WHEN 'bronce' THEN 'Bronce'
      ELSE categoria
    END
  WHERE id = v_cliente.id;

  RETURN jsonb_build_object(
    'ok', true,
    'nivel', v_row.nivel,
    'label', initcap(v_row.nivel)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_membresia_codigo(text) TO authenticated;
