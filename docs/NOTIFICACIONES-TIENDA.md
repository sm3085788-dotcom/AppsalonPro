# Publicar App Clientes + App Salón (notificaciones)

Tu Supabase **ya encola notificaciones** (viste filas en `client_notifications`). Falta instalar **APK/AAB nuevos** con el código actual.

## Si el build falla en "Install dependencies"

EAS usa `npm ci` en la **raíz del monorepo**. El `package-lock.json` debe estar sincronizado:

```bash
cd C:\AppsalonPro
npm install
git add package-lock.json
git commit -m "sync package-lock for EAS build"
```

Luego volvé a correr el build. Error típico: falta `expo-video-thumbnails` u otro paquete en el lock.

**Importante:** `eas update` (OTA) ≠ `eas build` (APK nuevo). El OTA te funcionó; el APK requiere build nativo.

## Builds

### Prueba rápida (APK interno)

```bash
cd apps/clientes
npm run build:android:production

cd ../salon
npm run build:android:production
```

Descargá el APK desde [expo.dev](https://expo.dev) → instalá en el teléfono → iniciá sesión → aceptá **notificaciones**.

### Google Play (AAB tienda)

```bash
cd apps/clientes
npm run build:android:store

cd ../salon
npm run build:android:store
```

Subí el **.aab** a Play Console (una app por paquete: `com.appsalon.pro.clientes` y `com.appsalon.pro.salon`).

## Qué trae cada app (build nuevo)

| App | Permiso sistema | Aviso local (bandeja del teléfono) |
|-----|-----------------|-----------------------------------|
| **Clientes** 1.0.2 | Al iniciar sesión | Cita confirmada, mensajes, pedidos |
| **Salón** 1.0.1 | Al entrar como admin | Mensaje de cliente, pedido efectivo, cita pendiente |

## Supabase (ya hecho si hay datos en la tabla)

- `supabase-client-notifications.sql` + `patch.sql`
- Replication: `client_notifications`, `marketing_direct_messages`

## Push con app totalmente cerrada (después)

1. [expo.dev](https://expo.dev) → proyecto Clientes → FCM Android  
2. Mismo para proyecto Salón (otro `projectId` en `app.json`)  
3. `supabase functions deploy send-client-push`  
4. Tokens en `push_device_tokens` (`app_slug` = `clientes` o `salon`)

## Versiones

| App | Versión en este release |
|-----|-------------------------|
| Clientes | 1.0.2 |
| Salón | 1.0.1 |

No uses el APK viejo para probar notificaciones: **siempre el build que acabás de generar.**
