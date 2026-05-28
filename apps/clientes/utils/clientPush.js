import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { upsertPushDeviceToken } from '@appsalon/shared-config';

const APP_SLUG = 'clientes';
const ANDROID_CHANNEL_ID = 'mensajes_clientes';

const PROMPT_KEY_PREFIX = '@clientes/push_prompt_v1/';

let handlerConfigured = false;

export function configureClientPushHandler() {
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

/**
 * Una vez por usuario: diálogo nativo del sistema (como al instalar otras apps).
 */
export async function promptClientPushPermissions(userId, { force = false } = {}) {
  configureClientPushHandler();
  if (!userId) return { token: null, error: null };

  const key = promptStorageKey(userId);
  const alreadyAsked = await AsyncStorage.getItem(key);

  if (!force && alreadyAsked === '1') {
    return registerClientPushNotifications(userId);
  }

  const { status: before } = await Notifications.getPermissionsAsync();
  if (before !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
  await AsyncStorage.setItem(key, '1');
  return registerClientPushNotifications(userId);
}

/**
 * Aviso en la bandeja del teléfono sin Edge Function (app en 1er o 2do plano).
 */
export async function showLocalClientNotification({ title, body, data = {} }) {
  configureClientPushHandler();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return { ok: false };

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'Andreas Pro',
        body: body || '',
        data,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function registerClientPushNotifications(userId) {
  configureClientPushHandler();
  if (!userId) return { token: null, error: null };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Mensajes Andreas Pro',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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

  let expoPushToken;
  try {
    const res = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    expoPushToken = res.data;
  } catch (e) {
    return { token: null, error: e };
  }

  const { error } = await upsertPushDeviceToken(userId, expoPushToken, APP_SLUG);
  return { token: expoPushToken, error };
}

export function addClientPushResponseListener(onOpen) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    onOpen?.(data);
  });
  return () => sub.remove();
}

export function addClientPushReceivedListener(onReceive) {
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    onReceive?.(notification?.request?.content?.data || {});
  });
  return () => sub.remove();
}
