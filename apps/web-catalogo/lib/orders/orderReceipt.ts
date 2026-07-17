import type { SupabaseClient } from '@supabase/supabase-js';
import { parseInventarioMeta } from '@/lib/inventario';
import type { InventarioRow } from '@/lib/types/db';

export interface OrderReceiptLine {
  productId: string;
  productName: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  imageUrl: string | null;
  description: string | null;
}

export interface OrderReceipt {
  id: string;
  trackingCode: string | null;
  status: string;
  totalAmount: number;
  paymentMethod: string | null;
  fulfillmentType: string | null;
  customerName: string | null;
  createdAt: string;
  sucursalNombre: string | null;
  lines: OrderReceiptLine[];
}

function productImage(row: InventarioRow): string | null {
  const meta = parseInventarioMeta(row.notas);
  if (row.imagen_url) return row.imagen_url;
  if (Array.isArray(row.imagenes_urls) && row.imagenes_urls.length > 0) {
    return row.imagenes_urls[0] ?? null;
  }
  return meta.image;
}

function productDescription(row: InventarioRow): string | null {
  const meta = parseInventarioMeta(row.notas);
  const text = String(row.descripcion_tienda || meta.descripcion || '').trim();
  return text || null;
}

type SnapshotLine = {
  product_id?: string;
  product_name?: string;
  unit_price?: number;
  qty?: number;
  line_total?: number;
  image_url?: string | null;
  description?: string | null;
};

function snapshotLinesByProductId(
  snapshot: unknown,
): Map<string, { imageUrl: string | null; description: string | null }> {
  const map = new Map<string, { imageUrl: string | null; description: string | null }>();
  if (!snapshot || typeof snapshot !== 'object') return map;
  const lines = (snapshot as { lines?: SnapshotLine[] }).lines;
  if (!Array.isArray(lines)) return map;
  for (const line of lines) {
    const id = String(line.product_id || '').trim();
    if (!id) continue;
    map.set(id, {
      imageUrl: line.image_url ?? null,
      description: line.description ?? null,
    });
  }
  return map;
}

export async function getOrderReceiptForUser(
  supabase: SupabaseClient,
  userId: string,
  orderId: string,
): Promise<OrderReceipt | null> {
  const id = String(orderId || '').trim();
  if (!id) return null;

  const { data: order } = await supabase
    .from('ecommerce_orders')
    .select(
      'id,tracking_code,status,total_amount,payment_method,fulfillment_type,customer_name,created_at,sucursal_id,client_user_id,checkout_snapshot',
    )
    .eq('id', id)
    .eq('client_user_id', userId)
    .maybeSingle();

  if (!order) return null;

  const { data: items } = await supabase
    .from('ecommerce_order_items')
    .select('product_id,product_name,unit_price,qty,line_total')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  const productIds = [
    ...new Set(
      (items ?? [])
        .map((i) => String(i.product_id || '').trim())
        .filter(Boolean),
    ),
  ];

  const catalogById = new Map<string, InventarioRow>();
  if (productIds.length > 0) {
    const { data: catalog } = await supabase
      .from('inventario')
      .select('id,nombre,imagen_url,imagenes_urls,descripcion_tienda,notas')
      .in('id', productIds);
    for (const row of (catalog ?? []) as InventarioRow[]) {
      catalogById.set(row.id, row);
    }
  }

  let sucursalNombre: string | null = null;
  const sucursalId = order.sucursal_id as string | null;
  if (sucursalId) {
    const { data: suc } = await supabase
      .from('sucursales')
      .select('nombre')
      .eq('id', sucursalId)
      .maybeSingle();
    sucursalNombre = (suc?.nombre as string | undefined)?.trim() || null;
  }

  const snapshotById = snapshotLinesByProductId(order.checkout_snapshot);

  const lines: OrderReceiptLine[] = (items ?? []).map((item) => {
    const productId = String(item.product_id || '');
    const catalog = catalogById.get(productId);
    const snapshot = snapshotById.get(productId);
    return {
      productId,
      productName: String(item.product_name || catalog?.nombre || 'Producto'),
      unitPrice: Number(item.unit_price ?? 0),
      qty: Number(item.qty ?? 0),
      lineTotal: Number(item.line_total ?? 0),
      imageUrl: catalog ? productImage(catalog) : snapshot?.imageUrl ?? null,
      description: catalog
        ? productDescription(catalog)
        : snapshot?.description ?? null,
    };
  });

  return {
    id: order.id as string,
    trackingCode: (order.tracking_code as string | null) ?? null,
    status: String(order.status || 'pending'),
    totalAmount: Number(order.total_amount ?? 0),
    paymentMethod: (order.payment_method as string | null) ?? null,
    fulfillmentType: (order.fulfillment_type as string | null) ?? null,
    customerName: (order.customer_name as string | null) ?? null,
    createdAt: String(order.created_at || new Date().toISOString()),
    sucursalNombre,
    lines,
  };
}
