/** Texto editorial del reverso de la tarjeta VIP. */

export interface GiftCardBackCopyInput {
  paraNombre: string;
  deNombre: string;
  mensaje?: string | null;
}

export interface GiftCardBackCopy {
  para: string;
  de: string;
  intro: string;
  body: string;
  closing: string;
  personal: string | null;
}

export function buildGiftCardBackCopy(input: GiftCardBackCopyInput): GiftCardBackCopy {
  const para = String(input.paraNombre || '').trim() || 'ti';
  const de = String(input.deNombre || '').trim() || 'Quien te estima';
  const personal = String(input.mensaje || '').trim() || null;

  const intro = `Para ${para}, con cariño sincero:`;

  const body =
    'Con amor, amistad y respeto, te regalo un momento para tu salud y tu belleza. ' +
    'En Salón Andreas creemos que cuidarte es un acto de amor propio: un refugio donde el bienestar, ' +
    'el detalle y la confianza se encuentran para que te sientas extraordinaria.';

  const closing =
    'Que este regalo te inspire a celebrarte, cuidarte y brillar. — Salón Andreas';

  return { para, de, intro, body, closing, personal };
}
