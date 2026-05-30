-- App Clientes · Tienda: pedidos en efectivo (ecommerce_orders + líneas)
-- Ejecutar en Supabase → SQL Editor si ves:
--   "permission denied for table ecommerce_orders"
--   o "new row violates row-level security policy" al confirmar pedido.
--
-- IMPORTANTE: para que los pedidos aparezcan en App Salón · Pedidos, ejecutá también:
--   supabase-ecommerce-orders-salon.sql

-- Permisos de tabla (sin GRANT, PostgREST responde "permission denied for table …")
GRANT SELECT, INSERT ON public.ecommerce_orders TO authenticated;
GRANT SELECT, INSERT ON public.ecommerce_order_items TO authenticated;

ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_order_items ENABLE ROW LEVEL SECURITY;

-- Pedido: el cliente solo crea filas con su auth.users.id
DROP POLICY IF EXISTS ecommerce_orders_client_insert ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_client_insert
ON public.ecommerce_orders
FOR INSERT
TO authenticated
WITH CHECK (client_user_id = auth.uid());

DROP POLICY IF EXISTS ecommerce_orders_client_select ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_client_select
ON public.ecommerce_orders
FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

-- Líneas del pedido: solo si el pedido pertenece al usuario
DROP POLICY IF EXISTS ecommerce_order_items_client_insert ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_client_insert
ON public.ecommerce_order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ecommerce_orders o
    WHERE o.id = ecommerce_order_items.order_id
      AND o.client_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS ecommerce_order_items_client_select ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_client_select
ON public.ecommerce_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ecommerce_orders o
    WHERE o.id = ecommerce_order_items.order_id
      AND o.client_user_id = auth.uid()
  )
);

-- Cancelación por el cliente (RPC). Ver también supabase-ecommerce-orders-client-cancel.sql
CREATE OR REPLACE FUNCTION public.client_cancel_pedido(
  p_order_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.ecommerce_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ecommerce_orders;
BEGIN
  SELECT * INTO v_row FROM public.ecommerce_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido no encontrado';
  END IF;
  IF v_row.client_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF v_row.status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Este pedido no se puede cancelar';
  END IF;

  UPDATE public.ecommerce_orders
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_reason = NULLIF(trim(p_reason), ''),
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.client_cancel_pedido(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_cancel_pedido(uuid, text) TO authenticated;
