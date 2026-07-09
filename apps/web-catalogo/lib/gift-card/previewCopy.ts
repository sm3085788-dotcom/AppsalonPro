/** Texto en vista previa antes de activar el código ACT (sin nombres por privacidad). */
export type GiftCardActivationMode = 'recover' | 'complete';

export const GIFT_CARD_PREVIEW_INCOMPLETE = {
  paraNombre: 'Al activar',
  deNombre: 'Al activar',
} as const;


export const GIFT_CARD_RECOVER_INTRO =
  'Recibiste anteriormente un mensaje por WhatsApp con tu código ACT de acceso. Copialo y pegalo para recuperar tu tarjeta de regalo.';

export const GIFT_CARD_COMPLETE_INTRO =
  'Pegá el código ACT que recibiste por WhatsApp tras el pago y completá Para, De y mensaje para generar tu tarjeta oficial.';

export const GIFT_CARD_PREVIEW_SUBTITLE =
  'Vista previa del frente y reverso. Falta completar los nombres después de recibir tu código de activación.';

export const GIFT_CARD_PREVIEW_PAYMENT_NOTE =
  'Recibirás tu código de acceso por mensaje y podrás completar la información de tu tarjeta de regalo. Por privacidad, no te pedimos ningún nombre aquí: es tu secreto.';
