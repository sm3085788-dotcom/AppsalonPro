-- AppSalon Pro — Únete al Equipo (reclutamiento web + App Salón)
-- Ejecutar en Supabase → SQL Editor (todo el archivo de una vez).

CREATE TABLE IF NOT EXISTS public.unete_equipo_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experiencia_ramas jsonb NOT NULL DEFAULT '{}'::jsonb,
  rama_destacada text,
  modalidad text NOT NULL
    CHECK (modalidad IN ('empleado_directo', 'socio_co_dependiente')),
  mensaje text NOT NULL DEFAULT '',
  acepta_valores boolean NOT NULL DEFAULT false,
  estado text NOT NULL DEFAULT 'enviado'
    CHECK (estado IN ('enviado', 'recibido', 'revisado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  recibido_at timestamptz,
  revisado_at timestamptz
);

CREATE INDEX IF NOT EXISTS unete_equipo_solicitudes_estado_idx
  ON public.unete_equipo_solicitudes (estado, created_at DESC);

CREATE INDEX IF NOT EXISTS unete_equipo_solicitudes_user_idx
  ON public.unete_equipo_solicitudes (client_user_id, created_at DESC);

ALTER TABLE public.unete_equipo_solicitudes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'unete_equipo_solicitudes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.unete_equipo_solicitudes;
  END IF;
END $$;

-- ── Helpers ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.unete_equipo_cliente_for_user()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO v_id FROM public.clientes WHERE user_id = v_uid LIMIT 1;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unete_equipo_compute_rama_destacada(p_experiencia jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_key text;
  v_best text;
  v_priority text[] := ARRAY[
    'coloracion', 'maquillaje', 'cejas', 'manicure', 'pedicure',
    'planchado', 'cuidado_capilar', 'higiene',
    'spa_masaje', 'spa_corporal', 'spa_relajacion',
    'skincare_facial', 'skincare_limpieza', 'skincare_hidratacion',
    'recepcion_administrativa', 'recepcion_atencion',
    'recepcion_agenda', 'recepcion_cobros', 'recepcion_multitarea',
    'pestanas', 'corte_peinado',
  ];
BEGIN
  IF p_experiencia IS NULL OR jsonb_typeof(p_experiencia) <> 'object' THEN
    RETURN NULL;
  END IF;
  FOREACH v_key IN ARRAY v_priority LOOP
    IF COALESCE((p_experiencia ->> v_key)::boolean, false) THEN
      RETURN v_key;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- ── Policies ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS unete_equipo_client_insert ON public.unete_equipo_solicitudes;
CREATE POLICY unete_equipo_client_insert
ON public.unete_equipo_solicitudes FOR INSERT
TO authenticated
WITH CHECK (client_user_id = auth.uid());

DROP POLICY IF EXISTS unete_equipo_client_select ON public.unete_equipo_solicitudes;
CREATE POLICY unete_equipo_client_select
ON public.unete_equipo_solicitudes FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

DROP POLICY IF EXISTS unete_equipo_staff_all ON public.unete_equipo_solicitudes;
CREATE POLICY unete_equipo_staff_all
ON public.unete_equipo_solicitudes FOR ALL
TO authenticated
USING (public.is_salon_staff())
WITH CHECK (public.is_salon_staff());

GRANT SELECT, INSERT ON public.unete_equipo_solicitudes TO authenticated;
GRANT UPDATE, DELETE ON public.unete_equipo_solicitudes TO authenticated;

-- ── RPCs ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_unete_equipo_solicitud(
  p_experiencia jsonb,
  p_modalidad text,
  p_mensaje text DEFAULT '',
  p_acepta_valores boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cliente_id uuid;
  v_rama text;
  v_row public.unete_equipo_solicitudes%ROWTYPE;
  v_active int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión.');
  END IF;

  IF COALESCE(p_acepta_valores, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes aceptar los valores del salón.');
  END IF;

  IF p_modalidad NOT IN ('empleado_directo', 'socio_co_dependiente') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Selecciona una modalidad válida.');
  END IF;

  v_rama := public.unete_equipo_compute_rama_destacada(p_experiencia);
  IF v_rama IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Indica al menos una rama de experiencia.');
  END IF;

  v_cliente_id := public.unete_equipo_cliente_for_user();

  SELECT count(*)::int INTO v_active
  FROM public.unete_equipo_solicitudes s
  WHERE s.client_user_id = v_uid
    AND s.estado IN ('enviado', 'recibido');

  IF v_active > 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Ya tienes una solicitud en revisión. Espera la respuesta del salón.'
    );
  END IF;

  INSERT INTO public.unete_equipo_solicitudes (
    cliente_id,
    client_user_id,
    experiencia_ramas,
    rama_destacada,
    modalidad,
    mensaje,
    acepta_valores,
    estado
  )
  VALUES (
    v_cliente_id,
    v_uid,
    COALESCE(p_experiencia, '{}'::jsonb),
    v_rama,
    p_modalidad,
    trim(COALESCE(p_mensaje, '')),
    true,
    'enviado'
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'solicitud', row_to_json(v_row)::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unete_equipo_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.unete_equipo_solicitudes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_row
  FROM public.unete_equipo_solicitudes s
  WHERE s.client_user_id = v_uid
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'solicitud', null);
  END IF;

  RETURN jsonb_build_object('ok', true, 'solicitud', row_to_json(v_row)::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_unete_equipo_solicitudes_staff(p_estado text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
BEGIN
  IF NOT public.is_salon_staff() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso');
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      s.*,
      jsonb_build_object(
        'id', c.id,
        'nombre', c.nombre,
        'telefono', c.telefono,
        'email', c.email,
        'direccion', c.direccion,
        'cumpleanos', c.cumpleanos
      ) AS cliente
    FROM public.unete_equipo_solicitudes s
    LEFT JOIN public.clientes c ON c.id = s.cliente_id
    WHERE p_estado IS NULL OR s.estado = p_estado
    ORDER BY s.created_at DESC
  ) t;

  RETURN jsonb_build_object('ok', true, 'solicitudes', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_unete_equipo_estado_staff(
  p_id uuid,
  p_estado text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.unete_equipo_solicitudes%ROWTYPE;
BEGIN
  IF NOT public.is_salon_staff() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso');
  END IF;

  IF p_estado NOT IN ('recibido', 'revisado') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Estado no válido');
  END IF;

  SELECT * INTO v_row FROM public.unete_equipo_solicitudes WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solicitud no encontrada');
  END IF;

  IF p_estado = 'recibido' AND v_row.estado <> 'enviado' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo se puede confirmar recepción desde enviado');
  END IF;

  IF p_estado = 'revisado' AND v_row.estado <> 'recibido' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo se puede marcar revisado desde recibido');
  END IF;

  UPDATE public.unete_equipo_solicitudes
  SET
    estado = p_estado,
    updated_at = now(),
    recibido_at = CASE WHEN p_estado = 'recibido' THEN now() ELSE recibido_at END,
    revisado_at = CASE WHEN p_estado = 'revisado' THEN now() ELSE revisado_at END
  WHERE id = p_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'solicitud', row_to_json(v_row)::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_unete_equipo_solicitud(jsonb, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unete_equipo_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_unete_equipo_solicitudes_staff(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_unete_equipo_estado_staff(uuid, text) TO authenticated;
