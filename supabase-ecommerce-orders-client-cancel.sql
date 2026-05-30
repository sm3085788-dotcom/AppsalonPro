-- App Clientes · cancelar pedido propio (ecommerce_orders)
-- Ejecutar en Supabase → SQL Editor después de supabase-ecommerce-orders-clientes.sql

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
