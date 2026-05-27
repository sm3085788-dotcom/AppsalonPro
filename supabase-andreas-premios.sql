-- Programa ANDREAS · Premios (App Clientes)
-- Ejecutar en Supabase → SQL Editor después de tener tablas `clientes`, `ecommerce_orders`, `ecommerce_order_items`.
--
-- 1) Columnas en ficha cliente: código de invitación + JSON para contadores que solo el salón ajusta (compra física).
-- 2) RPC para resolver código → user_id del referidor (signup sin leer toda la tabla clientes).
-- 3) RPC para contar referidos con primera compra verificada (pedido delivered con líneas), evitando RLS del referidor.

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

-- Referidos del usuario `p_referidor` (auth id) que ya tienen al menos un pedido `delivered` con ítems.
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
    AND EXISTS (
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
    );
$$;

REVOKE ALL ON FUNCTION public.premios_andreas_referidos_primera_compra(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.premios_andreas_referidos_primera_compra(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.premios_andreas_referidos_primera_compra(uuid) TO service_role;
