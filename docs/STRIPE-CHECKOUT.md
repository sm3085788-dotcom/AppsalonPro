# Stripe checkout (deprecado)

La integración Stripe fue reemplazada por **QPayPro**.

Usa la guía actual: [`QPAYPRO-CHECKOUT.md`](QPAYPRO-CHECKOUT.md).

Las columnas `stripe_*` en la base de datos se mantienen por compatibilidad con registros históricos; los flujos nuevos usan `payment_provider`, `payment_session_id` y `payment_reference`.
