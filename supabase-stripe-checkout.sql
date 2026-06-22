-- Stripe · checkout domicilio App Clientes · moneda GTQ (quetzales)
-- Ejecutar en Supabase → SQL Editor.
-- Secrets recomendados: STRIPE_SECRET_KEY, STRIPE_CURRENCY=gtq

CREATE TABLE IF NOT EXISTS public.stripe_checkout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_intent_id text UNIQUE,
  sucursal_id uuid,
  cart_json jsonb NOT NULL,
  checkout_snapshot jsonb,
  total_amount numeric(12, 2) NOT NULL,
  server_total_amount numeric(12, 2) NOT NULL,
  customer_name text,
  customer_phone text,
  ship_id text NOT NULL DEFAULT 'ship-home',
  home_address_type text,
  delivery_address text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  order_id uuid REFERENCES public.ecommerce_orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_checkout_drafts_client_idx
  ON public.stripe_checkout_drafts (client_user_id, created_at DESC);

ALTER TABLE public.stripe_checkout_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stripe_checkout_drafts_client_select ON public.stripe_checkout_drafts;
CREATE POLICY stripe_checkout_drafts_client_select
ON public.stripe_checkout_drafts
FOR SELECT
TO authenticated
USING (client_user_id = auth.uid());

-- Idempotencia: un PaymentIntent → un pedido
CREATE UNIQUE INDEX IF NOT EXISTS ecommerce_orders_stripe_pi_unique
ON public.ecommerce_orders ((checkout_snapshot->>'stripe_payment_intent_id'))
WHERE checkout_snapshot->>'stripe_payment_intent_id' IS NOT NULL;

GRANT SELECT ON public.stripe_checkout_drafts TO authenticated;
