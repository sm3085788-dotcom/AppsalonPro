-- AppSalon Pro — Pedidos (ecommerce_orders) en sucursal (admin_sucursal)
-- Ejecutar en Supabase SQL Editor si sucursal no ve o no puede confirmar pedidos.

-- Inbox filtrado por sucursal
CREATE OR REPLACE FUNCTION public.salon_pedidos_inbox(p_limit integer DEFAULT 500)
RETURNS SETOF public.ecommerce_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.ecommerce_orders o
  WHERE
    public.is_admin_global()
    OR (public.is_staff_or_admin() AND NOT public.is_admin_sucursal())
    OR (
      public.is_admin_sucursal()
      AND public.current_sucursal_id() IS NOT NULL
      AND o.sucursal_id = public.current_sucursal_id()
    )
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 1000));
$$;

REVOKE ALL ON FUNCTION public.salon_pedidos_inbox(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_pedidos_inbox(integer) TO authenticated;

-- Pedidos: sucursal ve y actualiza solo los de su local
DROP POLICY IF EXISTS ecommerce_orders_sucursal_select ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_sucursal_select ON public.ecommerce_orders
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

DROP POLICY IF EXISTS ecommerce_orders_sucursal_update ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_sucursal_update ON public.ecommerce_orders
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND sucursal_id = public.current_sucursal_id()
  );

-- Líneas del pedido (lectura vía pedido de la sucursal)
DROP POLICY IF EXISTS ecommerce_order_items_sucursal_select ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_sucursal_select ON public.ecommerce_order_items
  FOR SELECT TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ecommerce_orders o
      WHERE o.id = ecommerce_order_items.order_id
        AND o.sucursal_id = public.current_sucursal_id()
    )
  );

DROP POLICY IF EXISTS ecommerce_order_items_sucursal_update ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_sucursal_update ON public.ecommerce_order_items
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ecommerce_orders o
      WHERE o.id = ecommerce_order_items.order_id
        AND o.sucursal_id = public.current_sucursal_id()
    )
  )
  WITH CHECK (
    public.is_admin_sucursal()
    AND public.current_sucursal_id() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.ecommerce_orders o
      WHERE o.id = order_id
        AND o.sucursal_id = public.current_sucursal_id()
    )
  );
