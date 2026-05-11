import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SESSION = '@appsalon/clientes/demo_session';
const KEY_INTRO = '@appsalon/clientes/demo_intro_done';
const KEY_TOUR = '@appsalon/clientes/demo_tour_done';

/**
 * Sesión demo local (sin backend). Más adante podrás sustituir por Supabase sin cambiar las pantallas.
 * @typedef {{ name: string, email: string, referralCode?: string }} DemoSession
 */

export async function getDemoSession() {
  try {
    const raw = await AsyncStorage.getItem(KEY_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.name === 'string' &&
      typeof parsed.email === 'string'
    ) {
      const base = { name: parsed.name.trim(), email: parsed.email.trim() };
      if (typeof parsed.referralCode === 'string' && parsed.referralCode.trim()) {
        return { ...base, referralCode: parsed.referralCode.trim() };
      }
      return base;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setDemoSession(session) {
  await AsyncStorage.setItem(KEY_SESSION, JSON.stringify(session));
}

export async function getIntroDone() {
  try {
    const v = await AsyncStorage.getItem(KEY_INTRO);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setIntroDone() {
  await AsyncStorage.setItem(KEY_INTRO, '1');
}

export async function getTourDone() {
  try {
    const v = await AsyncStorage.getItem(KEY_TOUR);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setTourDone() {
  await AsyncStorage.setItem(KEY_TOUR, '1');
}

/** Borra sesión demo y flags de onboarding (volver al login). */
export async function clearDemoOnboarding() {
  await AsyncStorage.multiRemove([KEY_SESSION, KEY_INTRO, KEY_TOUR]);
}
