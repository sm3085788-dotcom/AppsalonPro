export const LAST_WEB_ORDER_STORAGE_KEY = 'appsalon_web_last_order_v1';

export type LastWebOrderSession = {
  orderId: string;
  trackingCode?: string | null;
  cash?: boolean;
};

export function saveLastWebOrderSession(payload: LastWebOrderSession): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(LAST_WEB_ORDER_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

export function readLastWebOrderSession(): LastWebOrderSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(LAST_WEB_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastWebOrderSession;
    if (!parsed?.orderId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastWebOrderSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(LAST_WEB_ORDER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
