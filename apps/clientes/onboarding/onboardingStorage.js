import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_INTRO = '@appsalon/clientes/intro_done';
const KEY_TOUR = '@appsalon/clientes/tour_done';
const MIGRATED_FLAG = '@appsalon/clientes/storage_migrated_v3';

/** Perfil local / demo (ya no se usa); se borra al migrar. */
const KEY_PROFILE_LEGACY = '@appsalon/clientes/local_profile';
const LEGACY_SESSION = '@appsalon/clientes/demo_session';
const LEGACY_INTRO = '@appsalon/clientes/demo_intro_done';
const LEGACY_TOUR = '@appsalon/clientes/demo_tour_done';

async function migrateLegacyKeysOnce() {
  try {
    const done = await AsyncStorage.getItem(MIGRATED_FLAG);
    if (done === '1') return;
    if ((await AsyncStorage.getItem(LEGACY_INTRO)) === '1' && (await AsyncStorage.getItem(KEY_INTRO)) !== '1') {
      await AsyncStorage.setItem(KEY_INTRO, '1');
    }
    if ((await AsyncStorage.getItem(LEGACY_TOUR)) === '1' && (await AsyncStorage.getItem(KEY_TOUR)) !== '1') {
      await AsyncStorage.setItem(KEY_TOUR, '1');
    }
    await AsyncStorage.multiRemove([
      KEY_PROFILE_LEGACY,
      LEGACY_SESSION,
      LEGACY_INTRO,
      LEGACY_TOUR,
    ]);
    await AsyncStorage.setItem(MIGRATED_FLAG, '1');
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

/** Limpia restos de sesión demo/local al cerrar sesión. */
export async function clearLegacyLocalSession() {
  try {
    await AsyncStorage.removeItem(KEY_PROFILE_LEGACY);
  } catch {
    /* ignore */
  }
}
