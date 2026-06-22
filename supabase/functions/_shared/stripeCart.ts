import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { applyDiscountToSubtotal, gtqToStripeAmount } from './stripeCartMath.ts';

type SupabaseAdmin = ReturnType<typeof createClient>;

type CartLine = {
  id: string;
  title?: string;
  qty: number;
  priceAmount?: number;
};

export async function validateCartAndTotal(
  supabaseAdmin: SupabaseAdmin,
  cartItems: CartLine[],
  sucursalId: string,
  checkoutSnapshot: Record<string, unknown> | null,
  clientTotal: number,
) {
  const lines = (cartItems || []).filter((i) => i?.id && Number(i.qty) > 0);
  if (!lines.length) {
    return { ok: false as const, message: 'El carrito está vacío.' };
  }
  if (!sucursalId) {
    return { ok: false as const, message: 'Elegí una sucursal en la tienda.' };
  }

  let subtotal = 0;
  const normalizedLines: Array<{
    id: string;
    title: string;
    qty: number;
    unit_price: number;
  }> = [];

  for (const line of lines) {
    const { data: prod, error } = await supabaseAdmin
      .from('inventario')
      .select('id, nombre, precio_venta')
      .eq('id', String(line.id))
      .single();
    if (error || !prod) {
      return {
        ok: false as const,
        message: `«${line.title || 'Producto'}» no está disponible.`,
      };
    }

    const { data: st } = await supabaseAdmin
      .from('inventario_stock_sucursal')
      .select('stock_actual')
      .eq('sucursal_id', sucursalId)
      .eq('inventario_id', String(line.id))
      .maybeSingle();

    const stock = Math.max(0, Math.floor(Number(st?.stock_actual ?? 0)));
    const qty = Number(line.qty || 0);
    if (stock < qty) {
      const nombre = String(prod.nombre || line.title || 'Producto');
      return {
        ok: false as const,
        message: stock <= 0
          ? `«${nombre}» sin existencia en la sucursal elegida.`
          : `Stock insuficiente para «${nombre}» (hay ${stock}, pediste ${qty}).`,
      };
    }

    const unit = Number(prod.precio_venta || 0);
    subtotal += unit * qty;
    normalizedLines.push({
      id: String(line.id),
      title: String(prod.nombre || line.title || 'Producto'),
      qty,
      unit_price: unit,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const canje = (checkoutSnapshot?.andreas_canje || null) as {
    descuento_pct?: number;
    subtotal_antes?: number;
  } | null;
  let serverTotal = subtotal;
  if (canje?.descuento_pct != null) {
    const calc = applyDiscountToSubtotal(
      Number(canje.subtotal_antes) > 0 ? Number(canje.subtotal_antes) : subtotal,
      Number(canje.descuento_pct),
    );
    serverTotal = calc.total;
  }

  const expected = Math.max(0, Number(clientTotal) || serverTotal);
  if (Math.abs(serverTotal - expected) > 0.02) {
    return {
      ok: false as const,
      message: 'El total del pedido cambió. Volvé al carrito y revisá el monto.',
    };
  }

  return {
    ok: true as const,
    sucursalId,
    lines: normalizedLines,
    subtotal,
    serverTotal: expected,
  };
}

export { applyDiscountToSubtotal, gtqToStripeAmount };
