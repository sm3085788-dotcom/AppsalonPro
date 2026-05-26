-- App Salón · Pedidos (ecommerce_orders + líneas)
-- Ejecutar en Supabase → SQL Editor DESPUÉS de supabase-ecommerce-orders-clientes.sql
-- Si los pedidos de App Clientes no aparecen en Pedidos del salón, ejecutá este script.

GRANT SELECT, UPDATE ON public.ecommerce_orders TO authenticated;
GRANT SELECT ON public.ecommerce_order_items TO authenticated;

ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecommerce_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ecommerce_orders_role_select ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_role_select
ON public.ecommerce_orders
FOR SELECT
TO authenticated
USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS ecommerce_orders_role_insert ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_role_insert
ON public.ecommerce_orders
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS ecommerce_orders_role_update ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_role_update
ON public.ecommerce_orders
FOR UPDATE
TO authenticated
USING (public.is_staff_or_admin())
WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS ecommerce_orders_role_delete ON public.ecommerce_orders;
CREATE POLICY ecommerce_orders_role_delete
ON public.ecommerce_orders
FOR DELETE
TO authenticated
USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS ecommerce_order_items_role_select ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_role_select
ON public.ecommerce_order_items
FOR SELECT
TO authenticated
USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS ecommerce_order_items_role_insert ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_role_insert
ON public.ecommerce_order_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS ecommerce_order_items_role_update ON public.ecommerce_order_items;
CREATE POLICY ecommerce_order_items_role_update
ON public.ecommerce_order_items
FOR UPDATE
TO authenticated
USING (public.is_staff_or_admin())
WITH CHECK (public.is_staff_or_admin());

CREATE OR REPLACE FUNCTION public.salon_pedidos_inbox(p_limit integer DEFAULT 500)
RETURNS SETOF public.ecommerce_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.ecommerce_orders o
  WHERE public.is_staff_or_admin()
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 500), 1000));
$$;

REVOKE ALL ON FUNCTION public.salon_pedidos_inbox(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_pedidos_inbox(integer) TO authenticated;
