-- Tarjetas guardadas Stripe · App Clientes
-- Ejecutar en Supabase → SQL Editor (requiere STRIPE_SECRET_KEY en secrets).

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS clientes_stripe_customer_idx
  ON public.clientes (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stripe_saved_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  payment_method_id text NOT NULL UNIQUE,
  brand text,
  last4 text,
  exp_month smallint,
  exp_year smallint,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_saved_cards_user_idx
  ON public.stripe_saved_cards (client_user_id, is_default DESC, created_at DESC);

ALTER TABLE public.stripe_saved_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stripe_saved_cards_client_select ON public.stripe_saved_cards;
CREATE POLICY stripe_saved_cards_client_select
ON public.stripe_saved_cards FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

DROP POLICY IF EXISTS stripe_saved_cards_client_delete ON public.stripe_saved_cards;
CREATE POLICY stripe_saved_cards_client_delete
ON public.stripe_saved_cards FOR DELETE
TO authenticated
USING (client_user_id = auth.uid());

GRANT SELECT, DELETE ON public.stripe_saved_cards TO authenticated;

-- Staff salón puede leer cache (opcional, solo service role escribe vía edge functions)
GRANT SELECT ON public.stripe_saved_cards TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.stripe_saved_cards TO service_role;

CREATE OR REPLACE FUNCTION public.set_stripe_customer_for_auth(p_customer_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes
  SET stripe_customer_id = NULLIF(trim(p_customer_id), '')
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_stripe_customer_for_auth(text) TO authenticated;
