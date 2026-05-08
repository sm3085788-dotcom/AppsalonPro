# RLS (`public`)

Estado de **Row Level Security** por tabla, según reporte (`pg_tables.rowsecurity`).

| schemaname | tablename | rls_enabled |
|------------|-----------|-------------|
| public | _policy_backup_20260504 | **false** |
| public | admin_audit_logs | true |
| public | cajas | true |
| public | cambios_productos | true |
| public | citas | true |
| public | clientes | true |
| public | devoluciones | true |
| public | ecommerce_order_items | true |
| public | ecommerce_orders | true |
| public | empleados | true |
| public | incidentes | true |
| public | inventario | true |
| public | marketing_campaigns | true |
| public | marketing_comments | true |
| public | marketing_delivery_logs | true |
| public | marketing_direct_messages | true |
| public | marketing_post_likes | true |
| public | marketing_posts | true |
| public | metas | true |
| public | movimientos_caja | true |
| public | notificaciones | true |
| public | profiles | true |
| public | ventas | true |

## Nota

- **`_policy_backup_20260504`**: RLS desactivado; encaja con tabla de respaldo / utilidad interna.
- **Resto**: RLS **activo**; el acceso efectivo depende de las **políticas** (pendiente de documentar en `rls-policies-public.md`).
