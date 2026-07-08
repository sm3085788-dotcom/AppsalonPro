import type { RedeemedGiftCard } from '@/lib/gift-card/redeemActivationCode';

const STORAGE_KEY = 'appsalon_gift_card_active';

export function saveActiveGiftCard(card: RedeemedGiftCard): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(card));
  } catch {
    /* quota / private mode */
  }
}

export function loadActiveGiftCard(): RedeemedGiftCard | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RedeemedGiftCard;
    if (!parsed?.codigo) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveGiftCard(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
