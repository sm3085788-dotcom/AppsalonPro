-- Fix: promos con imagen en chat (re-ejecutar parches de inventario-promociones + n8n-chat-automation).
-- En Supabase SQL Editor ejecutá EN ORDEN los archivos COMPLETOS del repo:
--   1) supabase-inventario-promociones.sql
--   2) supabase-n8n-chat-automation.sql
-- Luego este archivo (unread + inbox).

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
    AND m.content_type IN (
      'chat', 'broadcast_promo', 'promo_inventario', 'incident_report', 'cita_confirmacion'
    );
$$;

CREATE OR REPLACE FUNCTION public.salon_inbox_client_preview()
RETURNS TABLE(
  client_id uuid,
  content text,
  created_at timestamptz,
  content_type text,
  status text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (m.client_id)
    m.client_id,
    m.content,
    m.created_at,
    m.content_type,
    m.status
  FROM marketing_direct_messages m
  WHERE m.content_type IN (
    'chat', 'broadcast_promo', 'promo_inventario', 'incident_report', 'cita_confirmacion',
    'tendencias_interest', 'carousel_interest'
  )
  ORDER BY m.client_id, m.created_at DESC;
$$;

NOTIFY pgrst, 'reload schema';
