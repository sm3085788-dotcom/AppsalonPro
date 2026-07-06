# QPayPro checkout — AppsalonPro

## Variables (web Vercel + Supabase Edge secrets)

```bash
PAYMENT_MODE=redirect          # redirect | direct
PAYMENT_PROVIDER=qpaypro
QPAYPRO_MERCHANT_ID=
QPAYPRO_API_KEY=
QPAYPRO_API_SECRET=
QPAYPRO_CHECKOUT_BASE_URL=     # URL checkout redirect
QPAYPRO_TOKENIZE_URL=          # modo direct (futuro)
QPAYPRO_WEBHOOK_SECRET=
QPAYPRO_ENV=sandbox
NEXT_PUBLIC_PAYMENT_CURRENCY=gtq
WEB_PRODUCT_SHIPPING_FEE_GTQ=0
```

## Webhooks

- **Web (Next.js):** `POST https://TU-DOMINIO/api/payments/webhook`
  - Header: `x-qpaypro-signature` = `QPAYPRO_WEBHOOK_SECRET`
- **Supabase (App Clientes):** `POST https://PROJECT.supabase.co/functions/v1/qpaypro-webhook`

## Edge Functions

- `qpaypro-create-session` — tienda domicilio + membresía
- `qpaypro-finalize-order` — confirma pedido tras pago
- `qpaypro-webhook` — backup idempotente

## SQL

Ejecutar [`supabase-qpaypro-payments.sql`](../supabase-qpaypro-payments.sql) en Supabase.

## Flujos

| Flujo | Pago |
|-------|------|
| Reserva web | Sin pago en línea |
| Productos web | 100% QPayPro (retiro / domicilio + envío) |
| Tarjeta regalo web | 100% QPayPro guest |
| Membresías web/app | QPayPro + redeem código |
| Tienda domicilio app | QPayPro redirect |

## Modo demo

Sin credenciales QPayPro, el checkout simula éxito vía `/api/payments/complete-demo`.
