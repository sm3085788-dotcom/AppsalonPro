-- Promociones temporales en inventario (meta JSON en notas).
-- Ejecutar en Supabase SQL Editor después de scripts de inventario / sucursales.

CREATE OR REPLACE FUNCTION public.inventario_extract_meta_json(p_notas text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_pos int;
  v_json text;
BEGIN
  v_pos := strpos(coalesce(p_notas, ''), '__TIENDA_UI_JSON__');
  IF v_pos = 0 THEN
    RETURN '{}'::jsonb;
  END IF;
  v_json := trim(substring(p_notas from v_pos + length('__TIENDA_UI_JSON__')));
  IF v_json = '' THEN
    RETURN '{}'::jsonb;
  END IF;
  BEGIN
    RETURN coalesce(v_json::jsonb, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    RETURN '{}'::jsonb;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventario_merge_meta_json(p_notas text, p_patch jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_pos int;
  v_staff text;
  v_meta jsonb;
BEGIN
  v_pos := strpos(coalesce(p_notas, ''), '__TIENDA_UI_JSON__');
  IF v_pos = 0 THEN
    v_staff := trim(coalesce(p_notas, ''));
    v_meta := '{}'::jsonb;
  ELSE
    v_staff := trim(substring(p_notas from 1 for v_pos - 1));
    v_meta := public.inventario_extract_meta_json(p_notas);
  END IF;
  v_meta := v_meta || coalesce(p_patch, '{}'::jsonb);
  RETURN v_staff || E'\n\n__TIENDA_UI_JSON__\n' || v_meta::text;
END;
$$;

-- Expira promos vencidas y restaura precio original (columna + meta).
CREATE OR REPLACE FUNCTION public.inventario_expirar_promociones_vencidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.inventario%ROWTYPE;
  v_meta jsonb;
  v_count int := 0;
  v_hasta date;
  v_orig numeric;
BEGIN
  FOR v_row IN SELECT * FROM public.inventario
  LOOP
    v_meta := public.inventario_extract_meta_json(v_row.notas);
    IF coalesce((v_meta->>'promocionActiva')::boolean, false) IS NOT TRUE THEN
      CONTINUE;
    END IF;
    BEGIN
      v_hasta := (v_meta->>'promocionHasta')::date;
    EXCEPTION WHEN OTHERS THEN
      v_hasta := NULL;
    END;
    IF v_hasta IS NULL OR v_hasta >= current_date THEN
      CONTINUE;
    END IF;

    v_orig := NULLIF(v_meta->>'promocionPrecioOriginal', '')::numeric;
    v_meta := v_meta
      - 'promocionActiva'
      - 'promocionDesde'
      - 'promocionHasta'
      - 'promocionPrecioOriginal'
      - 'promocionPreciosPorVolumenOriginal';

    IF v_orig IS NOT NULL AND v_orig > 0 THEN
      UPDATE public.inventario
      SET
        precio_venta = v_orig,
        notas = public.inventario_merge_meta_json(v_row.notas, v_meta),
        updated_at = now()
      WHERE id = v_row.id;
    ELSE
      UPDATE public.inventario
      SET
        notas = public.inventario_merge_meta_json(v_row.notas, v_meta),
        updated_at = now()
      WHERE id = v_row.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Primera URL pública de imagen (imagen_url o primera de galería text[] / jsonb).
CREATE OR REPLACE FUNCTION public.inventario_resolve_image_url(
  p_imagen_url text,
  p_imagenes_urls jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_main text;
  v_gallery jsonb;
BEGIN
  v_main := nullif(trim(coalesce(p_imagen_url, '')), '');
  IF v_main IS NOT NULL THEN
    RETURN v_main;
  END IF;
  IF p_imagenes_urls IS NULL THEN
    RETURN NULL;
  END IF;
  IF jsonb_typeof(p_imagenes_urls) = 'array' AND jsonb_array_length(p_imagenes_urls) > 0 THEN
    RETURN nullif(trim(p_imagenes_urls->>0), '');
  END IF;
  RETURN NULL;
END;
$$;

-- Sobrecarga para columna text[] en inventario.imagenes_urls
CREATE OR REPLACE FUNCTION public.inventario_resolve_image_url(
  p_imagen_url text,
  p_imagenes_urls text[]
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(trim(coalesce(p_imagen_url, '')), ''),
    nullif(trim(p_imagenes_urls[1]), '')
  );
$$;

-- Lista promos vigentes para n8n / chat automático.
CREATE OR REPLACE FUNCTION public.n8n_list_promociones_vigentes()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.inventario%ROWTYPE;
  v_meta jsonb;
  v_hasta date;
  v_lines text := '';
  v_tipo text;
  v_venta numeric;
  v_orig numeric;
BEGIN
  PERFORM public.inventario_expirar_promociones_vencidas();

  FOR v_row IN
    SELECT * FROM public.inventario
    ORDER BY nombre
  LOOP
    v_meta := public.inventario_extract_meta_json(v_row.notas);
    IF coalesce((v_meta->>'promocionActiva')::boolean, false) IS NOT TRUE THEN
      CONTINUE;
    END IF;
    BEGIN
      v_hasta := (v_meta->>'promocionHasta')::date;
    EXCEPTION WHEN OTHERS THEN
      v_hasta := NULL;
    END;
    IF v_hasta IS NULL OR v_hasta < current_date THEN
      CONTINUE;
    END IF;

    v_tipo := CASE WHEN coalesce(v_meta->>'articuloTipo', 'producto') = 'servicio' THEN 'Servicio' ELSE 'Producto' END;
    v_venta := coalesce(v_row.precio_venta, 0);
    v_orig := NULLIF(v_meta->>'promocionPrecioOriginal', '')::numeric;

    v_lines := v_lines || E'\n• ' || v_tipo || ' «' || trim(v_row.nombre) || '»: Q'
      || trim(to_char(v_venta, 'FM999999990.00'))
      || CASE
           WHEN v_orig IS NOT NULL AND v_orig > v_venta THEN ' (antes Q' || trim(to_char(v_orig, 'FM999999990.00')) || ')'
           ELSE ''
         END
      || ' — hasta ' || to_char(v_hasta, 'DD/MM/YYYY');
  END LOOP;

  IF v_lines = '' THEN
    RETURN 'Por ahora no hay promociones activas en el catálogo. Consultá la tienda en App Clientes.';
  END IF;
  RETURN trim(v_lines);
END;
$$;

-- Catálogo JSON de promos vigentes (para envío con imagen en chat).
CREATE OR REPLACE FUNCTION public.n8n_get_promociones_vigentes_json()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.inventario%ROWTYPE;
  v_meta jsonb;
  v_hasta date;
  v_items jsonb := '[]'::jsonb;
  v_tipo text;
  v_venta numeric;
  v_orig numeric;
  v_img text;
  v_price text;
  v_compare text;
  v_pv jsonb;
  v_key text;
  v_min numeric;
  v_min_orig numeric;
  v_n numeric;
BEGIN
  PERFORM public.inventario_expirar_promociones_vencidas();

  FOR v_row IN
    SELECT * FROM public.inventario
    ORDER BY nombre
  LOOP
    v_meta := public.inventario_extract_meta_json(v_row.notas);
    IF coalesce((v_meta->>'promocionActiva')::boolean, false) IS NOT TRUE THEN
      CONTINUE;
    END IF;
    BEGIN
      v_hasta := (v_meta->>'promocionHasta')::date;
    EXCEPTION WHEN OTHERS THEN
      v_hasta := NULL;
    END;
    IF v_hasta IS NULL OR v_hasta < current_date THEN
      CONTINUE;
    END IF;

    v_tipo := coalesce(v_meta->>'articuloTipo', 'producto');
    v_venta := coalesce(v_row.precio_venta, 0);
    v_orig := NULLIF(v_meta->>'promocionPrecioOriginal', '')::numeric;
    v_price := 'Q' || trim(to_char(v_venta, 'FM999999990.00'));
    v_compare := NULL;

    IF coalesce((v_meta->>'volumenTrabajoActivo')::boolean, false) THEN
      v_pv := v_meta->'preciosPorVolumen';
      v_min := NULL;
      IF v_pv IS NOT NULL AND jsonb_typeof(v_pv) = 'object' THEN
        FOR v_key IN SELECT jsonb_object_keys(v_pv)
        LOOP
          v_n := NULLIF(v_pv->>v_key, '')::numeric;
          IF v_n IS NOT NULL AND v_n > 0 AND (v_min IS NULL OR v_n < v_min) THEN
            v_min := v_n;
          END IF;
        END LOOP;
      END IF;
      IF v_min IS NOT NULL THEN
        v_venta := v_min;
        v_price := 'Desde Q' || trim(to_char(v_min, 'FM999999990.00'));
      END IF;
      v_pv := v_meta->'promocionPreciosPorVolumenOriginal';
      v_min_orig := NULL;
      IF v_pv IS NOT NULL AND jsonb_typeof(v_pv) = 'object' THEN
        FOR v_key IN SELECT jsonb_object_keys(v_pv)
        LOOP
          v_n := NULLIF(v_pv->>v_key, '')::numeric;
          IF v_n IS NOT NULL AND v_n > 0 AND (v_min_orig IS NULL OR v_n < v_min_orig) THEN
            v_min_orig := v_n;
          END IF;
        END LOOP;
      END IF;
      IF v_min_orig IS NOT NULL AND v_min IS NOT NULL AND v_min_orig > v_min THEN
        v_compare := 'Q' || trim(to_char(v_min_orig, 'FM999999990.00'));
      END IF;
    ELSIF v_orig IS NOT NULL AND v_orig > v_venta THEN
      v_compare := 'Q' || trim(to_char(v_orig, 'FM999999990.00'));
    END IF;

    v_img := public.inventario_resolve_image_url(v_row.imagen_url, v_row.imagenes_urls);

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'v', 1,
        'inventarioId', v_row.id,
        'nombre', trim(v_row.nombre),
        'articuloTipo', v_tipo,
        'priceLabel', v_price,
        'compareAtLabel', v_compare,
        'hastaLabel', to_char(v_hasta, 'DD/MM/YYYY'),
        'imagenUrl', v_img
      )
    );
  END LOOP;

  RETURN v_items;
END;
$$;

-- Intro + un mensaje por promo con imagen compacta (content_type promo_inventario).
CREATE OR REPLACE FUNCTION public.n8n_send_promos_chat_reply(
  p_queue_id bigint,
  p_n8n_intent text DEFAULT 'chat.promos',
  p_created_by_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q public.chat_automation_queue%ROWTYPE;
  v_settings public.chat_automation_settings%ROWTYPE;
  v_bot text;
  v_intro public.marketing_direct_messages%ROWTYPE;
  v_row public.marketing_direct_messages%ROWTYPE;
  v_item jsonb;
  v_items jsonb;
  v_body text;
  v_img text;
  v_first_id bigint;
  v_count int := 0;
BEGIN
  PERFORM public.assert_n8n_service_role();

  SELECT * INTO v_q FROM public.chat_automation_queue WHERE id = p_queue_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'queue_not_found');
  END IF;

  IF v_q.status = 'replied' AND v_q.reply_message_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_replied', true, 'reply_message_id', v_q.reply_message_id);
  END IF;

  IF v_q.status = 'superseded' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'superseded');
  END IF;

  SELECT * INTO v_settings FROM public.chat_automation_settings WHERE id = 1;
  v_bot := coalesce(nullif(trim(p_created_by_name), ''), v_settings.bot_display_name, 'Andreas Pro');
  v_items := public.n8n_get_promociones_vigentes_json();

  IF jsonb_array_length(v_items) = 0 THEN
    v_body := 'Por ahora no hay promociones activas en el catálogo. Consultá la tienda en App Clientes.';
    INSERT INTO public.marketing_direct_messages (
      client_id, client_name, client_phone, content, content_type, status, created_by, created_by_name
    )
    VALUES (
      v_q.client_id, coalesce(v_q.client_name, 'Cliente'), v_q.client_phone,
      v_body, 'chat', 'pending_sync', NULL, v_bot
    )
    RETURNING * INTO v_intro;
    v_first_id := v_intro.id;
    v_count := 1;
    PERFORM public.notify_client_from_mdm_message(v_intro.id);
  ELSE
    v_body := '¡Hola! Estas son las promociones vigentes en Andreas Pro (cada una con foto y precio):';
    INSERT INTO public.marketing_direct_messages (
      client_id, client_name, client_phone, content, content_type, status, created_by, created_by_name
    )
    VALUES (
      v_q.client_id, coalesce(v_q.client_name, 'Cliente'), v_q.client_phone,
      v_body, 'chat', 'pending_sync', NULL, v_bot
    )
    RETURNING * INTO v_intro;
    v_first_id := v_intro.id;
    v_count := 1;
    PERFORM public.notify_client_from_mdm_message(v_intro.id);

    FOR v_item IN SELECT value FROM jsonb_array_elements(v_items)
    LOOP
      v_body := v_item::text;
      v_img := coalesce(
        nullif(trim(v_item->>'imagenUrl'), ''),
        public.inventario_resolve_image_url(v_item->>'imagenUrl', NULL)
      );
      INSERT INTO public.marketing_direct_messages (
        client_id, client_name, client_phone, content, content_type,
        media_url, media_kind, status, created_by, created_by_name
      )
      VALUES (
        v_q.client_id, coalesce(v_q.client_name, 'Cliente'), v_q.client_phone,
        v_body, 'promo_inventario',
        v_img, CASE WHEN v_img IS NOT NULL THEN 'image' ELSE NULL END,
        'pending_sync', NULL, v_bot
      )
      RETURNING * INTO v_row;
      v_count := v_count + 1;
      PERFORM public.notify_client_from_mdm_message(v_row.id);
    END LOOP;
  END IF;

  UPDATE public.chat_automation_queue
  SET
    status = 'replied',
    n8n_intent = coalesce(nullif(trim(p_n8n_intent), ''), 'chat.promos'),
    reply_message_id = v_first_id,
    processed_at = now()
  WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'ok', true,
    'reply_message_id', v_first_id,
    'promo_messages_sent', v_count,
    'queue_id', p_queue_id,
    'client_id', v_q.client_id
  );
