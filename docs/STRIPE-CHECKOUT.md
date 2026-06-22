# Stripe · checkout domicilio en quetzales (GTQ)

Pagos en **quetzales guatemaltecos** para envío a domicilio en App Clientes.

## Moneda en el código

| Capa | Configuración |
|------|----------------|
| Edge Function | `STRIPE_CURRENCY=gtq` (default si no definís secret) |
| Montos | Precios inventario en **Q** → Stripe recibe **centavos** (Q 1.00 = `100`) |
| Payment Sheet | País facturación default **GT** (Guatemala) |

## 1. Stripe Dashboard (cuenta Guatemala / GTQ)

1. [dashboard.stripe.com](https://dashboard.stripe.com) → **Settings** → **Business details**.
2. País del negocio: **Guatemala** (si aplica a tu cuenta).
3. **Developers** → **API keys** (modo Test):
   - **Publishable** `pk_test_...` → `apps/clientes/.env` como `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret** `sk_test_...` → Supabase secrets (paso 3), **nunca en la app**
4. Si al pagar ves error de moneda, en Stripe verificá que la cuenta permita cobrar en **GTQ**. Algunas cuentas nuevas requieren completar verificación del negocio.

## 2. Supabase SQL

Ejecutá en SQL Editor:

```text
supabase-stripe-checkout.sql
```

## 3. Supabase secrets (servidor)

En **Project Settings → Edge Functions → Secrets** (o CLI):

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_CURRENCY=gtq
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...   # después del webhook
```

Desplegá funciones:

```bash
supabase functions deploy stripe-create-payment-intent
supabase functions deploy stripe-finalize-order
supabase functions deploy stripe-webhook
```

## 4. App Clientes (.env)

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Reiniciá Metro: `npx expo start -c`

## 5. Webhook

Stripe → **Developers** → **Webhooks** → Add endpoint:

- URL: `https://nqqntgvoxnnohodsmdqa.supabase.co/functions/v1/stripe-webhook`
- Evento: `payment_intent.succeeded`
- Signing secret → `STRIPE_WEBHOOK_SECRET`

## 6. Build nativo

Stripe no funciona en Expo Go:

```bash
cd apps/clientes
npx expo run:android
```

## 7. Probar en GTQ

1. Producto con precio en **Q** en inventario.
2. Tienda → domicilio → **Pagar con Stripe**.
3. Tarjeta test: `4242 4242 4242 4242`.
4. En Stripe Dashboard → **Payments** debe aparecer el monto en **GTQ**.

## Ejemplo de montos

| Total tienda | Stripe `amount` |
|--------------|-----------------|
| Q 50.00 | 5000 |
| Q 125.75 | 12575 |
| Q 0.50 | 50 |

## Sin Stripe configurado

Sin `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, domicilio usa formulario demo local (solo desarrollo).
