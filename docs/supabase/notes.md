# Notas complementarias Supabase

## Columnas

El archivo [`schema-columns-public.md`](./schema-columns-public.md) incluye todas las tablas `public` listadas hasta la fecha del inventario.

## Funciones SQL usadas en RLS

Exportadas con `pg_get_functiondef` (schema `public`). Ambas son **`STABLE`**, **`SECURITY DEFINER`** y fijan `search_path` a `public` (patrón habitual en Supabase para no depender del path del llamador).

**Comportamiento:**

- `current_profile_role()` devuelve `profiles.role` de la fila donde `profiles.id = auth.uid()`.
- `is_staff_or_admin()` devuelve `true` si ese rol es **`admin`** o **`staff`**; si no hay fila o el rol es otro, `false` (vía `COALESCE(..., false)`).

Esto alinea las políticas `*_role_*` con filas en **`profiles`**; un usuario **solo cliente** debería tener `role` distinto de `admin`/`staff` (o sin fila en `profiles`, según vuestro flujo de registro).

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

### `is_staff_or_admin`

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
- **`citas`**: hoy solo hay políticas staff; cliente no lee por RLS hasta que defináis políticas nuevas o otra capa.
