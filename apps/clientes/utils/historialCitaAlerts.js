import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId) => `andreas_cita_confirmada_alertas_${userId}`;

/**
 * IDs de citas por las que ya se mostró la alerta «confirmada en salón».
 * @param {string} userId auth.users.id
 */
export async function getCitaConfirmadaAlertadas(userId) {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export async function addCitaConfirmadaAlertadas(userId, ids) {
  if (!userId || !ids?.length) return;
  const prev = await getCitaConfirmadaAlertadas(userId);
  const set = new Set([...prev, ...ids.map(String)]);
  await AsyncStorage.setItem(key(userId), JSON.stringify([...set]));
}
