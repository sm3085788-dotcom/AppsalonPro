import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@appsalon/salon/pending_branch_admin_v1';

/** Longitud del PIN de sucursal (mínimo de Supabase Auth). */
export const BRANCH_PIN_LENGTH = 10;

/** Prefijo E.164 interno GT: +502999xxxxx (no es móvil real; Auth phone como matriz). */
export const BRANCH_LOGIN_PHONE_PREFIX = '+502999';

/** @deprecated Solo fallback cuentas creadas antes del login por teléfono */
export const BRANCH_LOGIN_EMAIL_DOMAIN = 'admin.appsalonpro.local';

/** @typedef {{ sucursalId: string, sucursalNombre: string, loginCodigo: string, loginPhone?: string, adminNombre: string, adminPassword: string }} PendingBranchAdmin */

export function normalizeSucursalCodigo(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/** Código reservado de la fila matriz en BD — no es login de sucursal. */
export const MATRIX_SUCURSAL_CODIGO = 'MATRIZ';

export function isMatrixSucursalCodigo(raw) {
  return normalizeSucursalCodigo(raw) === MATRIX_SUCURSAL_CODIGO;
}

export function matrixLoginHint() {
  return 'La matriz no usa el código MATRIZ. Entrá con tu teléfono +502… y la contraseña de admin global.';
}

/** Teléfono Auth interno por código (mismo algoritmo que branch_login_phone_from_codigo en SQL). */
export function branchLoginPhoneFromCodigo(codigo) {
  const c = normalizeSucursalCodigo(codigo);
  if (!c || !/^[A-Z0-9_-]+$/.test(c)) return null;
  let h = 0;
  for (let i = 0; i < c.length; i += 1) {
    h = (h * 31 + c.charCodeAt(i)) >>> 0;
  }
  const suffix = String(h % 100000).padStart(5, '0');
  return `${BRANCH_LOGIN_PHONE_PREFIX}${suffix}`;
}

/** @deprecated Fallback email legacy */
export function branchLoginEmailFromCodigo(codigo) {
  const c = normalizeSucursalCodigo(codigo).toLowerCase();
  if (!c || !/^[a-z0-9_-]+$/.test(c)) return null;
  return `${c}@${BRANCH_LOGIN_EMAIL_DOMAIN}`;
}

export function resolveBranchLoginPhone(codigo, storedPhone = null) {
  const fromDb = String(storedPhone || '').trim();
  if (fromDb.startsWith('+')) return fromDb;
  return branchLoginPhoneFromCodigo(codigo);
}

/** Validación al crear sucursal (matriz). */
export function validateBranchLoginCodigo(raw, { existingCodigos = [] } = {}) {
  const codigo = normalizeSucursalCodigo(raw);
  if (!codigo) {
    return { ok: false, message: 'Ingresá el código de acceso (ej. NORTE, Z10).' };
  }
  if (!/^[A-Z0-9_-]+$/.test(codigo)) {
    return { ok: false, message: 'Solo letras, números, guion o guion bajo (ej. NORTE, Z10).' };
  }
  if (codigo === MATRIX_SUCURSAL_CODIGO) {
    return {
      ok: false,
      message: 'MATRIZ está reservado para la sede principal. Elegí otro código (ej. NORTE, Z10).',
    };
  }
  if (/^\d+$/.test(codigo) && codigo.length >= 10) {
    return {
      ok: false,
      message: 'No uses un número de teléfono como código. Elegí un alias corto (ej. NORTE).',
    };
  }
  const taken = existingCodigos.map((x) => normalizeSucursalCodigo(x)).filter(Boolean);
  if (taken.includes(codigo)) {
    return { ok: false, message: `El código «${codigo}» ya está en uso por otra sucursal.` };
  }
  return { ok: true, codigo };
}

/** PIN numérico (mínimo exigido por Supabase Auth, normalmente 10). */
export function validateBranchLoginPassword(password, confirmPassword) {
  const pass = String(password || '').replace(/\D/g, '');
  const confirm = String(confirmPassword ?? password ?? '').replace(/\D/g, '');
  if (pass.length !== BRANCH_PIN_LENGTH) {
    return {
      ok: false,
      message: `La contraseña debe ser exactamente ${BRANCH_PIN_LENGTH} números.`,
    };
  }
  if (confirmPassword != null && pass !== confirm) {
    return { ok: false, message: 'La confirmación del PIN no coincide.' };
  }
  return { ok: true, password: pass };
}

export function sanitizeBranchPinInput(text) {
  return String(text || '').replace(/\D/g, '').slice(0, BRANCH_PIN_LENGTH);
}

export function branchLoginPreview(codigo, loginPhone = null) {
  const c = normalizeSucursalCodigo(codigo);
  if (!c) return null;
  return {
    codigo: c,
    loginPhone: resolveBranchLoginPhone(c, loginPhone),
    pinDigits: BRANCH_PIN_LENGTH,
  };
}

/**
 * Matriz: teléfono real (+502…, ≥10 dígitos).
 * Sucursal: código (letras o PIN corto ≤9 dígitos) → teléfono interno +502999…
 */
export function isPhoneLoginInput(raw) {
  const t = String(raw || '').trim();
  if (!t) return false;
  if (/[A-Za-z]/.test(t)) return false;
  if (t.startsWith('+')) {
    if (t.startsWith(BRANCH_LOGIN_PHONE_PREFIX)) return false;
    return true;
  }
  const digits = t.replace(/[\s\-.]/g, '');
  if (!/^\d+$/.test(digits)) return false;
  if (digits.startsWith('502999')) return false;
  if (/^502\d{8}$/.test(digits)) return true;
  if (digits.length >= 10 && digits.length <= 15) return true;
  return false;
}

/** true = login por código de sucursal (teléfono interno), no teléfono matriz */
export function isBranchLoginInput(raw, { forceBranch = false } = {}) {
  if (forceBranch) return true;
  return !isPhoneLoginInput(raw);
}

/** @returns {Promise<PendingBranchAdmin|null>} */
export async function loadPendingBranchAdminSetup() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const loginCodigo = parsed?.loginCodigo || parsed?.adminPhone;
    if (!parsed?.sucursalId || !loginCodigo || !parsed?.adminPassword) return null;
    const codigo = normalizeSucursalCodigo(loginCodigo);
    return {
      sucursalId: parsed.sucursalId,
      sucursalNombre: parsed.sucursalNombre,
      loginCodigo: codigo,
      loginPhone: parsed.loginPhone || branchLoginPhoneFromCodigo(codigo),
      adminNombre: parsed.adminNombre || parsed.sucursalNombre || loginCodigo,
      adminPassword: parsed.adminPassword,
    };
  } catch {
    return null;
  }
}

/** @param {PendingBranchAdmin} payload */
export async function savePendingBranchAdminSetup(payload) {
  const loginCodigo = normalizeSucursalCodigo(payload.loginCodigo);
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify({
      ...payload,
      loginCodigo,
      loginPhone: payload.loginPhone || branchLoginPhoneFromCodigo(loginCodigo),
    }),
  );
}

export async function clearPendingBranchAdminSetup() {
  await AsyncStorage.removeItem(KEY);
}
