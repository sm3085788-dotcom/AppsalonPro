import type { SupabaseClient } from '@supabase/supabase-js';
import type { UUID } from '@/lib/types/db';

export interface ComputedLine {
  product_id: UUID;
  product_name: string;
  unit_price: number;
  qty: number;
  line_total: number;
}

export interface ComputedOrder {
  lines: ComputedLine[];
  total: number;
}

/**
 * Calcula el total de un pedido de productos EN EL SERVIDOR (nunca confiar en
 * el cliente): toma precios desde `inventario` y valida stock por sucursal.
 */
export async function computeProductOrder(
  supabase: SupabaseClient,
  items: Array<{ inventarioId: UUID; cantidad: number }>,
  branchId: UUID | null,
): Promise<{ ok: true; order: ComputedOrder } | { ok: false; error: string }> {
  const clean = items.filter((i) => i.inventarioId && i.cantidad > 0);
  if (clean.length === 0) return { ok: false, error: 'Carrito vacío.' };

  const ids = clean.map((i) => i.inventarioId);

  const { data: rows, error } = await supabase
    .from('inventario')
    .select('id,nombre,precio_venta')
    .in('id', ids);
  if (error || !rows) return { ok: false, error: 'No se pudo leer el catálogo.' };

  // Validacion de stock por sucursal (best-effort: si no hay datos, no bloquea).
  const stock = new Map<string, number>();
  if (branchId) {
    const { data: st } = await supabase
      .from('inventario_stock_sucursal')
      .select('inventario_id,stock_actual')
      .eq('sucursal_id', branchId)
      .in('inventario_id', ids);
    for (const s of (st ?? []) as Array<{
      inventario_id: string;
      stock_actual: number | null;
    }>) {
      stock.set(s.inventario_id, Number(s.stock_actual ?? 0));
    }
  }

  const lines: ComputedLine[] = [];
  for (const item of clean) {
    const row = (rows as Array<{
      id: string;
      nombre: string;
      precio_venta: number | null;
    }>).find((r) => r.id === item.inventarioId);
    if (!row) return { ok: false, error: 'Producto no encontrado.' };

    if (stock.size > 0) {
      const disponible = stock.get(item.inventarioId) ?? 0;
      if (disponible < item.cantidad) {
        return {
          ok: false,
          error: `Stock insuficiente para ${row.nombre}.`,
        };
      }
    }

    const unit = Number(row.precio_venta ?? 0);
    lines.push({
      product_id: row.id,
      product_name: row.nombre,
      unit_price: unit,
      qty: item.cantidad,
      line_total: Math.round(unit * item.cantidad * 100) / 100,
    });
  }

  const total =
    Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  return { ok: true, order: { lines, total } };
}

/** Precio de un servicio (cita) leido desde inventario. */
export async function computeBookingAmount(
  supabase: SupabaseClient,
  servicioId: UUID,
): Promise<{ ok: true; total: number; nombre: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from('inventario')
    .select('nombre,precio_venta')
    .eq('id', servicioId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'Servicio no encontrado.' };
  return {
    ok: true,
    total: Number(data.precio_venta ?? 0),
    nombre: data.nombre as string,
  };
}
