# Conexión Supabase paso a paso (antes de pulir UI)

Este documento alinea lo que pedía el README del proyecto **con lo que ya está en código**. El cliente vive en `shared/config/supabaseClient.js` y espera las variables públicas **`EXPO_PUBLIC_***`** (Expo) o **`NEXT_PUBLIC_***`** (Next).

---

## Paso 1 — Obtener URL y anon key

1. [Supabase Dashboard](https://app.supabase.com) → tu proyecto.  
2. **Settings → API**.  
3. Copia:
   - **Project URL**
   - **anon public** (no uses `service_role` en apps móvil ni web pública).

---

## Paso 2 — Variables locales (desarrollo)

### App Clientes (`apps/clientes`)

```bash
cd apps/clientes
cp .env.example .env
```

Edita `.env` con URL y anon reales (`EXPO_PUBLIC_SUPABASE_*`).

### App Salón (`apps/salon`)

```bash
cd apps/salon
cp .env.example .env
```

Mismos valores si comparten proyecto Supabase.

### Web catálogo (`apps/web-catalogo`)

```bash
cd apps/web-catalogo
```

Copia valores a **`.env.local`** (este archivo no debe subirse a git):

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(solo si esa app va a llamar Supabase).*  
  Ver modelo en `.env.example` de la carpeta.

**Comprobar en Expo:** al iniciar Metro, si falta configuración aparece aviso en consola desde `supabaseClient.js` sobre credenciales.

---

## Paso 3 — Builds EAS (nube)

En local, Expo lee `.env`. Los builds en **EAS** no llevan tu `.env` si no los configuras.

Define secretos por proyecto desde la carpeta de la app (`apps/clientes` o `apps/salon`), por ejemplo:

```bash
cd apps/clientes   # o apps/salon
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://....supabase.co" --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbG..." --type string
```

*(La sintaxis exacta puede variar ligeramente con la versión de `eas-cli`; `eas secret:list` confirma que existen.)*

---

## Paso 4 — Esquema y RLS (ya documentado)

Inventario en `docs/supabase/`:

| Archivo | Contenido |
|---------|-------------|
| `schema-tables-public.md` | Tablas |
| `schema-columns-public.md` | Columnas |
| `rls-policies-public.md` | Políticas |
| `relationships-fk.md` | FK |
| `notes.md` | `current_profile_role` / `is_staff_or_admin` |

**Importante:**

- **`is_staff_or_admin()`** en la base original da `true` con rol **`admin` o `staff`**; el producto ahora usa **solo `admin`** para la app salón — en `docs/supabase/notes.md` está el SQL recomendado para redefinir la función sin renombrar políticas.
- Pantallas **Cliente** y tabla **`citas`**: hace falta políticas cliente además del acceso admin (véase `notes.md`).

---

## Paso 5 — Usar Supabase desde UI

- **Salón:** varias pantallas importan ya `../../../../shared/config/supabaseClient` y `db.*`.  
- **Clientes:** `App.js` importa **`@appsalon/shared-config`** (mismo archivo que `shared/config/supabaseClient.js`). En **Perfil** se muestra: si faltan variables `.env`, si hay sesión Auth, y la fila **`clientes`** (`nombre`, `email`) cuando exista y RLS lo permita.

`apps/clientes/metro.config.js` amplía `watchFolders` con la raíz del monorepo para resolver bien el workspace.

---

## Paso 6 — Verificación rápida (opcional manual)

Con `.env` listo y la app ejecutándose, abre **Perfil**.

Ejemplo en código:

```javascript
import { supabase } from '@appsalon/shared-config';

const {
  data: { session },
} = await supabase.auth.getSession();
console.log('session?', !!session);
```

---

## Referencias ya en el repo

- `SUPABASE_INTEGRATION.md` — plantilla más larga  
- `QUICKSTART.md` — arranque e `.env`
