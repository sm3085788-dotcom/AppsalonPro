import {
  splitNotas,
  DEFAULT_TIENDA_META,
  servicioUsaPreciosPorVolumen,
  resolvePrecioRegularTienda,
  getArticuloTipo,
  maybeRevertInventarioPromoExpired,
  isPromocionVigente,
  formatPromocionHastaLabel,
} from './inventarioMeta.js';
import { crearPedidoTarjetaDomicilioCapturada, crearPedidoTarjetaPendiente } from './pedidoSalon.js';
import { isPaymentGatewayConfigured as isStripeConfigured } from './paymentCheckout.js';

/** Texto en catálogo App Clientes para servicios con precios por volumen (solo salón). */
export const PRECIO_VARIABLE_LABEL = 'Precio variable';
export const PRECIO_VARIABLE_HINT = 'Según volumen de cabello · coordiná en salón';

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Tarjeta desde app clientes.
 * Domicilio + QPayPro: usar checkoutDomicilioConQPayPro() antes de finalizar el pedido.
 * Domicilio sin Stripe (dev): cardPayment validado localmente.
 * Retiro → pedido pendiente; el salón confirma cobro con su pasarela.
 */
export async function confirmarCompraConTarjeta(params) {
  const { shipId, cardPayment, stripePaymentIntentId, cardBrand, cardHolder, ...rest } = params;

  if (shipId === 'ship-home' && stripePaymentIntentId) {
    return {
      ok: false,
      error: {
        message: 'Usá finalizeQPayProDomicilioOrder() tras confirmar el pago.',
      },
    };
  }

  if (shipId === 'ship-home' && cardPayment?.ok && !isStripeConfigured()) {
    return crearPedidoTarjetaDomicilioCapturada({
      ...rest,
      shipId,
      cardLast4: cardPayment.last4,
      cardBrand: cardPayment.brand || cardBrand,
      cardHolder: cardPayment.holder || cardHolder,
    });
  }

  if (shipId === 'ship-home' && isStripeConfigured()) {
    return {
      ok: false,
      error: {
        message: 'Completá el pago con QPayPro antes de confirmar el pedido.',
      },
    };
  }

  return crearPedidoTarjetaPendiente(params);
}

export function mapInventarioToTiendaProduct(row) {
  if (!row) return null;
  const fresh = maybeRevertInventarioPromoExpired(row);
  const { meta } = splitNotas(fresh.notas);
  const imgs = Array.isArray(fresh.imagenes_urls) ? fresh.imagenes_urls.filter(Boolean) : [];
  const mainImg = fresh.imagen_url || imgs[0] || null;
  const allImgs = [...new Set([mainImg, ...imgs].filter(Boolean))];
  const precioVariable = servicioUsaPreciosPorVolumen(fresh);
  const venta = precioVariable ? null : Number(fresh.precio_venta || 0);
  const tipo = getArticuloTipo(fresh);
  const stock = Number(fresh.stock_actual ?? 0);
  const precioRegular =
    !precioVariable && Number.isFinite(venta) && venta > 0 ? resolvePrecioRegularTienda(fresh, venta) : null;
  const promoVigente = isPromocionVigente(meta);
  const promoBadge = promoVigente
    ? meta.badge?.trim() || `Promo · hasta ${formatPromocionHastaLabel(meta.promocionHasta)}`
    : null;

  return {
    id: fresh.id,
    inventarioId: fresh.id,
    stockActual: stock,
    brandLine: fresh.categoria || (tipo === 'servicio' ? 'Servicio' : 'Salón'),
    title: fresh.nombre,
    sku: fresh.barcode || null,
    imageUri: mainImg,
    imageUris: allImgs,
    precioVariable,
    priceLabel: precioVariable ? PRECIO_VARIABLE_LABEL : formatQ(venta),
    priceAmount: precioVariable ? null : venta,
    compareAtLabel: precioRegular != null ? formatQ(precioRegular) : null,
    stockHint:
      tipo === 'servicio' && String(meta.hintTarjeta || '').trim()
        ? String(meta.hintTarjeta).trim()
        : precioVariable
          ? PRECIO_VARIABLE_HINT
          : stock > 0
            ? tipo === 'servicio'
              ? 'Disponible para agendar'
              : 'Disponible en esta sucursal'
            : tipo === 'servicio'
              ? 'Sin cupo en esta sucursal'
              : 'Sin existencia en esta sucursal',
    rating: Math.min(5, Math.max(0, Number(meta.rating) || 4.5)),
    reviewCount: Math.max(0, Math.floor(Number(meta.reviewCount) || 0)),
    shippingLabel: meta.shippingLabel || DEFAULT_TIENDA_META.shippingLabel,
    badge: promoBadge || meta.badge?.trim() || null,
    descripcion: fresh.descripcion_tienda || '',
    articuloTipo: tipo,
    promocionVigente: promoVigente,
    promocionHasta: promoVigente ? meta.promocionHasta : null,
    duracionAgenda:
      tipo === 'servicio'
        ? String(meta.duracion_agenda || '').trim() ||
          (meta.duracion_minutos ? `${meta.duracion_minutos} min` : '')
        : '',
  };
}

/**
 * Ficha para App Clientes: solo datos públicos (sin stock interno, ubicación, SKU, etc.).
 */
export function buildTiendaProductFicha(product) {
  if (!product) return { specs: [], longCopy: '' };
  const specs = [];
  const add = (label, value) => {
    const v = value == null ? '' : String(value).trim();
    if (v) specs.push({ label, value: v });
  };

  if (product.articuloTipo === 'servicio') {
    add('Tipo', 'Servicio profesional');
    if (product.duracionAgenda) add('Duración aproximada', product.duracionAgenda);
  } else {
    add('Tipo', 'Producto del salón');
  }

  if (product.precioVariable) {
    add('Precio', `${PRECIO_VARIABLE_LABEL} · se confirma en el salón`);
  } else if (product.priceLabel) {
    add('Precio', product.priceLabel);
  }

  if (product.stockHint) add('Disponibilidad', product.stockHint);
  if (product.shippingLabel) add('Envío y retiro', product.shippingLabel);
  if (product.badge) add('Destacado', product.badge);

  const longCopy =
    product.descripcion?.trim() ||
    (product.articuloTipo === 'servicio'
      ? 'Servicio profesional del salón. Coordiná tu cita desde la app.'
      : 'Producto del salón. Retiro en recepción o envío según disponibilidad.');

  return { specs, longCopy };
}
