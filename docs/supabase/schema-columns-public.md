# Esquema `public` — columnas

Generado desde el reporte CSV (`table_name`, `column_name`, `data_type`, `is_nullable`, `column_default`).

**Estado:** **completo** para las tablas `public` listadas en [`schema-tables-public.md`](./schema-tables-public.md), según CSV aportados. Si añades tablas nuevas en Supabase, repetir export y actualizar esta página.

---

## `_policy_backup_20260504`

Respaldo de definición de políticas (estructura tipo `pg_policies`).

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| schemaname | name | YES | — |
| tablename | name | YES | — |
| policyname | name | YES | — |
| permissive | text | YES | — |
| roles | ARRAY | YES | — |
| cmd | text | YES | — |
| qual | text | YES | — |
| with_check | text | YES | — |

---

## `admin_audit_logs`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | bigint | NO | — |
| admin_id | uuid | NO | — |
| action_key | text | NO | — |
| target_table | text | NO | — |
| label | text | YES | — |
| removed_count | integer | NO | 0 |
| created_at | timestamptz | NO | now() |

---

## `cajas`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| creado_a | timestamptz | YES | now() |
| estado | text | YES | `'abierta'` |
| monto_apertura | numeric | NO | — |
| monto_cierre | numeric | YES | — |
| responsable | text | NO | — |
| fecha_apertura | date | YES | CURRENT_DATE |
| fecha_cierre | timestamptz | YES | — |
| responsable_apertura | text | YES | — |
| responsable_cierre | text | YES | — |

---

## `cambios_productos`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| fecha | timestamptz | YES | now() |
| venta_id | uuid | YES | — |
| producto_entrada_id | uuid | YES | — |
| producto_salida_id | uuid | YES | — |
| diferencia_cobrada | numeric | YES | 0 |
| caja_id | uuid | YES | — |

---

## `citas`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| cliente_id | uuid | YES | — |
| servicio | text | NO | — |
| precio | numeric | YES | 0 |
| duracion_minutos | integer | YES | 30 |
| fecha_hora | timestamptz | NO | — |
| estado | text | YES | `'pendiente'` |
| notas_servicio | text | YES | — |
| creado_en | timestamptz | YES | now() |
| empleado_id | uuid | YES | — |
| venta_generada | boolean | YES | false |

---

## `clientes`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| nombre | text | NO | — |
| telefono | text | YES | — |
| email | text | YES | — |
| notas | text | YES | — |
| tipo_registro | text | YES | `'manual'` |
| puntos_fidelidad | integer | YES | 0 |
| created_at | timestamptz | YES | CURRENT_TIMESTAMP |
| user_id | uuid | YES | — |
| categoria | text | YES | `'Nuevo'` |
| cumpleanos | text | YES | — |
| direccion | text | YES | — |
| contacto_emergencia | text | YES | — |
| tel_emergencia | text | YES | — |
| referido_por | uuid | YES | — |
| photo_url | text | YES | — |

---

## `devoluciones`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| fecha | timestamptz | YES | now() |
| venta_id | uuid | YES | — |
| no_factura | text | YES | — |
| producto_id | uuid | YES | — |
| cantidad | integer | YES | 1 |
| monto_devuelto | numeric | YES | — |
| estado_producto | text | YES | — |
| motivo | text | YES | — |
| cumple_politicas | boolean | YES | — |
| caja_id | uuid | YES | — |
| responsable | text | YES | — |

---

## `ecommerce_order_items`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | bigint | NO | — |
| order_id | uuid | NO | — |
| product_id | uuid | NO | — |
| product_name | text | NO | — |
| unit_price | numeric | NO | 0 |
| qty | integer | NO | — |
| line_total | numeric | NO | 0 |
| created_at | timestamptz | NO | now() |

---

## `ecommerce_orders`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| tracking_code | text | NO | `upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))` |
| customer_name | text | NO | — |
| customer_phone | text | NO | — |
| notes | text | YES | — |
| status | text | NO | `'pending'` |
| total_amount | numeric | NO | 0 |
| source | text | NO | `'mobile-client'` |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| confirmed_at | timestamptz | YES | — |
| prepared_at | timestamptz | YES | — |
| delivered_at | timestamptz | YES | — |
| cancelled_at | timestamptz | YES | — |
| cancelled_reason | text | YES | — |
| client_user_id | uuid | YES | — |
| payment_method | text | YES | — |
| card_last4 | text | YES | — |
| fulfillment_type | text | YES | — |
| delivery_address | text | YES | — |
| delivery_reference | text | YES | — |

---

## `empleados`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| nombre | text | NO | — |
| rol | text | YES | — |
| telefono | text | YES | — |
| email | text | YES | — |
| comision_porcentaje | numeric | YES | 0 |
| tipo_registro | text | YES | `'manual'` |
| created_at | timestamptz | YES | now() |
| direccion | text | YES | — |
| contacto_emergencia | text | YES | — |
| tel_emergencia | text | YES | — |
| activo | boolean | YES | true |

## `incidentes`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| fecha | timestamptz | YES | now() |
| tipo_incidente | text | YES | — |
| empleado_nombre | text | YES | — |
| descripcion | text | YES | — |
| monto_perdida | numeric | YES | 0 |
| aplica_reembolso | boolean | YES | false |
| aplica_compensacion | boolean | YES | false |
| estado | text | YES | `'registrado'` |
| imagen_url | text | YES | — |
| folio | text | YES | prefijo `INC-` + `upper(substring(gen_random_uuid()::text from 1 for 6))` (concat en SQL) |
| creado_por | uuid | YES | — |
| costo_estimado | numeric | YES | 0 |
| cliente_nombre | text | YES | — |
| foto_2 | text | YES | — |
| foto_3 | text | YES | — |

