import { db } from './supabaseClient.js';
import { getClientSucursalId } from './clientSucursal.js';

/** Stock disponible en la sucursal elegida (0 si no hay fila en inventario_stock_sucursal). */
export async function fetchBranchStock(inventarioId, sucursalId) {
  const sid = sucursalId ? String(sucursalId) : await getClientSucursalId();
  if (!sid || !inventarioId) return 0;
  const { data, error } = await db.inventario.getById(inventarioId, { sucursalId: sid });
  if (error || !data) return 0;
  return Math.max(0, Math.floor(Number(data.stock_actual ?? 0)));
}

export function productStockFromRow(row) {
  return Math.max(0, Math.floor(Number(row?.stock_actual ?? 0)));
}

export function isProductAvailableAtBranch(product) {
  if (!product || product.precioVariable) return false;
  const stock = Number.isFinite(product.stockActual)
    ? product.stockActual
    : productStockFromRow(product);
  return stock > 0;
}

/** Valida carrito contra stock de sucursal; no crea pedidos ni borradores. */
export async function validateCartBranchStock(cartItems, sucursalId) {
  const sid = sucursalId ? String(sucursalId) : await getClientSucursalId();
  if (!sid) {
    return { ok: false, message: 'Elegí una sucursal en la tienda antes de continuar.' };
  }
  const lines = (cartItems || []).filter((i) => i?.id && Number(i.qty) > 0);
  if (!lines.length) {
    return { ok: false, message: 'El carrito está vacío.' };
  }
  for (const line of lines) {
    const { data: prod, error } = await db.inventario.getById(line.id, { sucursalId: sid });
    if (error || !prod) {
      return {
        ok: false,
        message: `«${line.title || 'Producto'}» no está disponible en esta sucursal.`,
      };
    }
    const stock = productStockFromRow(prod);
    const qty = Number(line.qty || 0);
    if (stock < qty) {
      const nombre = prod.nombre || line.title || 'Producto';
      if (stock <= 0) {
        return {
          ok: false,
          message: `«${nombre}» no tiene existencia en la sucursal elegida. Elegí otra sucursal o quitá el producto del carrito.`,
        };
      }
      return {
        ok: false,
        message: `Stock insuficiente para «${nombre}» en esta sucursal (hay ${stock}, pediste ${qty}).`,
      };
    }
  }
  return { ok: true, sucursalId: sid };
}
