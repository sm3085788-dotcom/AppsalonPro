import { crearPedidoTarjetaDomicilioCapturada, crearPedidoTarjetaPendiente } from './pedidoSalon.js';
import { isPaymentGatewayConfigured as isStripeConfigured } from './paymentCheckout.js';

export {
  PRECIO_VARIABLE_LABEL,
  PRECIO_VARIABLE_HINT,
  mapInventarioToTiendaProduct,
  buildTiendaProductFicha,
} from './tiendaProductMap.js';

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
