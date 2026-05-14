import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@clientes/notif_prefs_v1/';
const GUEST_KEY = `${KEY_PREFIX}guest`;

export const DEFAULT_CLIENT_NOTIF_PREFS = {
  recordatorios: true,
  promociones: false,
  cambiosAgenda: true,
  mensajes: true,
};

function storageKey(userId) {
  return userId ? `${KEY_PREFIX}${userId}` : GUEST_KEY;
}

export async function loadClientNotifPrefs(userId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_CLIENT_NOTIF_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CLIENT_NOTIF_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_CLIENT_NOTIF_PREFS };
  }
}

export async function saveClientNotifPrefs(userId, prefs) {
  const merged = { ...DEFAULT_CLIENT_NOTIF_PREFS, ...prefs };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(merged));
  return merged;
}
