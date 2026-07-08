import { clearGiftCardCheckoutPayload } from '@/components/gift-card/GiftCardCheckoutForm';
import { saveActiveGiftCard } from '@/lib/gift-card/activeGiftCardStorage';

export type RedeemedGiftCard = {
  codigo: string;
  monto_inicial: number;
  para_nombre: string;
  de_nombre: string;
  mensaje: string | null;
  emitida_en: string;
  vence_en: string;
};

export type RedeemActivationResult =
  | { ok: true; card: RedeemedGiftCard; alreadyRedeemed?: boolean }
  | { ok: false; error: string };

/** Canjea ACT-XXXXXX (o recupera tarjeta ya activada). */
export async function redeemGiftCardActivationCode(
  activationCode: string,
): Promise<RedeemActivationResult> {
  const codigo = activationCode.trim().toUpperCase();
  if (!codigo) {
    return { ok: false, error: 'Ingresá el código de activación.' };
  }

  try {
    const res = await fetch('/api/gift-card/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      already_redeemed?: boolean;
      card?: RedeemedGiftCard;
    };

    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'No se pudo activar la tarjeta.' };
    }

    const card = data.card;
    if (!card?.codigo) {
      return { ok: false, error: 'La tarjeta se activó pero no se pudieron cargar los datos.' };
    }

    clearGiftCardCheckoutPayload();
    saveActiveGiftCard(card);

    return {
      ok: true,
      card,
      alreadyRedeemed: Boolean(data.already_redeemed),
    };
  } catch {
    return { ok: false, error: 'Error de conexión. Intentá de nuevo.' };
  }
}

export function giftCardSuccessPath(gcCodigo: string): string {
  return `/tarjeta-regalo/exito/${encodeURIComponent(gcCodigo)}`;
}
