-- App Clientes — Andreas Pro: los N mensajes MÁS RECIENTES (default 30)
-- Ejecutar en Supabase SQL Editor → Run → Settings → API → Reload schema

CREATE OR REPLACE FUNCTION public.client_aura_messages(p_limit integer DEFAULT 30)
RETURNS SETOF public.marketing_direct_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT x.*
  FROM (
    SELECT m.*
    FROM public.marketing_direct_messages m
    INNER JOIN public.clientes c ON c.id = m.client_id
    WHERE c.user_id = auth.uid()
    ORDER BY m.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 30), 500))
  ) x
  ORDER BY x.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.client_aura_messages(integer) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
