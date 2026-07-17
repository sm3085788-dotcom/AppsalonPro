import type { SupabaseClient, User } from '@supabase/supabase-js';
import { computeProductOrder } from '@/lib/data/orderAmounts';
import { parseInventarioMeta } from '@/lib/inventario';
import type { InventarioRow, UUID } from '@/lib/types/db';

function friendlyOrderError(err: { message?: string } | null): string {
  const msg = String(err?.message || '');
  if (/row-level security/i.test(msg) && /ecommerce_order/i.test(msg)) {
    return 'No se pudo registrar el pedido con tu sesión. Cerrá sesión, volvé a entrar e intentá de nuevo.';
  }
  if (/permission denied for table ecommerce_orders/i.test(msg)) {
    return 'Permisos de pedidos incompletos en Supabase. Contactá al salón.';
  }
  return msg || 'No se pudo crear el pedido.';
}

async function buildSnapshotLines(
  supabase: SupabaseClient,
  lines: Array<{
    product_id: string;
    product_name: string;
    unit_price: number;
    qty: number;
    line_total: number;
  }>,
) {
  const productLines = lines.filter((l) => l.product_id !== 'shipping');
  const ids = [...new Set(productLines.map((l) => l.product_id))];
  const catalog = new Map<string, InventarioRow>();

  if (ids.length > 0) {
    const { data } = await supabase
      .from('inventario')
      .select('id,nombre,imagen_url,imagenes_urls,descripcion_tienda,notas')
      .in('id', ids);
    for (const row of (data ?? []) as InventarioRow[]) {
      catalog.set(row.id, row);
    }
  }

  return productLines.map((l) => {
    const row = catalog.get(l.product_id);
    const meta = row ? parseInventarioMeta(row.notas) : null;
    const imageUrl =
      row?.imagen_url ||
      (Array.isArray(row?.imagenes_urls) ? row.imagenes_urls[0] : null) ||
      meta?.image ||
      null;
    const description =
      String(row?.descripcion_tienda || meta?.descripcion || '').trim() || null;
    return {
      product_id: l.product_id,
      product_name: l.product_name,
      unit_price: l.unit_price,
      qty: l.qty,
      line_total: l.line_total,
      image_url: imageUrl,
      description,
    };
  });
}

export async function createWebCashOrder(
  supabase: SupabaseClient,
  user: User,
  params: {
    sucursalId: UUID | null;
    items: Array<{ inventarioId: UUID; cantidad: number }>;
    nombre: string;
    telefono: string;
  },
): Promise<
  | { ok: true; orderId: string; trackingCode: string | null; total: number }
  | { ok: false; error: string }
> {
  const { sucursalId, items, nombre, telefono } = params;

  const computed = await computeProductOrder(supabase, items, sucursalId, {
    fulfillment: 'retiro_salon',
  });
  if (!computed.ok) {
    return { ok: false, error: computed.error };
  }

  const snapshotLines = await buildSnapshotLines(supabase, computed.order.lines);

  const { data: order, error: oErr } = await supabase
    .from('ecommerce_orders')
    .insert({
      customer_name: nombre.slice(0, 120),
      customer_phone: telefono.slice(0, 40),
      notes: 'Pedido web · pago en efectivo',
      status: 'pending',
      total_amount: computed.order.total,
      payment_method: 'efectivo',
      client_user_id: user.id,
      fulfillment_type: 'retiro_salon',
      sucursal_id: sucursalId,
      source: 'web',
      checkout_snapshot: {
        source: 'web',
        fulfillment: 'retiro_salon',
        customer_phone: telefono.slice(0, 40),
        lines: snapshotLines,
      },
    })
    .select('id, tracking_code')
    .single();

  if (oErr || !order) {
    return { ok: false, error: friendlyOrderError(oErr) };
  }

  const bulk = computed.order.lines
    .filter((l) => l.product_id !== 'shipping')
    .map((l) => ({
      order_id: order.id,
      product_id: l.product_id,
      product_name: l.product_name,
      unit_price: l.unit_price,
      qty: l.qty,
      line_total: l.line_total,
      created_at: new Date().toISOString(),
    }));

  if (bulk.length > 0) {
    const { error: iErr } = await supabase.from('ecommerce_order_items').insert(bulk);
    if (iErr) {
      await supabase
        .from('ecommerce_orders')
        .update({
          status: 'cancelled',
          cancelled_reason: 'Error al guardar líneas del pedido',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      return { ok: false, error: friendlyOrderError(iErr) };
    }
  }

  return {
    ok: true,
    orderId: order.id as string,
    trackingCode: (order.tracking_code as string | null) ?? null,
    total: computed.order.total,
  };
}
