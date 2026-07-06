import { getPaymentEnv, getPaymentGateway } from '../../../../shared/payments/index.js';

export { getPaymentEnv, getPaymentGateway, isPaymentGatewayConfigured } from '../../../../shared/payments/index.js';
export {
  PAYMENT_CURRENCY,
  formatPaymentGtqLabel,
  quetzalesToMinorUnits,
} from '../../../../shared/payments/currency.js';

export function getWebPaymentGateway() {
  return getPaymentGateway(getPaymentEnv());
}
