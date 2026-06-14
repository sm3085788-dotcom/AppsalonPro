-- Sincroniza puntos ANDREAS del invitado (y cualquier cliente app) al entregar pedido tienda.
-- El staff del salón no puede UPDATE clientes.andreas_premios por RLS; este RPC es SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.premios_andreas_rule_id_pedido(
  p_payment_method text,
  p_fulfillment_type text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(trim(COALESCE(p_payment_method, ''))) IN ('efectivo', 'cash')
      AND (
        lower(trim(COALESCE(p_fulfillment_type, ''))) IN ('retiro_salon', 'pickup', 'retiro')
        OR lower(trim(COALESCE(p_fulfillment_type, ''))) LIKE '%retiro%'
      )
      THEN 'p_app_efectivo_retiro'
    WHEN (
        lower(trim(COALESCE(p_payment_method, ''))) IN ('tarjeta', 'card')
        OR lower(trim(COALESCE(p_payment_method, ''))) LIKE '%tarjeta%'
        OR lower(trim(COALESCE(p_payment_method, ''))) LIKE '%card%'
      )
      AND (
        lower(trim(COALESCE(p_fulfillment_type, ''))) IN ('domicilio', 'delivery')
        OR lower(trim(COALESCE(p_fulfillment_type, ''))) LIKE '%domicilio%'
        OR lower(trim(COALESCE(p_fulfillment_type, ''))) LIKE '%envio%'
        OR lower(trim(COALESCE(p_fulfillment_type, ''))) LIKE '%envío%'
      )
      THEN 'p_app_tarjeta_delivery'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.premios_andreas_contar_productos_pedido(p_order_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(GREATEST(0, FLOOR(COALESCE(eoi.qty, 0)::numeric)))::int, 0)
  FROM public.ecommerce_order_items eoi
  LEFT JOIN public.inventario i ON i.id = eoi.product_id
  WHERE eoi.order_id = p_order_id
    AND NOT public.premios_andreas_es_servicio_inventario(i.notas);
$$;

CREATE OR REPLACE FUNCTION public.premios_andreas_sync_pedido_entregado(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.ecommerce_orders%ROWTYPE;
  v_cli public.clientes%ROWTYPE;
  v_ap jsonb;
  v_rule_id text;
  v_canje_rule text;
  v_qty integer;
  v_meta integer;
  v_descuento numeric;
  v_membresia text;
  v_rule jsonb;
  v_puntos integer;
  v_pedidos jsonb;
  v_canje jsonb;
  v_order_key text;
  v_snap jsonb;
  v_canje_snap jsonb;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin pedido');
  END IF;

  SELECT * INTO v_order FROM public.ecommerce_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pedido no encontrado');
  END IF;

  IF lower(trim(COALESCE(v_order.status, ''))) <> 'delivered' THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'pedido_no_entregado');
  END IF;

  IF v_order.client_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'sin_usuario_app');
  END IF;

  IF NOT (
    COALESCE(public.is_staff_or_admin(), false)
    OR COALESCE(public.is_admin_sucursal(), false)
    OR COALESCE(public.is_admin_global(), false)
    OR auth.uid() = v_order.client_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sin permisos');
  END IF;

  SELECT * INTO v_cli FROM public.clientes WHERE user_id = v_order.client_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'skip', true, 'reason', 'sin_ficha');
  END IF;

  v_qty := public.premios_andreas_contar_productos_pedido(p_order_id);
  IF v_qty < 1 THEN
    RETURN jsonb_build_object('ok', true, 'skip', true, 'reason', 'sin_productos', 'cliente_id', v_cli.id);
  END IF;

  v_rule_id := public.premios_andreas_rule_id_pedido(v_order.payment_method, v_order.fulfillment_type);
  IF v_rule_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'skip', true, 'reason', 'regla_no_aplica', 'cliente_id', v_cli.id);
  END IF;

  v_membresia := lower(trim(COALESCE(v_cli.membresia_nivel, '')));
  v_meta := CASE v_membresia
    WHEN 'bronce' THEN 7
    WHEN 'plata' THEN 6
    WHEN 'vip' THEN 5
    ELSE 8
  END;
  v_descuento := CASE v_membresia
    WHEN 'bronce' THEN 34.99
    WHEN 'plata' THEN 49.99
    WHEN 'vip' THEN 74.99
    ELSE 19.99
  END;

  v_ap := COALESCE(v_cli.andreas_premios, '{}'::jsonb);
  IF v_ap->'reglas' IS NULL OR jsonb_typeof(v_ap->'reglas') <> 'object' THEN
    v_ap := jsonb_set(v_ap, '{reglas}', '{}'::jsonb, true);
  END IF;

  v_order_key := p_order_id::text;
  v_snap := COALESCE(v_order.checkout_snapshot, '{}'::jsonb);
  v_canje_snap := v_snap->'andreas_canje';
  v_canje_rule := NULLIF(trim(COALESCE(v_canje_snap->>'rule_id', '')), '');

  IF v_canje_rule IS NOT NULL THEN
    v_rule_id := v_canje_rule;
    v_rule := COALESCE(v_ap->'reglas'->v_rule_id, jsonb_build_object(
      'puntos', 0, 'pedidos_ids', '[]'::jsonb, 'canje_pendiente', null
    ));
    v_puntos := v_qty;
    v_pedidos := jsonb_build_array(v_order_key);
    v_canje := NULL;
    IF v_puntos >= v_meta THEN
      v_canje := jsonb_build_object(
        'at', to_jsonb(now()),
        'descuento_pct', v_descuento,
        'meta', v_meta,
        'rule_id', v_rule_id
      );
    END IF;
  ELSE
    v_rule := COALESCE(v_ap->'reglas'->v_rule_id, jsonb_build_object(
      'puntos', 0, 'pedidos_ids', '[]'::jsonb, 'canje_pendiente', null
    ));
    v_pedidos := COALESCE(v_rule->'pedidos_ids', '[]'::jsonb);
    IF v_pedidos @> to_jsonb(v_order_key) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'already', true,
        'cliente_id', v_cli.id,
        'rule_id', v_rule_id,
        'puntos', COALESCE((v_rule->>'puntos')::int, 0)
      );
    END IF;

    v_puntos := GREATEST(0, COALESCE((v_rule->>'puntos')::int, 0));
    v_canje := v_rule->'canje_pendiente';

    IF v_canje IS NOT NULL AND v_canje <> 'null'::jsonb THEN
      v_puntos := v_qty;
      v_pedidos := jsonb_build_array(v_order_key);
      v_canje := NULL;
    ELSE
      v_puntos := v_puntos + v_qty;
      v_pedidos := v_pedidos || to_jsonb(v_order_key);
    END IF;

    IF v_puntos >= v_meta AND (v_canje IS NULL OR v_canje = 'null'::jsonb) THEN
      v_canje := jsonb_build_object(
        'at', to_jsonb(now()),
        'descuento_pct', v_descuento,
        'meta', v_meta,
        'rule_id', v_rule_id
      );
    END IF;
  END IF;

  v_rule := jsonb_build_object(
    'puntos', v_puntos,
    'pedidos_ids', v_pedidos,
    'canje_pendiente', v_canje
  );
  v_ap := jsonb_set(v_ap, ARRAY['reglas', v_rule_id], v_rule, true);

  UPDATE public.clientes
  SET andreas_premios = v_ap
  WHERE id = v_cli.id;

  RETURN jsonb_build_object(
    'ok', true,
    'cliente_id', v_cli.id,
    'rule_id', v_rule_id,
    'puntos', v_puntos,
    'productos', v_qty
  );
END;
$$;

REVOKE ALL ON FUNCTION public.premios_andreas_sync_pedido_entregado(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.premios_andreas_sync_pedido_entregado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.premios_andreas_sync_pedido_entregado(uuid) TO service_role;
