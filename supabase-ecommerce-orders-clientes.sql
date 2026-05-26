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
