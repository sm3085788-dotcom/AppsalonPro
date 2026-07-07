/** Contacto del salón (alineado a shared/config/salonContacto.js). */
import {
  buildWhatsAppCustomerMessage,
  type WhatsAppCustomerContext,
  type WhatsAppCustomerTopic,
} from '@/lib/whatsappCustomerMessages';

const WHATSAPP_NUMBER = '50247132123';

export type { WhatsAppCustomerContext, WhatsAppCustomerTopic };
export {
  buildMembresiasWhatsAppMessage,
  buildCumpleanosWhatsAppMessage,
  buildGiftCardWhatsAppMessage,
  buildGeneralWhatsAppMessage,
  whatsappContextFromCliente,
} from '@/lib/whatsappCustomerMessages';

export function buildWhatsAppCustomerUrl(
  topic: WhatsAppCustomerTopic = 'general',
  context?: WhatsAppCustomerContext,
): string {
  const message = buildWhatsAppCustomerMessage(topic, context);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const SALON_CONTACT = {
  nombre: "Andrea's salón",
  whatsapp: WHATSAPP_NUMBER,
  telefonoLabel: '+502 4713 2123',
  whatsappUrl: `https://wa.me/${WHATSAPP_NUMBER}`,
  customerServiceWhatsAppUrl: buildWhatsAppCustomerUrl('general'),
  telUrl: `tel:+${WHATSAPP_NUMBER}`,
} as const;
