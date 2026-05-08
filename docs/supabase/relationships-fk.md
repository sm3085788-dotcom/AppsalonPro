# Claves foráneas (`public`)

Export CSV: `information_schema` · `constraint_type = 'FOREIGN KEY'` · `table_schema = 'public'`.

| table_name | column_name | foreign_table_name | foreign_column_name | constraint_name |
|------------|-------------|--------------------|---------------------|-----------------|
| cambios_productos | venta_id | ventas | id | cambios_productos_venta_id_fkey |
| cambios_productos | caja_id | cajas | id | cambios_productos_caja_id_fkey |
| cambios_productos | producto_salida_id | inventario | id | cambios_productos_producto_salida_id_fkey |
| cambios_productos | producto_entrada_id | inventario | id | cambios_productos_producto_entrada_id_fkey |
| citas | empleado_id | empleados | id | citas_empleado_id_fkey |
| citas | cliente_id | clientes | id | citas_cliente_id_fkey |
| devoluciones | producto_id | inventario | id | devoluciones_producto_id_fkey |
| devoluciones | venta_id | ventas | id | devoluciones_venta_id_fkey |
| devoluciones | caja_id | cajas | id | devoluciones_caja_id_fkey |
| ecommerce_order_items | order_id | ecommerce_orders | id | ecommerce_order_items_order_id_fkey |
| ecommerce_order_items | product_id | inventario | id | ecommerce_order_items_product_id_fkey |
| marketing_comments | post_id | marketing_posts | id | marketing_comments_post_id_fkey |
| marketing_direct_messages | client_id | clientes | id | marketing_direct_messages_client_id_fkey |
| marketing_post_likes | post_id | marketing_posts | id | marketing_post_likes_post_id_fkey |
| metas | asignado_a | empleados | id | metas_asignado_a_fkey |
| movimientos_caja | caja_id | cajas | id | movimientos_caja_caja_id_fkey |
| notificaciones | empleado_id | empleados | id | notificaciones_empleado_id_fkey |
| ventas | caja_id | cajas | id | ventas_caja_id_fkey |
| ventas | cliente_id | clientes | id | ventas_cliente_id_fkey |
| ventas | vendedor_id | empleados | id | ventas_vendedor_id_fkey |

## Diagrama relacional (texto)

- **citas** → `clientes`, `empleados`
- **ventas** → `cajas`, `clientes`, `empleados`
- **cambios_productos**, **devoluciones**, **movimientos_caja** → `ventas` / `cajas` / `inventario` según columna
- **ecommerce_order_items** → `ecommerce_orders`, `inventario`
- **marketing_*** → `marketing_posts`, `clientes`
- **metas** → `empleados`
- **notificaciones** → `empleados`

*Tablas sin fila aquí:* pueden no tener FK declarada en PG o las relaciones son solo lógicas (`clientes.user_id` → `auth.users`, `ecommerce_orders.client_user_id`, etc.) — documentar en `notes.md` si aplica.

## CSV original

```csv
table_name,column_name,foreign_table_name,foreign_column_name,constraint_name
cambios_productos,venta_id,ventas,id,cambios_productos_venta_id_fkey
cambios_productos,caja_id,cajas,id,cambios_productos_caja_id_fkey
cambios_productos,producto_salida_id,inventario,id,cambios_productos_producto_salida_id_fkey
cambios_productos,producto_entrada_id,inventario,id,cambios_productos_producto_entrada_id_fkey
citas,empleado_id,empleados,id,citas_empleado_id_fkey
citas,cliente_id,clientes,id,citas_cliente_id_fkey
devoluciones,producto_id,inventario,id,devoluciones_producto_id_fkey
devoluciones,venta_id,ventas,id,devoluciones_venta_id_fkey
devoluciones,caja_id,cajas,id,devoluciones_caja_id_fkey
ecommerce_order_items,order_id,ecommerce_orders,id,ecommerce_order_items_order_id_fkey
ecommerce_order_items,product_id,inventario,id,ecommerce_order_items_product_id_fkey
marketing_comments,post_id,marketing_posts,id,marketing_comments_post_id_fkey
marketing_direct_messages,client_id,clientes,id,marketing_direct_messages_client_id_fkey
marketing_post_likes,post_id,marketing_posts,id,marketing_post_likes_post_id_fkey
metas,asignado_a,empleados,id,metas_asignado_a_fkey
movimientos_caja,caja_id,cajas,id,movimientos_caja_caja_id_fkey
notificaciones,empleado_id,empleados,id,notificaciones_empleado_id_fkey
ventas,caja_id,cajas,id,ventas_caja_id_fkey
ventas,cliente_id,clientes,id,ventas_cliente_id_fkey
ventas,vendedor_id,empleados,id,ventas_vendedor_id_fkey
```
