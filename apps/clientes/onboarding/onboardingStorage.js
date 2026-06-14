import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_INTRO_LEGACY = '@appsalon/clientes/intro_done';
const KEY_TOUR_LEGACY = '@appsalon/clientes/tour_done';
const PENDING_ONBOARDING_EMAIL = '@appsalon/clientes/pending_onboarding_email';
const MIGRATED_FLAG = '@appsalon/clientes/storage_migrated_v3';

const KEY_PROFILE_LEGACY = '@appsalon/clientes/local_profile';
const LEGACY_SESSION = '@appsalon/clientes/demo_session';
const LEGACY_INTRO = '@appsalon/clientes/demo_intro_done';
const LEGACY_TOUR = '@appsalon/clientes/demo_tour_done';

function introKey(userId) {
  return userId ? `@appsalon/clientes/intro_done_${userId}` : KEY_INTRO_LEGACY;
}

function tourKey(userId) {
  return userId ? `@appsalon/clientes/tour_done_${userId}` : KEY_TOUR_LEGACY;
}

function normEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function migrateLegacyKeysOnce() {
  try {
    const done = await AsyncStorage.getItem(MIGRATED_FLAG);
    if (done === '1') return;
    await AsyncStorage.multiRemove([
      KEY_PROFILE_LEGACY,
      LEGACY_SESSION,
      LEGACY_INTRO,
      LEGACY_TOUR,
      KEY_INTRO_LEGACY,
      KEY_TOUR_LEGACY,
    ]);
    await AsyncStorage.setItem(MIGRATED_FLAG, '1');
  } catch {
    /* ignore */
  }
}

export async function getIntroDone(userId) {
  await migrateLegacyKeysOnce();
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(introKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function setIntroDone(userId) {
  if (!userId) return;
  await AsyncStorage.setItem(introKey(userId), '1');
}

export async function getTourDone(userId) {
  await migrateLegacyKeysOnce();
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(tourKey(userId))) === '1';
  } catch {
    return false;
  }
}

export async function setTourDone(userId) {
  if (!userId) return;
  await AsyncStorage.setItem(tourKey(userId), '1');
}

export async function resetOnboardingForUser(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.multiRemove([introKey(userId), tourKey(userId)]);
  } catch {
    /* ignore */
  }
}

/** Registro sin sesión inmediata: al iniciar sesión con este correo → bienvenida + tour. */
export async function markPendingOnboardingEmail(email) {
  const em = normEmail(email);
  if (!em) return;
  await AsyncStorage.setItem(PENDING_ONBOARDING_EMAIL, em);
}

export async function peekPendingOnboardingEmail(email) {
  const em = normEmail(email);
  if (!em) return false;
  try {
    return (await AsyncStorage.getItem(PENDING_ONBOARDING_EMAIL)) === em;
  } catch {
    return false;
  }
}

export async function consumePendingOnboardingEmail(email) {
  const em = normEmail(email);
  if (!em) return false;
  try {
    const stored = await AsyncStorage.getItem(PENDING_ONBOARDING_EMAIL);
    if (stored === em) {
      await AsyncStorage.removeItem(PENDING_ONBOARDING_EMAIL);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function pendingOnboardingUserKey(userId) {
  return `@appsalon/clientes/pending_onboarding_uid_${userId}`;
}

/** Cuenta recién creada (con user_id): forzar bienvenida aunque onAuthStateChange corra antes. */
export async function markPendingOnboardingUserId(userId) {
  if (!userId) return;
  await AsyncStorage.setItem(pendingOnboardingUserKey(userId), '1');
}

export async function consumePendingOnboardingUserId(userId) {
  if (!userId) return false;
  try {
    const k = pendingOnboardingUserKey(userId);
    if ((await AsyncStorage.getItem(k)) === '1') {
      await AsyncStorage.removeItem(k);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export async function clearLegacyLocalSession() {
  try {
    await AsyncStorage.removeItem(KEY_PROFILE_LEGACY);
  } catch {
    /* ignore */
  }
}
