import type { SupabaseClient } from '@supabase/supabase-js';
import type { UUID } from '@/lib/types/db';
import { computeBookingDepositGtq } from '@/lib/bookingPolicy';
import { servicioUsaPreciosPorVolumen } from '../../../../shared/config/inventarioMeta.js';

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

export interface ComputedBooking {
  /** Monto a cobrar online (anticipo). */
  total: number;
  deposit: number;
  precioReferencia: number;
  precioVariable: boolean;
  nombre: string;
}

/**
 * Calcula el total de un pedido de productos EN EL SERVIDOR (nunca confiar en
 * el cliente): toma precios desde `inventario` y valida stock por sucursal.
 */
export async function computeProductOrder(
  supabase: SupabaseClient,
  items: Array<{ inventarioId: UUID; cantidad: number }>,
  branchId: UUID | null,
  options?: { fulfillment?: 'retiro_salon' | 'domicilio'; shippingFeeGtq?: number },
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

  const subtotal =
    Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;

  const fulfillment = options?.fulfillment ?? 'retiro_salon';
  const shippingFee =
    fulfillment === 'domicilio'
      ? Number(options?.shippingFeeGtq ?? process.env.WEB_PRODUCT_SHIPPING_FEE_GTQ ?? 0) || 0
      : 0;

  if (shippingFee > 0) {
    lines.push({
      product_id: 'shipping' as UUID,
      product_name: 'Envío a domicilio',
      unit_price: shippingFee,
      qty: 1,
      line_total: shippingFee,
    });
  }

  const total = Math.round((subtotal + shippingFee) * 100) / 100;
  return { ok: true, order: { lines, total } };
}

/** Anticipo de reserva (15 % mín. Q 35) — no el precio total del servicio. */
export async function computeBookingAmount(
  supabase: SupabaseClient,
  servicioId: UUID,
): Promise<
  { ok: true; booking: ComputedBooking } | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from('inventario')
    .select('nombre,precio_venta,notas')
    .eq('id', servicioId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'Servicio no encontrado.' };

  const precioReferencia = Number(data.precio_venta ?? 0);
  const deposit = computeBookingDepositGtq(precioReferencia);
  if (deposit <= 0) {
    return { ok: false, error: 'No se pudo calcular el anticipo de reserva.' };
  }

  return {
    ok: true,
    booking: {
      total: deposit,
      deposit,
      precioReferencia,
      precioVariable: servicioUsaPreciosPorVolumen(data),
      nombre: data.nombre as string,
    },
  };
}
