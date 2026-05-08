# Esquema `public` — tablas base

Inventario a partir del reporte del proyecto (solo nombres; columnas pendientes).

| table_schema | table_name |
|--------------|------------|
| public | _policy_backup_20260504 |
| public | admin_audit_logs |
| public | cajas |
| public | cambios_productos |
| public | citas |
| public | clientes |
| public | devoluciones |
| public | ecommerce_order_items |
| public | ecommerce_orders |
| public | empleados |
| public | incidentes |
| public | inventario |
| public | marketing_campaigns |
| public | marketing_comments |
| public | marketing_delivery_logs |
| public | marketing_direct_messages |
| public | marketing_post_likes |
| public | marketing_posts |
| public | metas |
| public | movimientos_caja |
| public | notificaciones |
| public | profiles |
| public | ventas |

## Notas rápidas (para cuando afinemos UI)

| Tabla | Uso típico en salon/cliente |
|-------|-------------------------------|
| `citas` | Agendas / citas |
| `clientes` | Ficha cliente |
| `empleados`, `profiles` | Personal / identidades |
| `ventas`, `cajas`, `movimientos_caja` | Caja y ventas |
| `inventario`, `cambios_productos`, `devoluciones` | Stock y movimientos |
| `ecommerce_orders`, `ecommerce_order_items` | Pedidos web |
| `marketing_*` | Red social / campañas / DM |
| `notificaciones` | Avisos |
| `metas` | Objetivos |
| `incidentes` | Incidencias |
| `admin_audit_logs` | Auditoría admin |
| `_policy_backup_20260504` | Backup interno de políticas (nombre sugiere respaldo puntual) |

---

*Siguiente bloque esperado: columnas por tabla o dump de columnas.*
