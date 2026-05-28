import { Platform } from 'react-native';
import { supabase } from './supabaseClient.js';

/** Registra token Expo push (App Clientes o App Salón). */
export async function upsertPushDeviceToken(userId, expoPushToken, appSlug) {
  if (!userId || !expoPushToken || !appSlug) return { error: null };
  const { error } = await supabase.from('push_device_tokens').upsert(
    {
      user_id: userId,
      app_slug: appSlug,
      expo_push_token: expoPushToken,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,app_slug,expo_push_token' },
  );
  return { error };
}
