import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncClientNotifPrefsToServer } from '@appsalon/shared-config';

const KEY_PREFIX = '@clientes/notif_prefs_v1/';
const GUEST_KEY = `${KEY_PREFIX}guest`;

export const DEFAULT_CLIENT_NOTIF_PREFS = {
  recordatorios: true,
  promociones: false,
  cambiosAgenda: true,
  mensajes: true,
  pedidos: true,
};

function storageKey(userId) {
  return userId ? `${KEY_PREFIX}${userId}` : GUEST_KEY;
}

export async function loadClientNotifPrefs(userId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const merged = !raw
      ? { ...DEFAULT_CLIENT_NOTIF_PREFS }
      : { ...DEFAULT_CLIENT_NOTIF_PREFS, ...JSON.parse(raw) };
    void syncClientNotifPrefsToServer(userId, merged);
    return merged;
  } catch {
    const fallback = { ...DEFAULT_CLIENT_NOTIF_PREFS };
    void syncClientNotifPrefsToServer(userId, fallback);
    return fallback;
  }
}

export async function saveClientNotifPrefs(userId, prefs) {
  const merged = { ...DEFAULT_CLIENT_NOTIF_PREFS, ...prefs };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(merged));
  void syncClientNotifPrefsToServer(userId, merged);
  return merged;
}
