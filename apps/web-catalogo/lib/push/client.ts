'use client';

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

async function resolveVapidPublicKey(): Promise<string> {
  const fromEnv = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim();
  if (fromEnv) return fromEnv;

  const res = await fetch('/api/push/subscribe');
  const json = (await res.json()) as { publicKey?: string | null };
  const key = String(json.publicKey || '').trim();
  if (!key) {
    throw new Error('Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID.');
  }
  return key;
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeWebPush(): Promise<PushSubscription> {
  if (!isWebPushSupported()) {
    throw new Error('Este navegador no soporta notificaciones push.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado.');
  }

  const publicKey = await resolveVapidPublicKey();
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
}

export async function unsubscribeWebPush(): Promise<boolean> {
  const sub = await getExistingPushSubscription();
  if (!sub) return true;
  return sub.unsubscribe();
}

export function subscriptionToPayload(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint || sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
    },
  };
}