## `inventario`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| nombre | text | NO | — |
| categoria | text | YES | — |
| stock_actual | integer | YES | 0 |
| stock_minimo | integer | YES | 5 |
| precio_costo | numeric | YES | — |
| es_consumible | boolean | YES | — |
| updated_at | timestamptz | YES | now() |
| barcode | text | YES | — |
| costo | numeric | YES | — |
| precio_venta | numeric | YES | — |
| imagen_url | text | YES | — |
| fecha_vencimiento | date | YES | — |
| ubicacion | text | YES | — |
| notas | text | YES | — |
| visible_en_tienda | boolean | NO | false |
| descripcion_tienda | text | YES | — |
| imagenes_urls | ARRAY(text) | YES | `'{}'::text[]` |

## `marketing_campaigns`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | bigint | NO | — |
| nombre | text | NO | — |
| objetivo | text | NO | — |
| canal | text | NO | `'comunidad'` |
| presupuesto | numeric | NO | 0 |
| fecha_inicio | date | YES | — |
| fecha_fin | date | YES | — |
| estado | text | NO | `'activa'` |
| created_by | uuid | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | YES | — |
| segmentacion | text | NO | `'todos'` |
| segmento_valor | text | YES | — |

## `marketing_comments`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | bigint | NO | — |
| post_id | bigint | NO | — |
| content | text | NO | — |
| author_id | uuid | YES | — |
| author_name | text | YES | — |
| created_at | timestamptz | NO | now() |
| moderation_status | text | NO | `'visible'` |

## `marketing_delivery_logs`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | bigint | NO | — |
| message_id | text | NO | — |
| stage | text | NO | — |
| status | text | NO | — |
| detail | text | YES | — |
| created_at | timestamptz | NO | now() |

## `marketing_direct_messages`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | bigint | NO | — |
| client_id | uuid | YES | — |
| client_name | text | YES | — |
| client_phone | text | YES | — |
| content | text | NO | — |
| content_type | text | NO | `'post'` |
| media_url | text | YES | — |
| media_kind | text | YES | — |
| status | text | NO | `'pending_sync'` |
| created_by | uuid | YES | — |
| created_by_name | text | YES | — |
| created_at | timestamptz | NO | now() |
| delivered_at | timestamptz | YES | — |

## `marketing_post_likes`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| post_id | bigint | NO | — |
| client_key | text | NO | — |
| created_at | timestamptz | NO | now() |

## `marketing_posts`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | bigint | NO | — |
| title | text | YES | — |
| body | text | NO | — |
| cta_text | text | YES | — |
| visibility | text | NO | `'public'` |
| status | text | NO | `'published'` |
| author_id | uuid | YES | — |
| author_name | text | YES | — |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | YES | — |
| audience | text | NO | `'public'` |
| published_at | timestamptz | YES | — |

---

## `metas`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| titulo | text | NO | — |
| tipo | text | NO | — |
| valor_objetivo | numeric | NO | — |
| periodo | text | YES | `'mensual'` |
| activo | boolean | YES | true |
| creado_a | timestamptz | YES | now() |
| actual | numeric | YES | 0 |
| bono_monto | numeric | YES | 0 |
| alcance | text | YES | `'global'` |
| asignado_a | uuid | YES | — *(FK → `empleados.id`)* |
| fecha_inicio | date | YES | — |
| fecha_fin | date | YES | — |

## `movimientos_caja`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| caja_id | uuid | YES | — *(FK → `cajas.id`)* |
| tipo | text | YES | — |
| monto | numeric | YES | — |
| descripcion | text | YES | — |
| fecha | timestamptz | YES | now() |

## `notificaciones`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | uuid_generate_v4() |
| empleado_id | uuid | YES | — *(FK → `empleados.id`)* |
| titulo | text | YES | — |
| mensaje | text | YES | — |
| leida | boolean | YES | false |
| tipo | text | YES | — |
| created_at | timestamptz | YES | now() |
| target_screen | text | YES | — |
| target_id | uuid | YES | — |

## `profiles`

Extensión de datos por cuenta (`id` alineado con `auth.users`).

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | — |
| full_name | text | YES | — |
| role | text | NO | `'staff'` |
| phone | text | YES | — |
| created_at | timestamptz | NO | `timezone('utc'::text, now())` |
| address | text | YES | — |
| birthday | date | YES | — |
| age | integer | YES | — |
| photo_url | text | YES | — |
| marketing_access | boolean | NO | false |
| app_scope | text | YES | `'staff'` |
| community_enabled | boolean | NO | true |

## `ventas`

| column_name | data_type | nullable | default |
|-------------|-----------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| fecha | timestamptz | YES | now() |
| cliente_id | uuid | YES | — *(FK → `clientes.id`)* |
| cliente_nombre | text | YES | — |
| profesional | text | YES | — |
| total | numeric | YES | — |
| metodo_pago | text | YES | — |
| items | jsonb | YES | — |
| notas | text | YES | — |
| detalles_pago | text | YES | — |
| no_factura | text | YES | — |
| descuento | numeric | YES | 0 |
| fue_alterada | boolean | YES | false |
| motivo_alteracion | text | YES | — |
| vendedor_id | uuid | YES | — *(FK → `empleados.id`)* |
| caja_id | uuid | YES | — *(FK → `cajas.id`)* |
| monto | numeric | YES | — |

---

Últimas tablas incorporadas desde CSV. Las *(FK …)* enlazan con [`relationships-fk.md`](./relationships-fk.md).
