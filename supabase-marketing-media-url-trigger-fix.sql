-- =============================================================================
-- AppSalon Pro — marketing_posts: trigger validate_marketing_media_url
--
-- Síntoma: productos se importan al carrusel pero servicios fallan (o INSERT rechazado).
-- Causa habitual: el trigger solo acepta URLs del bucket Storage y rechaza:
--   - https://images.unsplash.com/... (imagen de categoría para servicios sin portada)
--   - file://... (foto local en inventario que nunca se subió a Storage)
--
-- Ejecutar en Supabase → SQL Editor → Run → Reload API schema
-- =============================================================================

-- 1) Ver la función actual (diagnóstico)
-- SELECT pg_get_functiondef(p.oid)
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'validate_marketing_media_url';

-- 2) Función permisiva: HTTPS público o NULL; rechaza file:// y esquemas raros
CREATE OR REPLACE FUNCTION public.validate_marketing_media_url()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  u text;
BEGIN
  u := NULLIF(TRIM(NEW.media_url), '');

  -- Sin imagen: permitido (posts solo texto; el carrusel en la app exige URL antes de insertar)
  IF u IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bloquear rutas locales que Postgres/App no pueden servir al cliente
  IF u ~* '^(file|content|data|blob):' THEN
    RAISE EXCEPTION
      'media_url inválida: subí la imagen a Storage (bucket inventario o tendencias). URL local: %',
      LEFT(u, 120);
  END IF;

  -- Aceptar https/http (Supabase Storage, Unsplash, CDN, etc.)
  IF u ~* '^https?://' THEN
    -- Opcional: rellenar media_kind si la app no lo envía
    IF NEW.media_kind IS NULL OR TRIM(NEW.media_kind) = '' THEN
      IF NEW.content_type = 'image' OR u ~* '\.(jpe?g|png|gif|webp)(\?|$)' THEN
        NEW.media_kind := 'image';
      ELSIF NEW.content_type = 'video' OR u ~* '\.(mp4|webm|mov)(\?|$)' THEN
        NEW.media_kind := 'video';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'media_url debe ser http(s) público. Recibido: %',
    LEFT(u, 120);
END;
$$;

-- 3) Asegurar que el trigger siga activo (ya lo tenés; solo reemplaza la función)
DROP TRIGGER IF EXISTS trg_validate_marketing_media_url ON public.marketing_posts;
CREATE TRIGGER trg_validate_marketing_media_url
  BEFORE INSERT OR UPDATE OF media_url
  ON public.marketing_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_marketing_media_url();

-- 4) Lectura pública del carrusel (App Clientes)
DROP POLICY IF EXISTS marketing_posts_public_read ON public.marketing_posts;
CREATE POLICY marketing_posts_public_read
ON public.marketing_posts FOR SELECT
TO anon, authenticated
USING (status = 'published' AND visibility = 'public');

GRANT SELECT ON public.marketing_posts TO anon, authenticated;
