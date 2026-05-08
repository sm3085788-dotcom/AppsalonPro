# Políticas RLS (`public`)

Export tipo `pg_policies`: `schemaname`, `tablename`, `policyname`, `permissive`, `roles`, `cmd`, `qual`, `with_check`.

Todas las filas usan rol **`{authenticated}`** y políticas **PERMISSIVE**.

## Resumen para diseño de apps

| Patrón | Significado |
|--------|-------------|
| `*_role_*` + `is_staff_or_admin()` | Personal / admin: CRUD completo según la función (app **Salon / gestión**). |
| `clientes_client_*` | Cliente autenticado solo filas con `user_id = auth.uid()` (perfil vinculado en `clientes`). |
| `ecommerce_orders_client_*` | Cliente: `INSERT`/`SELECT` solo si `client_user_id = auth.uid()`. |
| `ecommerce_order_items_client_select` | Cliente: ítems de pedidos cuyo `order` pertenece a `auth.uid()`. |
| `profiles_self_*` | Usuario: `INSERT`/`SELECT`/`UPDATE` solo fila con `id = auth.uid()`. |
| `profiles_admin_select_all` | Admin: `SELECT` todos los perfiles si `current_profile_role() = 'admin'`. |

**Funciones SQL referenciadas (no están en este export):** `is_staff_or_admin()`, `current_profile_role()`. Conviene documentar su definición en `notes.md` cuando la tengas.

**Implicación:** la app **Clientes** autenticada ve principalmente **su fila en `clientes`**, **sus `ecommerce_orders`** y **líneas de pedido** ligadas; el resto de tablas operativas son **staff/admin** salvo lo que añadas más adelante (p. ej. `citas` solo staff hoy).

---

## `admin_audit_logs`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| admin_audit_logs_role_delete | DELETE | `is_staff_or_admin()` | — |
| admin_audit_logs_role_insert | INSERT | — | `is_staff_or_admin()` |
| admin_audit_logs_role_select | SELECT | `is_staff_or_admin()` | — |
| admin_audit_logs_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `cajas`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| cajas_role_delete | DELETE | `is_staff_or_admin()` | — |
| cajas_role_insert | INSERT | — | `is_staff_or_admin()` |
| cajas_role_select | SELECT | `is_staff_or_admin()` | — |
| cajas_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `cambios_productos`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| cambios_productos_role_delete | DELETE | `is_staff_or_admin()` | — |
| cambios_productos_role_insert | INSERT | — | `is_staff_or_admin()` |
| cambios_productos_role_select | SELECT | `is_staff_or_admin()` | — |
| cambios_productos_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `citas`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| citas_role_delete | DELETE | `is_staff_or_admin()` | — |
| citas_role_insert | INSERT | — | `is_staff_or_admin()` |
| citas_role_select | SELECT | `is_staff_or_admin()` | — |
| citas_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `clientes`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| clientes_client_select | SELECT | `user_id = auth.uid()` | — |
| clientes_client_update | UPDATE | `user_id = auth.uid()` | `user_id = auth.uid()` |
| clientes_role_delete | DELETE | `is_staff_or_admin()` | — |
| clientes_role_insert | INSERT | — | `is_staff_or_admin()` |
| clientes_role_select | SELECT | `is_staff_or_admin()` | — |
| clientes_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `devoluciones`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| devoluciones_role_delete | DELETE | `is_staff_or_admin()` | — |
| devoluciones_role_insert | INSERT | — | `is_staff_or_admin()` |
| devoluciones_role_select | SELECT | `is_staff_or_admin()` | — |
| devoluciones_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `ecommerce_order_items`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| ecommerce_order_items_client_select | SELECT | Ver bloque SQL abajo | — |
| ecommerce_order_items_role_delete | DELETE | `is_staff_or_admin()` | — |
| ecommerce_order_items_role_insert | INSERT | — | `is_staff_or_admin()` |
| ecommerce_order_items_role_select | SELECT | `is_staff_or_admin()` | — |
| ecommerce_order_items_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

**`ecommerce_order_items_client_select` — `qual`:**

```sql
(EXISTS (
  SELECT 1
  FROM ecommerce_orders o
  WHERE o.id = ecommerce_order_items.order_id
    AND o.client_user_id = auth.uid()
))
```