END;
$$;

-- Direcciones de central + sucursales activas.
CREATE OR REPLACE FUNCTION public.n8n_format_sucursales_direcciones()
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_lines text := '';
  r record;
BEGIN
  FOR r IN
    SELECT nombre, direccion, telefono, es_matriz
    FROM public.sucursales
    WHERE activa IS TRUE
    ORDER BY es_matriz DESC, nombre
  LOOP
    v_lines := v_lines || E'\n• '
      || trim(r.nombre)
      || CASE WHEN r.es_matriz THEN ' (Central)' ELSE '' END
      || ': '
      || coalesce(nullif(trim(r.direccion), ''), 'Dirección disponible en App Clientes')
      || CASE
           WHEN nullif(trim(r.telefono), '') IS NOT NULL THEN ' · Tel. ' || trim(r.telefono)
           ELSE ''
         END;
  END LOOP;
  IF v_lines = '' THEN
    RETURN 'Consultá las direcciones en App Clientes → selector de sucursal.';
  END IF;
  RETURN trim(v_lines);
END;
$$;

GRANT EXECUTE ON FUNCTION public.inventario_extract_meta_json(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inventario_merge_meta_json(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inventario_expirar_promociones_vencidas() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inventario_resolve_image_url(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.inventario_resolve_image_url(text, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.n8n_list_promociones_vigentes() TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_get_promociones_vigentes_json() TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_send_promos_chat_reply(bigint, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.n8n_format_sucursales_direcciones() TO service_role;
