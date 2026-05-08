# Documentación Supabase (AppSalon Pro)

Esta carpeta recopila un **inventario auditable** del proyecto en Supabase: tablas, RLS y políticas, para guiar la UI y el código del monorepo.

## Contenido previsto

| Archivo | Uso |
|--------|-----|
| `schema-tables-columns.md` o `.sql` | Tablas y columnas |
| `rls-policies.md` | Políticas por tabla/comando |
| `relationships-fk.md` | Claves foráneas |
| `notes.md` | Roles `auth`, funciones `security definer`, excepciones |

No incluir **service role**, contraseñas ni tokens en estos archivos.

## Estado

Inventario **completo** (tablas + columnas + RLS + políticas + FK según datos aportados). Opcional: definiciones SQL de funciones helper en [`notes.md`](./notes.md).

- ✅ Lista de tablas en `public` → [`schema-tables-public.md`](./schema-tables-public.md)
- ✅ Columnas (todas las tablas auditadas hasta la fecha) → [`schema-columns-public.md`](./schema-columns-public.md)
- ✅ RLS activado por tabla → [`rls-enabled-public.md`](./rls-enabled-public.md)
- ✅ Políticas RLS detalladas (`pg_policies`) → [`rls-policies-public.md`](./rls-policies-public.md)
- ✅ Claves foráneas declaradas (`public`) → [`relationships-fk.md`](./relationships-fk.md)
- 📝 Huecos y SQL extra (funciones RLS, relaciones lógicas) → [`notes.md`](./notes.md)
