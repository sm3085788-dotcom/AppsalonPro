# Web catálogo en Vercel — conectar con Supabase y apps móviles

La web en **local** funciona porque tienes `apps/web-catalogo/.env.local`.  
En **Vercel** hay que pegar las **mismas llaves** que usan las apps Salón y Clientes.

Sin eso verás **modo demo**: login deshabilitado, servicios inventados, sin citas al APK.

---

## 1. Elige un solo proyecto Vercel

Tienes dos URLs que responden hoy:

| URL | Uso recomendado |
|-----|-----------------|
| `https://appsalon-pro-web-catalogo.vercel.app` | **Usar esta** (la app Clientes ya apunta aquí) |
| `https://web-catalogo.vercel.app` | Proyecto alterno (v0); **mismas 3 variables Supabase** si lo sigues usando |

Si abres `web-catalogo.vercel.app` y el login dice "modo demo", ese proyecto Vercel necesita sus propias variables (no hereda las del otro dominio).

En Vercel Dashboard confirma que el proyecto ligado a GitHub tiene:

- **Root Directory:** `apps/web-catalogo`
- **Framework:** Next.js

---

## 2. Variables de entorno (Production + Preview)

Vercel → tu proyecto → **Settings → Environment Variables**

Copia los valores desde tu `apps/web-catalogo/.env.local` (los mismos `NEXT_PUBLIC_*` que en las apps).

### Obligatorias (conectar con el ecosistema)

| Variable | Dónde obtenerla |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (solo servidor) |

Deben ser **el mismo proyecto Supabase** que `EXPO_PUBLIC_SUPABASE_URL` en Salón y Clientes.

**Integración Vercel ↔ Supabase:** si instalaste el marketplace, puede inyectar nombres distintos. El código web también acepta:

| Integración Vercel | Equivalente manual |
|--------------------|--------------------|
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SECRET_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |

Confirma que la URL apunte a **tu** proyecto (no uno vacío creado por la integración). Tras cualquier cambio: **Redeploy**.

### Recomendadas (pagos QPayPro y tienda web)

| Variable | Notas |
|----------|--------|
| `PAYMENT_MODE` | `redirect` (default) o `direct` |
| `QPAYPRO_MERCHANT_ID` / `QPAYPRO_API_KEY` / `QPAYPRO_API_SECRET` | Credenciales QPayPro |
| `QPAYPRO_CHECKOUT_BASE_URL` | URL checkout redirect |
| `QPAYPRO_WEBHOOK_SECRET` | Endpoint: `https://TU-DOMINIO/api/payments/webhook` |
| `NEXT_PUBLIC_PAYMENT_CURRENCY` | `gtq` |
| `WEB_PRODUCT_SHIPPING_FEE_GTQ` | Envío domicilio web (`0` = gratis) |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio (redirects post-pago) |

Ver [`docs/QPAYPRO-CHECKOUT.md`](QPAYPRO-CHECKOUT.md).

### Opcionales

| Variable | Notas |
|----------|--------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Autocompletado de dirección |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Política de privacidad / contacto |
| `DELIVERY_PROVIDER` / `DELIVERY_API_KEY` | Domicilio (mock si vacío) |

Marca **Production** y **Preview** para cada variable. Guarda.

---

## 3. Redeploy

Después de guardar variables:

**Deployments → ⋮ en el último deploy → Redeploy**

(o push a `main` dispara build automático).

El build **fallará** en Production si faltan las 3 variables obligatorias de Supabase (script `verify-vercel-env`).

---

## 4. Comprobar que ya no es demo

1. Abre `https://appsalon-pro-web-catalogo.vercel.app`
2. **No** debe aparecer la franja superior amarilla de “modo demostración”
3. Home: servicios/productos **reales** de tu inventario Supabase
4. `/login`: **sin** banner “Supabase no está configurado”
5. Reserva una cita de prueba → el **APK Salón** debe recibirla (realtime)

---

## 5. App Clientes (link Servicio al cliente)

URL configurada en código:

`shared/config/salonContacto.js` → `WEB_CATALOG_URL`

Override opcional en `apps/clientes/.env`:

```
EXPO_PUBLIC_WEB_CATALOG_URL=https://appsalon-pro-web-catalogo.vercel.app
```

Publicar OTA después de cambiar: `npm run update:production` en `apps/clientes`.

---

## 6. QPayPro webhook en producción

1. Portal QPayPro → Webhooks → Add endpoint  
2. URL: `https://appsalon-pro-web-catalogo.vercel.app/api/payments/webhook`  
3. Copia el secret → `QPAYPRO_WEBHOOK_SECRET` en Vercel → Redeploy  

Para App Clientes (tienda domicilio / membresías): configurar también el webhook en Supabase Edge (`qpaypro-webhook`). Ver [`QPAYPRO-CHECKOUT.md`](QPAYPRO-CHECKOUT.md).

---

## Resumen

| Entorno | Config |
|---------|--------|
| Local | `apps/web-catalogo/.env.local` |
| Vercel | Environment Variables (mismos valores) |
| EAS apps | `eas secret` / `.env` (ya lo tienes) |

**Local ≠ Vercel** solo mientras falten las variables en Vercel. Una vez pegadas, el comportamiento es el mismo ecosistema unificado.
