# Notificaciones App Clientes — guía simple

> **Builds para Clientes + Salón:** ver [`NOTIFICACIONES-TIENDA.md`](./NOTIFICACIONES-TIENDA.md)

## Lo importante (sin tecnicismos)

Hay **3 cosas distintas**. No son la misma:

| Qué ves | Qué necesita | ¿Tu APK actual? |
|--------|----------------|-----------------|
| **1. Mensaje en bandeja** (tarjeta cita en Mensajes) | Solo Supabase + mensaje del salón | ✅ Ya funciona |
| **2. Campana / alerta con la app abierta** | SQL en Supabase + código en la app | ⚠️ APK viejo = código viejo |
| **3. Aviso del celular con app cerrada** (como WhatsApp) | SQL + **APK nuevo** + permiso + (opcional) Edge Function | ❌ Hace falta build para tienda |

**Tu APK de producción instalado hoy** fue compilado **antes** de varios cambios. Aunque arregles Supabase, **parte del comportamiento solo llegará con el próximo build** que subas a Play Store.

El código en Git y Supabase SQL son **dos pasos separados**:

1. **Supabase (una vez)** — tablas, triggers, funciones (servidor).
2. **Build EAS (cada release)** — empaqueta el JavaScript en el APK/AAB.

---

## Paso 1 — Supabase (hazlo ya, 10 min)

En [Supabase SQL Editor](https://supabase.com/dashboard) del proyecto **nqqntgvoxnnohodsmdqa**:

1. Ejecutá **`supabase-client-notifications.sql`** (completo).
2. Ejecutá **`supabase-client-notifications-patch.sql`**.
3. Ejecutá **`supabase-aura-line-client.sql`** si la campana de no leídos no existe.
4. **Database → Replication** → activá `client_notifications` y `marketing_direct_messages`.
5. Ejecutá **`supabase-client-notifications-diagnostico.sql`** → todo lo crítico debe decir **OK**.

Comprobación rápida después de confirmar una cita en el salón:

```sql
SELECT * FROM client_notifications ORDER BY created_at DESC LIMIT 5;
```

Si sigue vacío, revisá:

```sql
SELECT id, nombre, user_id FROM clientes WHERE nombre ILIKE '%Samuel%';
```

`user_id` debe ser el UUID del login en App Clientes (no null).

---

## Paso 2 — Próximo build para Play Store (obligatorio para notificaciones “de verdad”)

Desde la carpeta del monorepo:

```bash
cd apps/clientes
eas build --platform android --profile production
```

Ese APK/AAB incluirá:

- Pedido de permiso del sistema (“¿Permitir notificaciones?”).
- Campana de mensajes corregida.
- Notificación local al confirmar cita (aunque no tengas Edge Function).

Para **Google Play**, conviene cambiar en `eas.json` el perfil `production` a `buildType: "app-bundle"` y `distribution: "store"` antes del release final.

---

## Paso 3 — Push con app cerrada (opcional, después del release)

Solo si querés avisos cuando el usuario **no** tiene la app abierta:

1. En [expo.dev](https://expo.dev) → tu proyecto → credenciales **FCM** (Android).
2. Desplegar en Supabase: `supabase functions deploy send-client-push`.
3. Verificar que en `push_device_tokens` aparece una fila tras abrir la app nueva y aceptar notificaciones.

Sin Edge Function igual podés tener **notificación local** al llegar mensaje/cita con la app en segundo plano (código nuevo del build).

---

## Qué NO hace falta para publicar

- No hace falta entender Expo Go vs dev client para la tienda: publicás un **build EAS production**.
- No hace falta que `client_notifications` funcione para vender la app: el mensaje en bandeja ya es el canal principal.
- No hace falta WhatsApp para notificaciones in-app.

---

## Orden recomendado para tu misión (publicar en tienda)

1. ✅ SQL en Supabase (paso 1).
2. ✅ Probar mensaje en bandeja (ya lo tenés).
3. 🔨 `eas build` production con código actual.
4. 📲 Instalar ese APK en tu teléfono → aceptar notificaciones → probar confirmar cita.
5. 🏪 Subir AAB a Play Console.
6. (Después) FCM + Edge Function para push con app cerrada.

---

## Resumen en una frase

**Supabase prepara el servidor; el APK de la tienda lleva el código que pide permiso y muestra avisos. Tu APK instalado ahora no tiene todo ese código hasta que hagas un build nuevo.**

---

## Check rápido (3 queries)

Después de que el salón envía mensaje `chat` o `cita_confirmacion` al cliente:

```sql
-- 1) El mensaje sí llegó a la bandeja del cliente
select id, client_id, content_type, status, created_at
from marketing_direct_messages
where client_id = '<CLIENTE_ID_UUID>'
order by created_at desc
limit 5;
```

```sql
-- 2) El contador de no leídos del cliente (pending_sync)
select public.client_aura_unread_count();
```

```sql
-- 3) Se encoló notificación derivada del mensaje
select id, tipo, titulo, target_id, created_at
from client_notifications
where client_user_id = '<AUTH_USER_ID_UUID>'
order by created_at desc
limit 5;
```
