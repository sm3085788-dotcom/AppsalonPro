-- Reseñas de productos · App Clientes (tienda)
-- Ejecutar en Supabase → SQL Editor (todo el archivo de una vez).

CREATE TABLE IF NOT EXISTS public.inventario_resenas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventario_id uuid NOT NULL REFERENCES public.inventario(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  autor_nombre text NOT NULL DEFAULT '',
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comentario text NOT NULL DEFAULT '',
  foto_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventario_resenas_fotos_max CHECK (cardinality(foto_urls) <= 2)
);

CREATE INDEX IF NOT EXISTS inventario_resenas_inventario_idx
  ON public.inventario_resenas (inventario_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS inventario_resenas_one_per_user
  ON public.inventario_resenas (inventario_id, client_user_id);

ALTER TABLE public.inventario_resenas ENABLE ROW LEVEL SECURITY;

-- Funciones ANTES de policies que las referencian
-- (product_id en ecommerce_order_items es uuid, FK a inventario.id)
CREATE OR REPLACE FUNCTION public.cliente_puede_resenar_inventario(p_inventario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ecommerce_orders o
    JOIN public.ecommerce_order_items oi ON oi.order_id = o.id
    WHERE o.client_user_id = auth.uid()
      AND o.status = 'delivered'
      AND oi.product_id = p_inventario_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.cliente_puede_resenar_inventario(uuid) TO authenticated;

DROP POLICY IF EXISTS inventario_resenas_select ON public.inventario_resenas;
CREATE POLICY inventario_resenas_select
ON public.inventario_resenas FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS inventario_resenas_insert ON public.inventario_resenas;
CREATE POLICY inventario_resenas_insert
ON public.inventario_resenas FOR INSERT
TO authenticated
WITH CHECK (
  client_user_id = auth.uid()
  AND public.cliente_puede_resenar_inventario(inventario_id)
);

DROP POLICY IF EXISTS inventario_resenas_update ON public.inventario_resenas;
CREATE POLICY inventario_resenas_update
ON public.inventario_resenas FOR UPDATE
TO authenticated
USING (client_user_id = auth.uid())
WITH CHECK (client_user_id = auth.uid());

DROP POLICY IF EXISTS inventario_resenas_delete ON public.inventario_resenas;
CREATE POLICY inventario_resenas_delete
ON public.inventario_resenas FOR DELETE
TO authenticated
USING (client_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_resenas TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_inventario_resena_meta(p_inventario_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notas text;
  v_mark constant text := E'\n\n__TIENDA_UI_JSON__\n';
  v_staff text;
  v_meta jsonb;
  v_avg numeric;
  v_cnt int;
  v_pos int;
BEGIN
  SELECT notas INTO v_notas FROM public.inventario WHERE id = p_inventario_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 4.5), COUNT(*)::int
  INTO v_avg, v_cnt
  FROM public.inventario_resenas
  WHERE inventario_id = p_inventario_id;

  v_pos := position(v_mark in COALESCE(v_notas, ''));
  IF v_pos > 0 THEN
    v_staff := trim(substring(v_notas from 1 for v_pos - 1));
    BEGIN
      v_meta := trim(substring(v_notas from v_pos + length(v_mark)))::jsonb;
    EXCEPTION WHEN OTHERS THEN
      v_meta := '{}'::jsonb;
    END;
  ELSE
    v_staff := trim(COALESCE(v_notas, ''));
    v_meta := '{}'::jsonb;
  END IF;

  v_meta := jsonb_set(v_meta, '{rating}', to_jsonb(v_avg), true);
  v_meta := jsonb_set(v_meta, '{reviewCount}', to_jsonb(v_cnt), true);

  UPDATE public.inventario
  SET notas = CASE WHEN v_staff = '' THEN v_mark || v_meta::text ELSE v_staff || v_mark || v_meta::text END
  WHERE id = p_inventario_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_inventario_resenas_refresh_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_inventario_resena_meta(
    COALESCE(NEW.inventario_id, OLD.inventario_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS inventario_resenas_refresh_meta ON public.inventario_resenas;
CREATE TRIGGER inventario_resenas_refresh_meta
AFTER INSERT OR UPDATE OR DELETE ON public.inventario_resenas
FOR EACH ROW EXECUTE FUNCTION public.trg_inventario_resenas_refresh_meta();

-- Storage bucket para fotos de reseñas (lectura pública)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resenas-fotos', 'resenas-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS resenas_fotos_public_read ON storage.objects;
CREATE POLICY resenas_fotos_public_read
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resenas-fotos');

DROP POLICY IF EXISTS resenas_fotos_auth_insert ON storage.objects;
CREATE POLICY resenas_fotos_auth_insert
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resenas-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS resenas_fotos_auth_delete ON storage.objects;
CREATE POLICY resenas_fotos_auth_delete
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resenas-fotos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Migración: nombre visible en reseñas (ejecutar si la tabla ya existía)
ALTER TABLE public.inventario_resenas
  ADD COLUMN IF NOT EXISTS autor_nombre text NOT NULL DEFAULT '';

UPDATE public.inventario_resenas r
SET autor_nombre = trim(c.nombre)
FROM public.clientes c
WHERE r.cliente_id = c.id
  AND trim(COALESCE(r.autor_nombre, '')) = ''
  AND trim(COALESCE(c.nombre, '')) <> '';

-- Migración: nombre visible en reseñas (ejecutar si la tabla ya existía)
ALTER TABLE public.inventario_resenas
  ADD COLUMN IF NOT EXISTS autor_nombre text NOT NULL DEFAULT '';

UPDATE public.inventario_resenas r
SET autor_nombre = trim(c.nombre)
FROM public.clientes c
WHERE r.cliente_id = c.id
  AND trim(COALESCE(r.autor_nombre, '')) = ''
  AND trim(COALESCE(c.nombre, '')) <> '';
