export const GIFT_CARD_MIN_GTQ = 50;
export const GIFT_CARD_MAX_GTQ = 2000;
export const GIFT_CARD_PRESETS = [50, 100, 200, 500] as const;

export interface GiftCardFormInput {
  amount: string;
  forName: string;
  fromName: string;
  message: string;
  buyerEmail: string;
}

export interface GiftCardCheckoutPayload {
  monto: number;
  paraNombre: string;
  deNombre: string;
  mensaje: string;
  compradorEmail: string;
}

export function parseGiftCardAmount(raw: string): number | null {
  const n = Number(String(raw || '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  if (rounded < GIFT_CARD_MIN_GTQ || rounded > GIFT_CARD_MAX_GTQ) return null;
  return rounded;
}

export function validateGiftCardPayload(input: GiftCardFormInput): {
  ok: true;
  payload: GiftCardCheckoutPayload;
} | { ok: false; error: string } {
  const monto = parseGiftCardAmount(input.amount);
  if (monto == null) {
    return {
      ok: false,
      error: `El monto debe estar entre Q${GIFT_CARD_MIN_GTQ} y Q${GIFT_CARD_MAX_GTQ}.`,
    };
  }

  const paraNombre = String(input.forName || '').trim();
  const deNombre = String(input.fromName || '').trim();
  const compradorEmail = String(input.buyerEmail || '').trim().toLowerCase();
  const mensaje = String(input.message || '').trim().slice(0, 150);

  if (!paraNombre) return { ok: false, error: 'Indica el nombre del destinatario.' };
  if (!deNombre) return { ok: false, error: 'Indica tu nombre.' };
  if (!compradorEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(compradorEmail)) {
    return { ok: false, error: 'Ingresa un correo válido para el recibo.' };
  }

  return {
    ok: true,
    payload: { monto, paraNombre, deNombre, mensaje, compradorEmail },
  };
}
