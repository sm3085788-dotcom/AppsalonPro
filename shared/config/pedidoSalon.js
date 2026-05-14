import { db } from './supabaseClient.js';
import { registrarMontoVentaEnMeta } from './metaGlobal.js';

function mapFulfillment(shipId, homeAddressType) {
  if (shipId === 'ship-home') {
    return {
      fulfillment_type: 'domicilio',
      delivery_reference: homeAddressType === 'casa' ? 'Casa' : 'Trabajo',
    };
  }
  return { fulfillment_type: 'retiro_salon', delivery_reference: null };
}

/**
 * Pedido pendiente de pago en efectivo (llega a App Salón · Pedidos).
 */
export async function crearPedidoEfectivo({
  clienteNombre,
  clienteTelefono,
  clientUserId,
  cartItems,
  shipId,
  homeAddressType,
  notes,
}) {
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
  const fulfillment = mapFulfillment(shipId, homeAddressType);

  const { data: order, error: oErr } = await db.orders.create({
    customer_name: clienteNombre?.trim() || 'Cliente tienda',
    customer_phone: clienteTelefono?.trim() || '—',
    notes: notes || 'Pedido app clientes · pago en efectivo',
    status: 'pending',
    total_amount: subtotal,
    payment_method: 'efectivo',
    client_user_id: clientUserId || null,
    fulfillment_type: fulfillment.fulfillment_type,
    delivery_reference: fulfillment.delivery_reference,
  });

  if (oErr || !order) {
    return { ok: false, error: oErr || { message: 'No se pudo crear el pedido.' } };
  }

  const bulk = lines.map((l) => ({
    order_id: order.id,
    product_id: l.id,
    product_name: l.title,
    unit_price: Number(l.priceAmount || 0),
    qty: Number(l.qty || 0),
  }));

  const { error: iErr } = await db.ecommerceOrderItems.createBulk(bulk);
  if (iErr) {
    await db.orders.cancelar(order.id, 'Error al guardar líneas del pedido');
    return { ok: false, error: iErr };
  }

  return { ok: true, order, trackingCode: order.tracking_code, total: subtotal };
}

/**
 * Salón confirma que el cliente pagó en efectivo: venta, stock y meta.
 */
export async function confirmarCobroPedidoSalon(orderId) {
  const { data: order, error: oErr } = await db.orders.getById(orderId);
  if (oErr || !order) {
    return { ok: false, error: oErr || { message: 'Pedido no encontrado.' } };
  }
  if (String(order.status) !== 'pending') {
    return { ok: false, error: { message: `El pedido ya está en estado «${order.status}».` } };
  }

  const { data: items, error: iErr } = await db.ecommerceOrderItems.getByOrder(orderId);
  if (iErr) return { ok: false, error: iErr };
  if (!items?.length) {
    return { ok: false, error: { message: 'El pedido no tiene productos.' } };
  }

  for (const line of items) {
    const pid = line.product_id;
    const qty = Number(line.qty || 0);
    const { data: prod } = await db.inventario.getById(pid);
    const stock = Number(prod?.stock_actual ?? 0);
    if (stock < qty) {
      return {
        ok: false,
        error: { message: `Stock insuficiente para «${line.product_name}» al confirmar.` },
      };
    }
  }

  const subtotal = Number(order.total_amount || 0);
  const ventaItems = items.map((l) => ({
    producto_id: l.product_id,
    nombre: l.product_name,
    cantidad: l.qty,
    precio_unitario: Number(l.unit_price || 0),
    subtotal: Number(l.line_total || Number(l.unit_price) * Number(l.qty)),
  }));

  const noFactura = order.tracking_code || `PED-${String(orderId).slice(0, 8)}`;

  const { error: vErr } = await db.ventas.create({
    cliente_nombre: order.customer_name,
    total: subtotal,
    monto: subtotal,
    metodo_pago: 'efectivo',
    items: ventaItems,
    no_factura: noFactura,
    descuento: 0,
    notas: `Pedido tienda · cobro confirmado en salón · ${order.tracking_code || orderId}`,
    detalles_pago: 'Efectivo (app clientes)',
  });

  if (vErr) return { ok: false, error: vErr };

  for (const line of items) {
    const { error: dErr } = await db.inventario.decrementarStock(line.product_id, line.qty);
    if (dErr) {
      return {
        ok: false,
        error: { message: `Venta registrada pero falló stock de «${line.product_name}».` },
      };
    }
  }

  await registrarMontoVentaEnMeta(subtotal);

  const { error: uErr } = await db.orders.update(orderId, {
    status: 'delivered',
    confirmed_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
  });

  if (uErr) return { ok: false, error: uErr };

  return { ok: true, noFactura, total: subtotal };
}
