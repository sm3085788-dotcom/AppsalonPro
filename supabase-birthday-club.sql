-- AppSalon Pro — Club Tu Cumpleaños (web + alertas marketing salón)
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS public.birthday_club_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL UNIQUE REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  id_verified_at timestamptz,
  id_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'enrolled'
    CHECK (status IN ('enrolled', 'id_verified', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS birthday_club_enrollments_status_idx
  ON public.birthday_club_enrollments (status, enrolled_at DESC);

CREATE TABLE IF NOT EXISTS public.birthday_club_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reaction text NOT NULL CHECK (reaction IN ('like', 'dislike', 'love')),
  comment text,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id)
);

CREATE INDEX IF NOT EXISTS birthday_club_reactions_created_idx
  ON public.birthday_club_reactions (created_at DESC);

ALTER TABLE public.birthday_club_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_club_reactions ENABLE ROW LEVEL SECURITY;

-- Realtime para alertas salón
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'birthday_club_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.birthday_club_reactions;
  END IF;
END $$;

-- ── Helpers ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.birthday_club_cliente_for_user()
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

-- ── RPCs web (authenticated) ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enroll_birthday_club()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_cliente public.clientes%ROWTYPE;
  v_row public.birthday_club_enrollments%ROWTYPE;
BEGIN
  v_cliente_id := public.birthday_club_cliente_for_user();
  IF v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión y completar tu perfil.');
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = v_cliente_id;

  IF nullif(trim(v_cliente.cumpleanos::text), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Completa tu fecha de cumpleaños en tu perfil.');
  END IF;

  INSERT INTO public.birthday_club_enrollments (cliente_id, user_id, status)
  VALUES (v_cliente_id, auth.uid(), 'enrolled')
  ON CONFLICT (cliente_id) DO UPDATE
  SET updated_at = now(),
      status = CASE
        WHEN public.birthday_club_enrollments.status = 'inactive' THEN 'enrolled'
        ELSE public.birthday_club_enrollments.status
      END
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'ok', true,
    'enrollment', row_to_json(v_row)::jsonb,
    'cliente_nombre', v_cliente.nombre
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_birthday_club_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_enroll public.birthday_club_enrollments%ROWTYPE;
  v_reaction public.birthday_club_reactions%ROWTYPE;
BEGIN
  v_cliente_id := public.birthday_club_cliente_for_user();
  IF v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'logged_in', false);
  END IF;

  SELECT * INTO v_enroll FROM public.birthday_club_enrollments WHERE cliente_id = v_cliente_id;
  SELECT * INTO v_reaction FROM public.birthday_club_reactions WHERE cliente_id = v_cliente_id;

  RETURN jsonb_build_object(
    'ok', true,
    'logged_in', true,
    'enrollment', CASE WHEN v_enroll.id IS NOT NULL THEN row_to_json(v_enroll)::jsonb ELSE null END,
    'reaction', CASE WHEN v_reaction.id IS NOT NULL THEN row_to_json(v_reaction)::jsonb ELSE null END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_birthday_club_reaction(
  p_reaction text,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_cliente public.clientes%ROWTYPE;
  v_reaction text := lower(trim(coalesce(p_reaction, '')));
  v_row public.birthday_club_reactions%ROWTYPE;
BEGIN
  IF v_reaction NOT IN ('like', 'dislike', 'love') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reacción inválida.');
  END IF;

  v_cliente_id := public.birthday_club_cliente_for_user();
  IF v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes iniciar sesión.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.birthday_club_enrollments WHERE cliente_id = v_cliente_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Debes unirte al club primero.');
  END IF;

  SELECT * INTO v_cliente FROM public.clientes WHERE id = v_cliente_id;

  INSERT INTO public.birthday_club_reactions (
    cliente_id, user_id, reaction, comment, author_name
  ) VALUES (
    v_cliente_id,
    auth.uid(),
    v_reaction,
    nullif(trim(p_comment), ''),
    nullif(trim(v_cliente.nombre), '')
  )
  ON CONFLICT (cliente_id) DO UPDATE
  SET reaction = EXCLUDED.reaction,
      comment = EXCLUDED.comment,
      author_name = EXCLUDED.author_name,
      updated_at = now()
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'reaction', row_to_json(v_row)::jsonb);
END;
$$;

-- ── RPC staff ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_birthday_club_id(p_cliente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.birthday_club_enrollments%ROWTYPE;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  IF p_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cliente inválido.');
  END IF;

  UPDATE public.birthday_club_enrollments
  SET status = 'id_verified',
      id_verified_at = now(),
      id_verified_by = auth.uid(),
      updated_at = now()
  WHERE cliente_id = p_cliente_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El cliente no está inscrito en el club cumpleaños.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'enrollment', row_to_json(v_row)::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_birthday_club_enrollment_for_cliente(p_cliente_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.birthday_club_enrollments%ROWTYPE;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permiso.');
  END IF;

  SELECT * INTO v_row FROM public.birthday_club_enrollments WHERE cliente_id = p_cliente_id;

  RETURN jsonb_build_object(
    'ok', true,
    'enrollment', CASE WHEN v_row.id IS NOT NULL THEN row_to_json(v_row)::jsonb ELSE null END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enroll_birthday_club() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_birthday_club_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_birthday_club_reaction(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_birthday_club_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_birthday_club_enrollment_for_cliente(uuid) TO authenticated;
