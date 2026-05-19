-- Incidentes → Andreas Pro (cliente recibe reporte en App Clientes)
-- Ejecutar en Supabase SQL Editor después de supabase-aura-line-client.sql

CREATE OR REPLACE FUNCTION public.client_aura_unread_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM marketing_direct_messages m
  INNER JOIN clientes c ON c.id = m.client_id
  WHERE c.user_id = auth.uid()
    AND m.status = 'pending_sync'
    AND m.content_type IN ('chat', 'broadcast_promo', 'incident_report');
$$;

GRANT EXECUTE ON FUNCTION public.client_aura_unread_count() TO anon, authenticated;
