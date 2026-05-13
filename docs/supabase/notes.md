# Notas complementarias Supabase

## Columnas

El archivo [`schema-columns-public.md`](./schema-columns-public.md) incluye todas las tablas `public` listadas hasta la fecha del inventario.

## Funciones SQL usadas en RLS

Exportadas con `pg_get_functiondef` (schema `public`). Ambas son **`STABLE`**, **`SECURITY DEFINER`** y fijan `search_path` a `public` (patrón habitual en Supabase para no depender del path del llamador).

**Comportamiento (documentación histórica + ajuste de producto):**

- `current_profile_role()` devuelve `profiles.role` de la fila donde `profiles.id = auth.uid()`.
- **`is_staff_or_admin()`** en la base exportada originalmente devolvía `true` si el rol era **`admin`** o **`staff`**.  
  **Decisión de producto (2026):** en el salón ya **no** se usa el rol `staff` para permisos: solo **admin** opera la app de gestión (caja, ventas, agenda, etc.). Los **empleados** son fichas en la tabla `empleados` **sin** perfil Auth ni ventas.  
  En **Supabase** conviene **redefinir** la función para que solo cuente `admin` (manteniendo el **nombre** `is_staff_or_admin` así no hay que renombrar todas las políticas `*_role_*`):

```sql
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(public.current_profile_role() = 'admin', false);
$function$;
```

- Hasta aplicar ese SQL, el comportamiento en BD sigue siendo el del export antiguo (`admin` **o** `staff`).

Esto alinea las políticas `*_role_*` con filas en **`profiles`**: usuarios de la **app clientes** suelen tener `role` **`client`** (u otro distinto de `admin`).

### `current_profile_role`

```sql
CREATE OR REPLACE FUNCTION public.current_profile_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$function$
```

### `is_staff_or_admin` (definición **histórica** del export; ver arriba el reemplazo recomendado solo-`admin`)

```sql
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(public.current_profile_role() IN ('admin','staff'), false);
$function$
```

### Volver a exportar desde Supabase

```sql
SELECT
  n.nspname AS schema,
  p.proname AS name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public')
  AND p.proname IN ('is_staff_or_admin', 'current_profile_role')
ORDER BY p.proname;
```

## Relaciones sin FK declarada en `information_schema`

- `clientes.user_id` suele enlazar **lógicamente** a `auth.users.id`; las políticas `clientes_client_*` usan `auth.uid()`.
- `ecommerce_orders.client_user_id` alinea pedidos al usuario Auth (políticas `ecommerce_orders_client_*`).
- **`citas`**: políticas `*_role_*` usan `is_staff_or_admin()` → en la práctica **solo admin** tras el cambio de función recomendado; el cliente app necesita políticas propias para `INSERT`/`SELECT` (ver sección Agenda abajo).

---

## Agenda (apps) y tabla `citas`

**Esquema** (ver `schema-columns-public.md` → sección `citas`): `id`, `cliente_id`, `servicio` (texto, no FK a servicios en el inventario), `precio`, `duracion_minutos`, `fecha_hora`, `estado` (default `'pendiente'`), `notas_servicio`, `creado_en`, `empleado_id`, `venta_generada`. El código del monorepo (`db.citas.create`, agenda salón, flujo agendar clientes) debe respetar estas columnas.

**RLS actual** (`rls-policies-public.md`): `citas_role_*` con `is_staff_or_admin()`. Tras redefinir la función a solo `admin`:

- **App salón** con sesión **admin** en `profiles`: listar / crear / actualizar estado encaja con las políticas existentes.
- **App clientes** (rol **client** u otro no admin): `INSERT`/`SELECT` en `citas` **fallará** hasta añadir políticas cliente (o RPC `security definer`). El flujo “Solicitar cita” en clientes necesita algo como lo siguiente en Supabase (revisar nombres y reglas antes de aplicar):

```sql
-- Ejemplo: el cliente solo inserta citas ligadas a SU fila en clientes
CREATE POLICY "citas_client_insert_own"
ON public.citas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = citas.cliente_id AND c.user_id = auth.uid()
  )
);

-- Ejemplo: el cliente solo ve sus citas
CREATE POLICY "citas_client_select_own"
ON public.citas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = citas.cliente_id AND c.user_id = auth.uid()
  )
);
```

Opcional: `UPDATE` limitado (p. ej. cancelar solo si `estado = 'pendiente'`). Cualquier cambio debe actualizarse también en **`rls-policies-public.md`** cuando re-exportes políticas desde Supabase.
