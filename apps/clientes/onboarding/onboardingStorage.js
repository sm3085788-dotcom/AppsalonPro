import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PROFILE = '@appsalon/clientes/local_profile';
const KEY_INTRO = '@appsalon/clientes/intro_done';
const KEY_TOUR = '@appsalon/clientes/tour_done';
const MIGRATED_FLAG = '@appsalon/clientes/storage_migrated_v2';

const LEGACY_SESSION = '@appsalon/clientes/demo_session';
const LEGACY_INTRO = '@appsalon/clientes/demo_intro_done';
const LEGACY_TOUR = '@appsalon/clientes/demo_tour_done';

/**
 * @typedef {{ name: string, email: string, referralCode?: string }} LocalProfile
 */

async function migrateLegacyKeysOnce() {
  try {
    const done = await AsyncStorage.getItem(MIGRATED_FLAG);
    if (done === '1') return;
    const legacySession = await AsyncStorage.getItem(LEGACY_SESSION);
    if (legacySession && !(await AsyncStorage.getItem(KEY_PROFILE))) {
      await AsyncStorage.setItem(KEY_PROFILE, legacySession);
    }
    if ((await AsyncStorage.getItem(LEGACY_INTRO)) === '1' && (await AsyncStorage.getItem(KEY_INTRO)) !== '1') {
      await AsyncStorage.setItem(KEY_INTRO, '1');
    }
    if ((await AsyncStorage.getItem(LEGACY_TOUR)) === '1' && (await AsyncStorage.getItem(KEY_TOUR)) !== '1') {
      await AsyncStorage.setItem(KEY_TOUR, '1');
    }
    await AsyncStorage.multiRemove([LEGACY_SESSION, LEGACY_INTRO, LEGACY_TOUR]);
    await AsyncStorage.setItem(MIGRATED_FLAG, '1');
  } catch {
    /* ignore */
  }
}

export async function getLocalProfile() {
  await migrateLegacyKeysOnce();
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
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

export async function setLocalProfile(profile) {
  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
}

/** Quita solo el perfil guardado en el dispositivo (p. ej. sesión «demo» local), sin borrar intro/tour. */
export async function clearLocalProfile() {
  try {
    await AsyncStorage.removeItem(KEY_PROFILE);
  } catch {
    /* ignore */
  }
}

export async function getIntroDone() {
  await migrateLegacyKeysOnce();
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
  await migrateLegacyKeysOnce();
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

/** Borra perfil local y flags de onboarding (volver al inicio de sesión sin Supabase). */
export async function clearLocalOnboarding() {
  await AsyncStorage.multiRemove([KEY_PROFILE, KEY_INTRO, KEY_TOUR]);
}
