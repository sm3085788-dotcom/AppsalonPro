-- AppSalon Pro — Mis pedidos en App Clientes (ecommerce_orders)
-- Ejecutar si la bandeja «Mis pedidos» queda vacía o muestra error de permisos.

GRANT SELECT, INSERT ON public.ecommerce_orders TO authenticated;
GRANT SELECT, INSERT ON public.ecommerce_order_items TO authenticated;

ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_order_items ENABLE ROW LEVEL SECURITY;

-- Cliente: ver y crear solo sus pedidos (cualquier sucursal)
DROP POLICY IF EXISTS ecommerce_orders_client_insert ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_client_insert ON public.ecommerce_orders
  FOR INSERT TO authenticated
  WITH CHECK (client_user_id = auth.uid());

DROP POLICY IF EXISTS ecommerce_orders_client_select ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_client_select ON public.ecommerce_orders
  FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

DROP POLICY IF EXISTS ecommerce_order_items_client_insert ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_client_insert ON public.ecommerce_order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ecommerce_orders o
      WHERE o.id = ecommerce_order_items.order_id
        AND o.client_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ecommerce_order_items_client_select ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_client_select ON public.ecommerce_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ecommerce_orders o
      WHERE o.id = ecommerce_order_items.order_id
        AND o.client_user_id = auth.uid()
    )
  );

-- Fallback RPC (por si RLS directo falla)
CREATE OR REPLACE FUNCTION public.client_mis_pedidos(p_limit integer DEFAULT 500)
RETURNS SETOF public.ecommerce_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.ecommerce_orders o
  WHERE o.client_user_id = auth.uid()
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 1000));
$$;

REVOKE ALL ON FUNCTION public.client_mis_pedidos(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_mis_pedidos(integer) TO authenticated;
