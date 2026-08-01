import { env, isWebPushConfigured } from '@/lib/env';

export function getVapidPublicKey(): string | null {
  return env.vapidPublicKey || null;
}

export function assertWebPushServerConfig() {
  if (!isWebPushConfigured) {
    throw new Error(
      'Web Push no configurado (NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY).',
    );
  }
}

/** Convierte clave VAPID base64 URL-safe a Uint8Array (PushManager.subscribe). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}
