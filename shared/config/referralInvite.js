import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

export const REFERRAL_PENDING_STORAGE_KEY = '@appsalon/referral_pending_code';
export const REFERRAL_LINK_PATH = 'invite';

/** Mismo algoritmo que Supabase `codigo_referido_from_user_id` y Premios. */
export function buildDefaultCodigoReferido(userId) {
  const raw = String(userId || '').replace(/-/g, '');
  if (raw.length < 8) return `ANDREAS-${String(userId).slice(0, 12).toUpperCase()}`;
  const mid = `${raw.slice(0, 6)}${raw.slice(-6)}`.toUpperCase();
  return `ANDREAS-${mid}`;
}

export function normalizeReferralCode(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  return s.replace(/\s+/g, '');
}

export function isAndreasReferralCode(value) {
  return /^ANDREAS-[A-Z0-9]{6,32}$/.test(normalizeReferralCode(value));
}

/** Enlace profundo: appsalonclientes://invite?ref=ANDREAS-… (no usamos `code` — lo reserva Supabase Auth). */
export function buildReferralInviteUrl(codigo) {
  const c = normalizeReferralCode(codigo);
  if (!isAndreasReferralCode(c)) return null;
  return Linking.createURL(REFERRAL_LINK_PATH, { queryParams: { ref: c } });
}

export function parseReferralCodeFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = Linking.parse(url);
    const path = String(parsed.path || '').replace(/^\/+/, '');
    if (path.toLowerCase().startsWith(`${REFERRAL_LINK_PATH}/`)) {
      const segment = path.slice(REFERRAL_LINK_PATH.length + 1).split('/')[0];
      if (isAndreasReferralCode(segment)) return normalizeReferralCode(segment);
    }
    if (path.toLowerCase() === REFERRAL_LINK_PATH) {
      const ref = parsed.queryParams?.ref;
      if (ref && isAndreasReferralCode(ref)) return normalizeReferralCode(ref);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isAuthRedirectUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /access_token|refresh_token|type=signup|auth\/confirm/i.test(url);
}

export async function storePendingReferralCode(code) {
  const c = normalizeReferralCode(code);
  if (!isAndreasReferralCode(c)) return;
  await AsyncStorage.setItem(REFERRAL_PENDING_STORAGE_KEY, c);
}

export async function peekPendingReferralCode() {
  const raw = await AsyncStorage.getItem(REFERRAL_PENDING_STORAGE_KEY);
  const c = normalizeReferralCode(raw);
  return isAndreasReferralCode(c) ? c : '';
}

export async function consumePendingReferralCode() {
  const c = await peekPendingReferralCode();
  if (c) await AsyncStorage.removeItem(REFERRAL_PENDING_STORAGE_KEY);
  return c;
}

export function getReferralCodeFromUserMetadata(user) {
  const md = user?.user_metadata || {};
  const raw = md.referral_code || md.referralCode || '';
  const c = normalizeReferralCode(raw);
  return isAndreasReferralCode(c) ? c : '';
}

/** Prioridad: explícito → metadata Auth → AsyncStorage (deep link). */
export async function resolveReferralCodeForAuth(user, explicitCode) {
  const fromExplicit = normalizeReferralCode(explicitCode);
  if (isAndreasReferralCode(fromExplicit)) return fromExplicit;
  const fromMeta = getReferralCodeFromUserMetadata(user);
  if (fromMeta) return fromMeta;
  return await peekPendingReferralCode();
}

export function buildReferralShareMessage(codigo, prizeTitle) {
  const c = normalizeReferralCode(codigo);
  const url = buildReferralInviteUrl(c);
  const prize = prizeTitle ? ` Premio actual: ${prizeTitle}.` : '';
  let msg =
    `¡Te invito a Salon Andreas! Descargá la app de clientes, creá tu cuenta verificada y usá mi código ${c}.` +
    ` Programa ANDREAS: con 3 referidos verificados (primera compra entregada en salón o primera cita confirmada) ganás beneficios exclusivos.${prize}`;
  if (url) {
    msg += `\n\nAbrí este enlace al registrarte:\n${url}`;
  }
  return msg;
}
