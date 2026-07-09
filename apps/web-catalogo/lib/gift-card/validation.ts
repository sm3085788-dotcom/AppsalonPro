export const GIFT_CARD_MIN_GTQ = 50;
export const GIFT_CARD_MAX_GTQ = 10000;
export const GIFT_CARD_PRESETS = [50, 100, 200, 500] as const;

export interface GiftCardFormInput {
  amount: string;
  forName?: string;
  fromName?: string;
  message?: string;
  buyerEmail?: string;
}

export interface GiftCardCheckoutPayload {
  monto: number;
}

export interface GiftCardActivationInput {
  codigo: string;
  forName: string;
  fromName: string;
  message?: string;
}

export interface GiftCardActivationPayload {
  codigo: string;
  paraNombre: string;
  deNombre: string;
  mensaje: string;
}

export function parseGiftCardAmount(raw: string): number | null {
  const n = Number(String(raw || '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  if (rounded < GIFT_CARD_MIN_GTQ || rounded > GIFT_CARD_MAX_GTQ) return null;
  return rounded;
}

export function hasNombreYApellido(value: string): boolean {
  const parts = String(value || '')
    .trim()
    .split(/\s+/)
    .filter((part) => part.length >= 2);
  return parts.length >= 2;
}

/** Solo monto — vista previa y contacto con Atención al Cliente. */
export function validateGiftCardPayload(input: GiftCardFormInput): {
  ok: true;
  payload: GiftCardCheckoutPayload;
} | { ok: false; error: string } {
  const monto = parseGiftCardAmount(input.amount);
  if (monto == null) {
    return {
      ok: false,
      error: `El monto debe estar entre Q${GIFT_CARD_MIN_GTQ} y Q${GIFT_CARD_MAX_GTQ.toLocaleString('es-GT')}.`,
    };
  }

  return { ok: true, payload: { monto } };
}

/** Para / De opcionales si el código ya fue canjeado (solo volver a ver la tarjeta). */
export function validateGiftCardActivationInput(
  input: GiftCardActivationInput,
  options?: { requireNames?: boolean },
): {
  ok: true;
  payload: GiftCardActivationPayload;
} | { ok: false; error: string } {
  const codigo = String(input.codigo || '').trim().toUpperCase();
  if (!codigo) {
    return { ok: false, error: 'Ingresá el código de activación.' };
  }

  const paraNombre = String(input.forName || '').trim();
  const deNombre = String(input.fromName || '').trim();
  const mensaje = String(input.message || '').trim().slice(0, 150);
  const requireNames = options?.requireNames ?? Boolean(paraNombre || deNombre);

  if (requireNames) {
    if (!paraNombre) {
      return { ok: false, error: 'Indica el nombre y apellido del destinatario.' };
    }
    if (!hasNombreYApellido(paraNombre)) {
      return {
        ok: false,
        error: 'Escribe nombre y apellido del destinatario (ej. María López).',
      };
    }
    if (!deNombre) {
      return { ok: false, error: 'Indica tu nombre y apellido.' };
    }
    if (!hasNombreYApellido(deNombre)) {
      return {
        ok: false,
        error: 'Escribe tu nombre y apellido (ej. Juan Pérez).',
      };
    }
  }

  return {
    ok: true,
    payload: { codigo, paraNombre, deNombre, mensaje },
  };
}
