-- Mis facturas en App Clientes: leer ventas propias
-- Ejecutar en Supabase → SQL Editor (una vez).

GRANT SELECT ON public.ventas TO authenticated;

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ventas_client_select_own ON public.ventas;
CREATE POLICY ventas_client_select_own
ON public.ventas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clientes c
    WHERE c.id = ventas.cliente_id
      AND c.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.client_mis_facturas(p_limit integer DEFAULT 200)
RETURNS SETOF public.ventas
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.*
  FROM public.ventas v
  INNER JOIN public.clientes c ON c.id = v.cliente_id
  WHERE c.user_id = auth.uid()
  ORDER BY COALESCE(v.fecha, now()) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
$$;

GRANT EXECUTE ON FUNCTION public.client_mis_facturas(integer) TO authenticated;
