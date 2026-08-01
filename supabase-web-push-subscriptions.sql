-- Web Push subscriptions (PWA / navegador) para avisos con app/web cerrada.
-- Ejecutar en Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT web_push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_user_id_idx
  ON public.web_push_subscriptions (user_id);

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS web_push_subscriptions_select_own ON public.web_push_subscriptions;
CREATE POLICY web_push_subscriptions_select_own
  ON public.web_push_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS web_push_subscriptions_insert_own ON public.web_push_subscriptions;
CREATE POLICY web_push_subscriptions_insert_own
  ON public.web_push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS web_push_subscriptions_update_own ON public.web_push_subscriptions;
CREATE POLICY web_push_subscriptions_update_own
  ON public.web_push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS web_push_subscriptions_delete_own ON public.web_push_subscriptions;
CREATE POLICY web_push_subscriptions_delete_own
  ON public.web_push_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role (Edge Functions) puede leer/borrar endpoints inválidos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_push_subscriptions TO service_role;
