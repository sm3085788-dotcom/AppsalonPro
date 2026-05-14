import { db } from './supabaseClient.js';
import { registrarMontoVentaEnMeta } from './metaGlobal.js';
import { splitNotas, DEFAULT_TIENDA_META } from './inventarioMeta.js';

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
  const { meta } = splitNotas(row.notas);
  const imgs = Array.isArray(row.imagenes_urls) ? row.imagenes_urls.filter(Boolean) : [];
  const mainImg = row.imagen_url || imgs[0] || null;
  const allImgs = [...new Set([mainImg, ...imgs].filter(Boolean))];
  const venta = Number(row.precio_venta || 0);
  const costo = Number(row.precio_costo ?? row.costo ?? 0);
  const tipo = meta.articuloTipo === 'servicio' ? 'servicio' : 'producto';
  const stock = Number(row.stock_actual ?? 0);

  return {
    id: row.id,
    inventarioId: row.id,
    brandLine: row.categoria || (tipo === 'servicio' ? 'Servicio' : 'Salón'),
    title: row.nombre,
    sku: row.barcode || null,
    imageUri: mainImg,
    imageUris: allImgs,
    priceLabel: formatQ(venta),
    priceAmount: venta,
    compareAtLabel: costo > venta && venta > 0 ? formatQ(costo) : null,
    stockHint:
      stock > 0
        ? tipo === 'servicio'
          ? 'Servicio disponible · agenda'
          : `En stock · ${stock} u.`
        : tipo === 'servicio'
          ? 'Consultá disponibilidad en salón'
          : 'Sin stock · consultá en salón',
    stockActual: stock,
    stockMinimo: Number(row.stock_minimo ?? 0),
    rating: Math.min(5, Math.max(0, Number(meta.rating) || 4.5)),
    reviewCount: Math.max(0, Math.floor(Number(meta.reviewCount) || 0)),
    shippingLabel: meta.shippingLabel || DEFAULT_TIENDA_META.shippingLabel,
    badge: meta.badge?.trim() || null,
    descripcion: row.descripcion_tienda || '',
    articuloTipo: tipo,
    duracionMinutos: Math.max(15, Math.floor(Number(meta.duracion_minutos) || 60)),
    esConsumible: !!row.es_consumible,
    fechaVencimiento: row.fecha_vencimiento || null,
    ubicacion: row.ubicacion || null,
  };
}

/** Ficha técnica (especificaciones + descripción) para detalle de tienda. */
export function buildTiendaProductFicha(product) {
  if (!product) return { specs: [], longCopy: '' };
  const specs = [];
  const add = (label, value) => {
    const v = value == null ? '' : String(value).trim();
    if (v) specs.push({ label, value: v });
  };

  add('Tipo', product.articuloTipo === 'servicio' ? 'Servicio en salón' : 'Producto');
  add('SKU / código', product.sku);
  if (product.articuloTipo === 'servicio') {
    add('Duración en agenda', `${product.duracionMinutos || 60} min`);
  }
  add('Precio', product.priceLabel);
  if (product.compareAtLabel) add('Precio referencia', product.compareAtLabel);
  add('Stock disponible', `${product.stockActual ?? 0} u.`);
  add('Stock mínimo', `${product.stockMinimo ?? 0} u.`);
  add('Consumible / insumo', product.esConsumible ? 'Sí' : 'No');
  add('Fecha de vencimiento', product.fechaVencimiento);
  add('Ubicación en salón', product.ubicacion);
  add('Valoración', `${Number(product.rating || 0).toFixed(1)} / 5`);
  add('Reseñas', `${product.reviewCount ?? 0}`);
  add('Envío y retiro', product.shippingLabel);
  if (product.badge) add('Insignia', product.badge);

  const longCopy =
    product.descripcion?.trim() ||
    (product.articuloTipo === 'servicio'
      ? 'Servicio profesional del salón. Coordiná tu cita desde la app.'
      : 'Producto del salón. Retiro en recepción o envío según disponibilidad.');

  return { specs, longCopy };
}
