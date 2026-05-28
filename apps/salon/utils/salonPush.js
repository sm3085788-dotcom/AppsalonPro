import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { upsertPushDeviceToken } from '@appsalon/shared-config';

const APP_SLUG = 'salon';
const PROMPT_KEY_PREFIX = '@salon/push_prompt_v1/';

let handlerConfigured = false;

export function configureSalonPushHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function promptStorageKey(userId) {
  return `${PROMPT_KEY_PREFIX}${userId || 'guest'}`;
}

/** Diálogo nativo del sistema (una vez por usuario staff). */
export async function promptSalonPushPermissions(userId, { force = false } = {}) {
  configureSalonPushHandler();
  if (!userId) return { token: null, error: null };

  const key = promptStorageKey(userId);
  const alreadyAsked = await AsyncStorage.getItem(key);
  if (!force && alreadyAsked === '1') {
    return registerSalonPushNotifications(userId);
  }

  const { status: before } = await Notifications.getPermissionsAsync();
  if (before !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
  await AsyncStorage.setItem(key, '1');
  return registerSalonPushNotifications(userId);
}

export async function registerSalonPushNotifications(userId) {
  configureSalonPushHandler();
  if (!userId) return { token: null, error: null };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'AppSalon Gestión',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return { token: null, error: { message: 'Permisos de notificación denegados' } };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.projectId;

  try {
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const { error } = await upsertPushDeviceToken(userId, res.data, APP_SLUG);
    return { token: res.data, error };
  } catch (e) {
    return { token: null, error: e };
  }
}

export async function showLocalSalonNotification({ title, body, data = {} }) {
  configureSalonPushHandler();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return { ok: false };

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'AppSalon Pro',
        body: body || '',
        data,
        sound: true,
      },
      trigger: null,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
