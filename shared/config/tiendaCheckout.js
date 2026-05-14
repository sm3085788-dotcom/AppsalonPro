import { db } from './supabaseClient.js';
import { registrarMontoVentaEnMeta } from './metaGlobal.js';

/**
 * Cierra compra con tarjeta desde app clientes: venta en `ventas`, descuenta stock y suma monto a la meta global.
 * @param {{ clienteId?: string, clienteNombre?: string, cartItems: Array<{ id: string, title: string, qty: number, priceAmount: number }> }} params
 */
export async function confirmarCompraConTarjeta({ clienteId, clienteNombre, cartItems }) {
  const lines = (cartItems || []).filter((i) => i?.id && Number(i.qty) > 0);
  if (!lines.length) {
    return { ok: false, error: { message: 'El carrito está vacío.' } };
  }

  for (const line of lines) {
    const { data: prod, error: pErr } = await db.inventario.getById(line.id);
    if (pErr || !prod) {
      return { ok: false, error: { message: `Producto no encontrado: ${line.title || line.id}` } };
    }
    const stock = Number(prod.stock_actual ?? 0);
    if (stock < Number(line.qty)) {
      return {
        ok: false,
        error: { message: `Stock insuficiente para «${prod.nombre}» (hay ${stock}, pediste ${line.qty}).` },
      };
    }
  }

  const subtotal = lines.reduce((s, l) => s + Number(l.priceAmount || 0) * Number(l.qty || 0), 0);
  const items = lines.map((l) => ({
    producto_id: l.id,
    nombre: l.title,
    cantidad: l.qty,
    precio_unitario: Number(l.priceAmount || 0),
    subtotal: Number(l.priceAmount || 0) * Number(l.qty || 0),
  }));
  const noFactura = `WEB-${Date.now().toString(36).toUpperCase()}`;

  const { data: venta, error: vErr } = await db.ventas.create({
    cliente_id: clienteId || null,
    cliente_nombre: clienteNombre?.trim() || null,
    total: subtotal,
    monto: subtotal,
    metodo_pago: 'tarjeta',
    items,
    no_factura: noFactura,
    descuento: 0,
    notas: 'Compra app clientes · tarjeta',
    detalles_pago: 'Tarjeta guardada (app clientes)',
  });

  if (vErr) return { ok: false, error: vErr };

  for (const line of lines) {
    const { error: dErr } = await db.inventario.decrementarStock(line.id, line.qty);
    if (dErr) {
      return {
        ok: false,
        error: {
          message: `Venta ${noFactura} registrada, pero falló el descuento de stock de «${line.title}». Revisá inventario.`,
        },
        venta,
      };
    }
  }

  await registrarMontoVentaEnMeta(subtotal);

  return { ok: true, venta, noFactura, total: subtotal };
}

export function mapInventarioToTiendaProduct(row) {
  if (!row) return null;
  const imgs = Array.isArray(row.imagenes_urls) ? row.imagenes_urls.filter(Boolean) : [];
  const mainImg = row.imagen_url || imgs[0] || null;
  return {
    id: row.id,
    inventarioId: row.id,
    brandLine: row.categoria || 'Salón',
    title: row.nombre,
    imageUri: mainImg,
    imageUris: imgs.length ? imgs : mainImg ? [mainImg] : [],
    priceLabel: `Q ${Number(row.precio_venta || 0).toFixed(2)}`,
    priceAmount: Number(row.precio_venta || 0),
    stockHint: `En stock · ${row.stock_actual ?? 0} u.`,
    rating: 4.5,
    reviewCount: 0,
    shippingLabel: 'Retiro en salón o envío según disponibilidad',
    descripcion: row.descripcion_tienda || row.notas || '',
  };
}
