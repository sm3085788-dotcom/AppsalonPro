-- Tipo de mensaje promo_inventario (catálogo automático n8n con imagen compacta).
-- Ejecutar en Supabase SQL Editor después de supabase-inventario-promociones.sql

-- Vista previa inbox salón (opcional)
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
