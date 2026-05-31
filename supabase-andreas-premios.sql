-- Programa ANDREAS · Premios (App Clientes)
-- Ejecutar en Supabase → SQL Editor después de tener tablas `clientes`, `ecommerce_orders`, `ecommerce_order_items`.
--
-- 1) Columnas en ficha cliente: código de invitación + JSON para contadores que solo el salón ajusta (compra física).
-- 2) RPC para resolver código → user_id del referidor (signup sin leer toda la tabla clientes).
-- 3) RPC para contar referidos verificados: primera compra entregada (app) o primera cita agendada, evitando RLS del referidor.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS codigo_referido text;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_codigo_referido_unique
  ON public.clientes (upper(trim(codigo_referido)))
  WHERE codigo_referido IS NOT NULL AND trim(codigo_referido) <> '';

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS andreas_premios jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.clientes.codigo_referido IS 'Código visible en Premios ANDREAS para invitar (único, mayúsculas recomendadas).';
COMMENT ON COLUMN public.clientes.andreas_premios IS 'JSON programa ANDREAS, ej. {"salon_fisico_unidades": 3} — idealmente solo staff/salón.';

-- Resolver código de referido → auth.users.id del dueño del código (para `referido_por` al registrarse).
CREATE OR REPLACE FUNCTION public.resolve_codigo_referido_andreas(p_codigo text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.user_id
  FROM public.clientes c
  WHERE c.user_id IS NOT NULL
    AND c.codigo_referido IS NOT NULL
    AND upper(trim(c.codigo_referido)) = upper(trim(COALESCE(p_codigo, '')))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_codigo_referido_andreas(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_codigo_referido_andreas(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_codigo_referido_andreas(text) TO service_role;

-- Referidos del usuario `p_referidor` (auth id) con primera compra entregada en app o al menos una cita activa.
CREATE OR REPLACE FUNCTION public.premios_andreas_referidos_primera_compra(p_referidor uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT c.user_id)::integer
  FROM public.clientes c
  WHERE c.referido_por = p_referidor
    AND c.user_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.ecommerce_orders o
        WHERE o.client_user_id = c.user_id
          AND o.status = 'delivered'
          AND EXISTS (
            SELECT 1
            FROM public.ecommerce_order_items i
            WHERE i.order_id = o.id
              AND COALESCE(i.qty, 0) > 0
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.citas ct
        WHERE ct.cliente_id = c.id
          AND lower(trim(coalesce(ct.estado, ''))) IN (
            'pendiente',
            'confirmado',
            'confirmada',
            'completado',
            'completada'
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.premios_andreas_referidos_primera_compra(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.premios_andreas_referidos_primera_compra(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.premios_andreas_referidos_primera_compra(uuid) TO service_role;

-- ─── Salón físico: sumar unidades al registrar venta (cliente con app vinculada) ───

CREATE OR REPLACE FUNCTION public.premios_andreas_es_servicio_inventario(p_notas text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_notas, '') LIKE '%"articuloTipo":"servicio"%'
      OR COALESCE(p_notas, '') LIKE '%"articuloTipo": "servicio"%';
$$;

CREATE OR REPLACE FUNCTION public.premios_andreas_contar_productos_items(p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_pid uuid;
  v_qty integer;
  v_tipo text;
  v_notas text;
  v_total integer := 0;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN 0;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_tipo := lower(trim(COALESCE(v_item->>'articulo_tipo', v_item->>'tipo', '')));
    IF v_tipo = 'servicio' THEN
      CONTINUE;
    END IF;
    v_qty := GREATEST(0, FLOOR(COALESCE((v_item->>'cantidad')::numeric, (v_item->>'qty')::numeric, 1)));
    IF v_qty < 1 THEN
      CONTINUE;
    END IF;
    IF v_tipo = 'producto' THEN
      v_total := v_total + v_qty;
      CONTINUE;
    END IF;
    BEGIN
      v_pid := NULLIF(trim(COALESCE(v_item->>'producto_id', v_item->>'productoId', '')), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_pid := NULL;
    END;
    IF v_pid IS NULL THEN
      v_total := v_total + v_qty;
      CONTINUE;
    END IF;
    SELECT i.notas INTO v_notas FROM public.inventario i WHERE i.id = v_pid;
    IF NOT FOUND OR NOT public.premios_andreas_es_servicio_inventario(v_notas) THEN
      v_total := v_total + v_qty;
    END IF;
  END LOOP;
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.premios_andreas_procesar_venta_salon(p_venta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta record;
  v_cliente_id uuid;
  v_cli record;
  v_ap jsonb;
  v_ids jsonb;
  v_delta integer;
  v_cur integer;
  v_new integer;
  v_meta integer;
  v_descuento numeric;
  v_membresia text;
BEGIN
  IF p_venta_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sin_venta');
  END IF;

  SELECT v.id, v.cliente_id, v.cliente_nombre, v.items, v.notas, v.detalles_pago
  INTO v_venta
  FROM public.ventas v
  WHERE v.id = p_venta_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'venta_no_encontrada');
  END IF;

  -- Canje salón físico ya consumido en Vender (app salón aplica descuento y reinicia en JS).
  IF COALESCE(v_venta.notas, '') ILIKE '%ANDREAS_CANJE_SALON%' THEN
    RETURN jsonb_build_object('ok', true, 'delta', 0, 'reason', 'canje_salon_consumido');
  END IF;

  -- Canje citas/servicio consumido en Vender (marcador ANDREAS_CANJE en notas).
  IF COALESCE(v_venta.notas, '') ILIKE '%ANDREAS_CANJE:%' THEN
    RETURN jsonb_build_object('ok', true, 'delta', 0, 'reason', 'canje_citas_consumido');
  END IF;

  -- Pedido de tienda app cobrado en salón (QR): NO es salón físico ANDREAS.
  IF COALESCE(v_venta.notas, '') ILIKE '%pedido tienda%'
     OR COALESCE(v_venta.notas, '') ILIKE '%app clientes%'
     OR COALESCE(v_venta.detalles_pago, '') ILIKE '%app clientes%'
     OR COALESCE(v_venta.detalles_pago, '') ILIKE '%pedido app%' THEN
    RETURN jsonb_build_object('ok', true, 'delta', 0, 'reason', 'venta_pedido_app');
  END IF;

  v_delta := public.premios_andreas_contar_productos_items(v_venta.items);
  IF v_delta < 1 THEN
    RETURN jsonb_build_object('ok', true, 'delta', 0, 'reason', 'sin_productos');
  END IF;

  v_cliente_id := v_venta.cliente_id;
  IF v_cliente_id IS NULL AND NULLIF(trim(COALESCE(v_venta.cliente_nombre, '')), '') IS NOT NULL THEN
    SELECT c.id INTO v_cliente_id
    FROM public.clientes c
    WHERE c.user_id IS NOT NULL
      AND lower(trim(c.nombre)) = lower(trim(v_venta.cliente_nombre))
    ORDER BY c.created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sin_cliente_vinculado');
  END IF;

  SELECT c.id, c.user_id, c.andreas_premios, c.membresia_nivel
  INTO v_cli
  FROM public.clientes c
  WHERE c.id = v_cliente_id;

  IF NOT FOUND OR v_cli.user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'cliente_sin_app');
  END IF;

  v_membresia := lower(trim(COALESCE(v_cli.membresia_nivel, '')));
  v_descuento := CASE v_membresia
    WHEN 'bronce' THEN 34.99
    WHEN 'plata' THEN 49.99
    WHEN 'vip' THEN 74.99
    ELSE 19.99
  END;

  v_ap := COALESCE(v_cli.andreas_premios, '{}'::jsonb);
  v_ids := COALESCE(v_ap->'salon_fisico_venta_ids', '[]'::jsonb);
  IF v_ids @> to_jsonb(p_venta_id::text) THEN
    RETURN jsonb_build_object('ok', true, 'delta', 0, 'reason', 'ya_procesada');
  END IF;

  v_cur := GREATEST(0, COALESCE((v_ap->>'salon_fisico_unidades')::integer, 0));
  v_new := v_cur + v_delta;
  v_ap := jsonb_set(v_ap, '{salon_fisico_unidades}', to_jsonb(v_new), true);

  v_meta := CASE v_membresia
    WHEN 'bronce' THEN 7
    WHEN 'plata' THEN 6
    WHEN 'vip' THEN 5
    ELSE COALESCE((v_ap->>'salon_fisico_meta')::integer, 8)
  END;

  -- Meta salón físico alcanzada → canje pendiente con % según membresía.
  IF v_new >= v_meta AND (v_ap->'salon_fisico_canje_pendiente') IS NULL THEN
    v_ap := jsonb_set(
      v_ap,
      '{salon_fisico_canje_pendiente}',
      jsonb_build_object(
        'at', now(),
        'meta', v_meta,
        'descuento_pct', v_descuento,
        'rule_id', 'salon'
      ),
      true
    );
  END IF;
  v_ap := jsonb_set(
    v_ap,
    '{salon_fisico_venta_ids}',
    v_ids || to_jsonb(p_venta_id::text),
    true
  );

  UPDATE public.clientes
  SET andreas_premios = v_ap
  WHERE id = v_cliente_id;

  RETURN jsonb_build_object(
    'ok', true,
    'delta', v_delta,
    'salon_fisico_unidades', v_new,
    'cliente_id', v_cliente_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.premios_andreas_trg_venta_salon_fisico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.premios_andreas_procesar_venta_salon(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ventas_andreas_salon_fisico ON public.ventas;
CREATE TRIGGER trg_ventas_andreas_salon_fisico
  AFTER INSERT ON public.ventas
  FOR EACH ROW
  EXECUTE FUNCTION public.premios_andreas_trg_venta_salon_fisico();

REVOKE ALL ON FUNCTION public.premios_andreas_procesar_venta_salon(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.premios_andreas_procesar_venta_salon(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.premios_andreas_procesar_venta_salon(uuid) TO service_role;

-- Reparar canjes pendientes antiguos sin descuento_pct (ejecutar una vez si Vender no detectaba el canje).
-- UPDATE public.clientes c
-- SET andreas_premios = jsonb_set(
--   c.andreas_premios,
--   '{salon_fisico_canje_pendiente}',
--   COALESCE(c.andreas_premios->'salon_fisico_canje_pendiente', '{}'::jsonb)
--     || jsonb_build_object(
--       'descuento_pct',
--       CASE lower(trim(COALESCE(c.membresia_nivel, '')))
--         WHEN 'bronce' THEN 34.99 WHEN 'plata' THEN 49.99 WHEN 'vip' THEN 74.99 ELSE 19.99
--       END
--     ),
--   true
-- )
-- WHERE c.andreas_premios->'salon_fisico_canje_pendiente' IS NOT NULL
--   AND (c.andreas_premios->'salon_fisico_canje_pendiente'->>'descuento_pct') IS NULL;
