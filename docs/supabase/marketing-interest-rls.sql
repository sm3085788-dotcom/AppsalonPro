-- Políticas para que clientes autenticados registren interés en Tendencias / carrusel
-- (INSERT en marketing_direct_messages). Ejecutar en Supabase SQL Editor.

-- Opcional: lectura pública de posts publicados (si el feed en App Clientes falla por RLS)
-- CREATE POLICY marketing_posts_public_read ON marketing_posts
--   FOR SELECT TO anon, authenticated
--   USING (status = 'published' AND visibility = 'public');

CREATE POLICY marketing_direct_messages_client_interest_insert
ON public.marketing_direct_messages
FOR INSERT
TO authenticated
WITH CHECK (
  content_type IN ('tendencias_interest', 'carousel_interest')
  AND client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = marketing_direct_messages.client_id
      AND c.user_id = auth.uid()
  )
);

-- Staff sigue viendo todo con is_staff_or_admin() en las políticas existentes.
