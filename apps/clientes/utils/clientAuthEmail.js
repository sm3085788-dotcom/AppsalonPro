import * as Linking from 'expo-linking';
import { supabase } from '@appsalon/shared-config';

/** Debe coincidir con app.json → scheme y Redirect URLs en Supabase. */
export const CLIENT_AUTH_SCHEME = 'appsalonclientes';

export const AUTH_CONFIRM_PATH = 'auth/confirm';

/**
 * URL que Supabase debe permitir en Redirect URLs.
 * En Expo Go (LAN) createURL a veces devuelve solo `exp://IP:8081` sin ruta;
 * forzamos `/--/auth/confirm` para que el enlace del mail abra la app.
 */
export function getEmailRedirectTo() {
  const raw = Linking.createURL(AUTH_CONFIRM_PATH);
  if (/^exp:\/\//i.test(raw)) {
    const base = raw.split('/--/')[0].replace(/\/+$/, '');
    if (raw.includes(`/--/${AUTH_CONFIRM_PATH}`)) {
      return raw;
    }
    return `${base}/--/${AUTH_CONFIRM_PATH}`;
  }
  if (/^appsalonclientes:\/\//i.test(raw) && !raw.includes(AUTH_CONFIRM_PATH)) {
    const base = raw.replace(/\/+$/, '');
    return `${base}/${AUTH_CONFIRM_PATH}`;
  }
  return raw;
}

export function isUserEmailConfirmed(user) {
  if (!user) return false;
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

export function isEmailNotConfirmedError(error) {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return (
    msg.includes('email not confirmed') ||
    msg.includes('correo no confirmado') ||
    msg.includes('not confirmed') ||
    code === 'email_not_confirmed'
  );
}

/** signUp con correo ya registrado: user sin identities y sin error (anti-enumeración). */
export function isSignUpDuplicateEmail(signUpData) {
  const user = signUpData?.user;
  if (!user) return false;
  const identities = user.identities;
  return Array.isArray(identities) && identities.length === 0;
}

export const REGISTER_EMAIL_ACTIVE_TITLE = 'Correo en uso';

export const REGISTER_EMAIL_ACTIVE_MESSAGE =
  'Este correo ya tiene una cuenta activa en Aura Salón. No podés crear otra con otro nombre o contraseña.\n\n' +
  '• Si es tu cuenta: iniciá sesión con la contraseña original.\n' +
  '• Para usar otro nombre o contraseña con el mismo correo: eliminá la cuenta en Perfil → Configuración → Eliminar cuenta.\n' +
  '• Solo cuando la cuenta esté eliminada por completo podrás registrarte de nuevo con ese correo.';

export function isSignUpEmailAlreadyRegisteredError(error) {
  const lower = String(error?.message || '').toLowerCase();
  return (
    lower.includes('already registered') ||
    lower.includes('user already exists') ||
    lower.includes('already been registered')
  );
}

export function translateClientLoginError(error) {
  const msg = String(error?.message || '').toLowerCase();
  if (
    msg.includes('invalid login') ||
    msg.includes('invalid credentials') ||
    msg.includes('wrong password')
  ) {
    return (
      'Correo o contraseña incorrectos. Si este correo ya tiene cuenta activa, usá la contraseña del primer registro. ' +
      'Un segundo intento de registro con otro nombre o contraseña no crea cuenta nueva. ' +
      'Para empezar de cero con el mismo correo, eliminá la cuenta en Perfil → Configuración → Eliminar cuenta.'
    );
  }
  if (isEmailNotConfirmedError(error)) {
    return 'Confirmá tu correo antes de ingresar. Revisá tu bandeja de entrada o spam.';
  }
  return error?.message || 'No se pudo iniciar sesión.';
}

function parseUrlParams(url) {
  const out = {};
  const tryParse = (segment) => {
    if (!segment) return;
    segment.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k && v != null) {
        try {
          out[decodeURIComponent(k)] = decodeURIComponent(v);
        } catch {
          out[k] = v;
        }
      }
    });
  };
  const hash = url.includes('#') ? url.split('#')[1]?.split('?')[0] : '';
  const query = url.includes('?') ? url.split('?').pop()?.split('#')[0] : '';
  tryParse(hash);
  tryParse(query);
  return out;
}

/**
 * Tras tocar el enlace del correo, Supabase redirige con tokens en la URL.
 * @returns {{ session: import('@supabase/supabase-js').Session | null, error: Error | null }}
 */
export async function completeAuthFromRedirectUrl(url) {
  if (!url || typeof url !== 'string') {
    return { session: null, error: null };
  }
  const params = parseUrlParams(url);
  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  const code = params.code;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    return { session: data?.session ?? null, error };
  }

  if (access_token && refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    return { session: data?.session ?? null, error };
  }

  return { session: null, error: null };
}

export async function resendSignupConfirmation(email) {
  const em = String(email || '').trim();
  if (!em) {
    return { error: { message: 'Ingresá tu correo.' } };
  }
  return await supabase.auth.resend({
    type: 'signup',
    email: em,
    options: { emailRedirectTo: getEmailRedirectTo() },
  });
}