## `ecommerce_orders`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| ecommerce_orders_client_insert | INSERT | — | `client_user_id = auth.uid()` |
| ecommerce_orders_client_select | SELECT | `client_user_id = auth.uid()` | — |
| ecommerce_orders_role_delete | DELETE | `is_staff_or_admin()` | — |
| ecommerce_orders_role_insert | INSERT | — | `is_staff_or_admin()` |
| ecommerce_orders_role_select | SELECT | `is_staff_or_admin()` | — |
| ecommerce_orders_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `empleados`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| empleados_role_delete | DELETE | `is_staff_or_admin()` | — |
| empleados_role_insert | INSERT | — | `is_staff_or_admin()` |
| empleados_role_select | SELECT | `is_staff_or_admin()` | — |
| empleados_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `incidentes`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| incidentes_role_delete | DELETE | `is_staff_or_admin()` | — |
| incidentes_role_insert | INSERT | — | `is_staff_or_admin()` |
| incidentes_role_select | SELECT | `is_staff_or_admin()` | — |
| incidentes_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `inventario`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| inventario_role_delete | DELETE | `is_staff_or_admin()` | — |
| inventario_role_insert | INSERT | — | `is_staff_or_admin()` |
| inventario_role_select | SELECT | `is_staff_or_admin()` | — |
| inventario_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `marketing_campaigns`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| marketing_campaigns_role_delete | DELETE | `is_staff_or_admin()` | — |
| marketing_campaigns_role_insert | INSERT | — | `is_staff_or_admin()` |
| marketing_campaigns_role_select | SELECT | `is_staff_or_admin()` | — |
| marketing_campaigns_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `marketing_comments`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| marketing_comments_role_delete | DELETE | `is_staff_or_admin()` | — |
| marketing_comments_role_insert | INSERT | — | `is_staff_or_admin()` |
| marketing_comments_role_select | SELECT | `is_staff_or_admin()` | — |
| marketing_comments_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `marketing_delivery_logs`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| marketing_delivery_logs_role_delete | DELETE | `is_staff_or_admin()` | — |
| marketing_delivery_logs_role_insert | INSERT | — | `is_staff_or_admin()` |
| marketing_delivery_logs_role_select | SELECT | `is_staff_or_admin()` | — |
| marketing_delivery_logs_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `marketing_direct_messages`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| marketing_direct_messages_role_delete | DELETE | `is_staff_or_admin()` | — |
| marketing_direct_messages_role_insert | INSERT | — | `is_staff_or_admin()` |
| marketing_direct_messages_role_select | SELECT | `is_staff_or_admin()` | — |
| marketing_direct_messages_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `marketing_post_likes`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| marketing_post_likes_role_delete | DELETE | `is_staff_or_admin()` | — |
| marketing_post_likes_role_insert | INSERT | — | `is_staff_or_admin()` |
| marketing_post_likes_role_select | SELECT | `is_staff_or_admin()` | — |
| marketing_post_likes_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `marketing_posts`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| marketing_posts_role_delete | DELETE | `is_staff_or_admin()` | — |
| marketing_posts_role_insert | INSERT | — | `is_staff_or_admin()` |
| marketing_posts_role_select | SELECT | `is_staff_or_admin()` | — |
| marketing_posts_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `metas`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| metas_role_delete | DELETE | `is_staff_or_admin()` | — |
| metas_role_insert | INSERT | — | `is_staff_or_admin()` |
| metas_role_select | SELECT | `is_staff_or_admin()` | — |
| metas_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `movimientos_caja`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| movimientos_caja_role_delete | DELETE | `is_staff_or_admin()` | — |
| movimientos_caja_role_insert | INSERT | — | `is_staff_or_admin()` |
| movimientos_caja_role_select | SELECT | `is_staff_or_admin()` | — |
| movimientos_caja_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `notificaciones`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| notificaciones_role_delete | DELETE | `is_staff_or_admin()` | — |
| notificaciones_role_insert | INSERT | — | `is_staff_or_admin()` |
| notificaciones_role_select | SELECT | `is_staff_or_admin()` | — |
| notificaciones_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

## `profiles`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| profiles_admin_select_all | SELECT | `current_profile_role() = 'admin'` | — |
| profiles_self_insert | INSERT | — | `auth.uid() = id` |
| profiles_self_select | SELECT | `auth.uid() = id` | — |
| profiles_self_update | UPDATE | `auth.uid() = id` | `auth.uid() = id` |

*(En el export original `auth.uid()` aparece como subselect equivalente; semántica: fila propia del usuario autenticado.)*

## `ventas`

| policyname | cmd | qual | with_check |
|------------|-----|------|------------|
| ventas_role_delete | DELETE | `is_staff_or_admin()` | — |
| ventas_role_insert | INSERT | — | `is_staff_or_admin()` |
| ventas_role_select | SELECT | `is_staff_or_admin()` | — |
| ventas_role_update | UPDATE | `is_staff_or_admin()` | `is_staff_or_admin()` |

---

## CSV original (auditoría)

```csv
schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
public,admin_audit_logs,admin_audit_logs_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,admin_audit_logs,admin_audit_logs_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,admin_audit_logs,admin_audit_logs_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,admin_audit_logs,admin_audit_logs_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,cajas,cajas_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,cajas,cajas_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,cajas,cajas_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,cajas,cajas_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,cambios_productos,cambios_productos_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,cambios_productos,cambios_productos_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,cambios_productos,cambios_productos_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,cambios_productos,cambios_productos_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,citas,citas_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,citas,citas_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,citas,citas_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,citas,citas_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,clientes,clientes_client_select,PERMISSIVE,{authenticated},SELECT,(user_id = auth.uid()),null
public,clientes,clientes_client_update,PERMISSIVE,{authenticated},UPDATE,(user_id = auth.uid()),(user_id = auth.uid())
public,clientes,clientes_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,clientes,clientes_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,clientes,clientes_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,clientes,clientes_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,devoluciones,devoluciones_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,devoluciones,devoluciones_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,devoluciones,devoluciones_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,devoluciones,devoluciones_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,ecommerce_order_items,ecommerce_order_items_client_select,PERMISSIVE,{authenticated},SELECT,"(EXISTS ( SELECT 1 FROM ecommerce_orders o WHERE ((o.id = ecommerce_order_items.order_id) AND (o.client_user_id = auth.uid()))))",null
public,ecommerce_order_items,ecommerce_order_items_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,ecommerce_order_items,ecommerce_order_items_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,ecommerce_order_items,ecommerce_order_items_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,ecommerce_order_items,ecommerce_order_items_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,ecommerce_orders,ecommerce_orders_client_insert,PERMISSIVE,{authenticated},INSERT,null,(client_user_id = auth.uid())
public,ecommerce_orders,ecommerce_orders_client_select,PERMISSIVE,{authenticated},SELECT,(client_user_id = auth.uid()),null
public,ecommerce_orders,ecommerce_orders_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,ecommerce_orders,ecommerce_orders_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,ecommerce_orders,ecommerce_orders_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,ecommerce_orders,ecommerce_orders_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,empleados,empleados_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,empleados,empleados_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,empleados,empleados_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,empleados,empleados_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,incidentes,incidentes_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,incidentes,incidentes_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,incidentes,incidentes_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,incidentes,incidentes_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,inventario,inventario_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,inventario,inventario_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,inventario,inventario_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,inventario,inventario_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,marketing_campaigns,marketing_campaigns_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,marketing_campaigns,marketing_campaigns_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,marketing_campaigns,marketing_campaigns_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,marketing_campaigns,marketing_campaigns_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,marketing_comments,marketing_comments_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,marketing_comments,marketing_comments_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,marketing_comments,marketing_comments_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,marketing_comments,marketing_comments_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,marketing_delivery_logs,marketing_delivery_logs_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,marketing_delivery_logs,marketing_delivery_logs_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,marketing_delivery_logs,marketing_delivery_logs_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,marketing_delivery_logs,marketing_delivery_logs_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,marketing_direct_messages,marketing_direct_messages_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,marketing_direct_messages,marketing_direct_messages_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,marketing_direct_messages,marketing_direct_messages_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,marketing_direct_messages,marketing_direct_messages_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,marketing_post_likes,marketing_post_likes_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,marketing_post_likes,marketing_post_likes_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,marketing_post_likes,marketing_post_likes_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,marketing_post_likes,marketing_post_likes_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,marketing_posts,marketing_posts_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,marketing_posts,marketing_posts_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,marketing_posts,marketing_posts_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,marketing_posts,marketing_posts_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,metas,metas_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,metas,metas_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,metas,metas_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,metas,metas_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,movimientos_caja,movimientos_caja_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,movimientos_caja,movimientos_caja_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,movimientos_caja,movimientos_caja_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,movimientos_caja,movimientos_caja_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,notificaciones,notificaciones_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,notificaciones,notificaciones_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,notificaciones,notificaciones_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,notificaciones,notificaciones_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
public,profiles,profiles_admin_select_all,PERMISSIVE,{authenticated},SELECT,(current_profile_role() = 'admin'::text),null
public,profiles,profiles_self_insert,PERMISSIVE,{authenticated},INSERT,null,(( SELECT auth.uid() AS uid) = id)
public,profiles,profiles_self_select,PERMISSIVE,{authenticated},SELECT,(( SELECT auth.uid() AS uid) = id),null
public,profiles,profiles_self_update,PERMISSIVE,{authenticated},UPDATE,(( SELECT auth.uid() AS uid) = id),(( SELECT auth.uid() AS uid) = id)
public,ventas,ventas_role_delete,PERMISSIVE,{authenticated},DELETE,is_staff_or_admin(),null
public,ventas,ventas_role_insert,PERMISSIVE,{authenticated},INSERT,null,is_staff_or_admin()
public,ventas,ventas_role_select,PERMISSIVE,{authenticated},SELECT,is_staff_or_admin(),null
public,ventas,ventas_role_update,PERMISSIVE,{authenticated},UPDATE,is_staff_or_admin(),is_staff_or_admin()
```
