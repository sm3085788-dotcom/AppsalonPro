import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, isSalonAdminRole, isSalonSucursalAdmin, setSalonSessionProfile } from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury';
import {
  loadPendingBranchAdminSetup,
  clearPendingBranchAdminSetup,
  branchLoginEmailFromCodigo,
  resolveBranchLoginPhone,
  isPhoneLoginInput,
  isBranchLoginInput,
  normalizeSucursalCodigo,
  validateBranchLoginPassword,
  sanitizeBranchPinInput,
  BRANCH_PIN_LENGTH,
  isMatrixSucursalCodigo,
  matrixLoginHint,
} from '../services/branchAdminSetup';

const hasSupabaseEnv = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim(),
);

function normalizePhoneForAuth(raw) {
  let t = String(raw || '').trim().replace(/[\s\-.]/g, '');
  if (!t) return '';
  if (t.startsWith('00')) t = `+${t.slice(2)}`;
  if (!t.startsWith('+') && /^\d{10,15}$/.test(t)) {
    if (t.startsWith('502') && t.length >= 11) t = `+${t}`;
  }
  return t;
}

async function signInSalonAdmin(loginRaw, password, { forceBranch = false, branchLoginPhone = null } = {}) {
  if (!isBranchLoginInput(loginRaw, { forceBranch })) {
    const phone = normalizePhoneForAuth(loginRaw);
    if (!phone?.startsWith('+')) {
      return { data: null, error: { message: 'Teléfono con código de país (ej. +50257199107).' } };
    }
    return db.auth.signInWithPassword({ phone, password });
  }
  const phone = resolveBranchLoginPhone(loginRaw, branchLoginPhone);
  const legacyEmail = branchLoginEmailFromCodigo(loginRaw);
  if (phone) {
    const byPhone = await db.auth.signInWithPassword({ phone, password });
    if (!byPhone.error) return byPhone;
    if (legacyEmail) {
      const byEmail = await db.auth.signInWithPassword({ email: legacyEmail, password });
      if (!byEmail.error) return byEmail;
    }
    return byPhone;
  }
  if (legacyEmail) {
    return db.auth.signInWithPassword({ email: legacyEmail, password });
  }
  return { data: null, error: { message: 'Código de sucursal inválido (ej. NORTE, Z10).' } };
}

async function resolveBranchContext(loginRaw, branchSetup) {
  const loginCodigo = normalizeSucursalCodigo(branchSetup?.loginCodigo || loginRaw);
  if (branchSetup?.sucursalId) {
    return {
      loginCodigo,
      sucursalId: branchSetup.sucursalId,
      loginPhone: branchSetup.loginPhone || resolveBranchLoginPhone(loginCodigo),
    };
  }
  const { data } = await db.sucursales.listActivas();
  const row = (data || []).find((s) => normalizeSucursalCodigo(s.codigo) === loginCodigo);
  return {
    loginCodigo,
    sucursalId: row?.id ? String(row.id) : null,
    loginPhone: row?.login_phone || resolveBranchLoginPhone(loginCodigo),
  };
}

async function signUpBranchAdmin({ loginCodigo, loginPhone, password, meta }) {
  const phone = resolveBranchLoginPhone(loginCodigo, loginPhone);
  if (!phone) {
    return { data: null, error: { message: 'Código de sucursal inválido.' } };
  }
  const byPhone = await db.auth.signUpWithPhone({ phone, password, metadata: meta });
  if (!byPhone.error) return byPhone;
  const legacyEmail = branchLoginEmailFromCodigo(loginCodigo);
  if (legacyEmail) {
    return db.auth.signUp(legacyEmail, password, meta);
  }
  return byPhone;
}

function translateAuthError(err) {
  const msg = String(err?.message || '');
  const lower = msg.toLowerCase();
  if (lower.includes('at least') && lower.includes('10')) {
    return 'Supabase exige contraseña de al menos 10 caracteres. Usá una más larga o bajá el mínimo en Authentication → Settings (mínimo 6).';
  }
  if (lower.includes('at least') && lower.includes('6')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return msg || 'No se pudo completar la operación.';
}

async function loadProfileAfterSignIn(userId, { retries = 6 } = {}) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const { data: sessionData } = await db.auth.getSession();
    const uid = userId ?? sessionData?.session?.user?.id;
    if (!uid) return { profile: null, error: { message: 'Sesión no disponible.' } };

    let result = await db.profiles.getCurrentProfile();
    if (result.data) return { profile: result.data, error: null };

    result = await db.profiles.getById(uid);
    if (result.data) return { profile: result.data, error: null };

    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    } else {
      return { profile: null, error: result.error };
    }
  }
  return { profile: null, error: { message: 'No se pudo leer el perfil.' } };
}

const SQL_FINALIZE_HINT =
  'En Supabase: SQL Editor → pegá y ejecutá el archivo supabase-branch-admin-finalize.sql del proyecto → Run. Luego tocá «Entrar» (la cuenta ya puede existir).';

function profileMatchesBranch(profile, expectedSucursalId) {
  if (!profile || !isSalonAdminRole(profile.role)) return false;
  if (isSalonSucursalAdmin(profile.role)) {
    if (!profile.sucursal_id) return false;
    if (expectedSucursalId && String(profile.sucursal_id) !== String(expectedSucursalId)) return false;
  }
  return true;
}

async function finalizeBranchProfile(expectedSucursalId) {
  const { data, error } = await db.profiles.finalizeBranchAdminSignup();
  if (error) {
    const msg = String(error.message || '');
    if (/finalize_branch_admin_signup|function.*does not exist|could not find the function/i.test(msg)) {
      return { ok: false, message: SQL_FINALIZE_HINT };
    }
    return { ok: false, message: msg || 'No se pudo vincular la sucursal al perfil.' };
  }
  const profile = data;
  if (expectedSucursalId && String(profile?.sucursal_id) !== String(expectedSucursalId)) {
    return {
      ok: false,
      message: 'La cuenta no quedó vinculada a la sucursal correcta. Revisá el código e intentá de nuevo.',
    };
  }
  if (!isSalonAdminRole(profile?.role)) {
    return { ok: false, message: `Rol inválido (${profile?.role || '—'}). Contactá a matriz.` };
  }
  setSalonSessionProfile(profile);
  return { ok: true, profile };
}

/** Tras signIn/signUp sucursal: perfil OK, RPC finalize, o error claro. */
async function completeBranchSession(userId, expectedSucursalId) {
  const { profile: initial } = await loadProfileAfterSignIn(userId);
  if (profileMatchesBranch(initial, expectedSucursalId)) {
    setSalonSessionProfile(initial);
    return { ok: true };
  }

  const fin = await finalizeBranchProfile(expectedSucursalId);
  if (fin.ok) return { ok: true };

  const { profile: after } = await loadProfileAfterSignIn(userId);
  if (profileMatchesBranch(after, expectedSucursalId)) {
    setSalonSessionProfile(after);
    return { ok: true };
  }

  await db.auth.signOut();
  return { ok: false, message: fin.message || SQL_FINALIZE_HINT };
}

async function ensureAdminProfile(userId, { expectedSucursalId } = {}) {
  const { profile, error: pErr } = await loadProfileAfterSignIn(userId);
  if (!profile) {
    await db.auth.signOut();
    const detail = pErr?.message ? ` (${pErr.message})` : '';
    return {
      ok: false,
      message: `No se pudo leer profiles para id ${userId ?? '—'}.${detail}`,
    };
  }
  if (!isSalonAdminRole(profile.role)) {
    await db.auth.signOut();
    return {
      ok: false,
      message: `Tu profiles.role es "${profile.role}". Para la app salón debe ser admin, admin_global o admin_sucursal.`,
    };
  }
  if (isSalonSucursalAdmin(profile.role) && !profile.sucursal_id) {
    await db.auth.signOut();
    return {
      ok: false,
      message: 'Tu perfil admin_sucursal debe tener sucursal_id en profiles.',
    };
  }
  if (expectedSucursalId && String(profile.sucursal_id) !== String(expectedSucursalId)) {
    await db.auth.signOut();
    return {
      ok: false,
      message:
        'La cuenta no quedó vinculada a la sucursal. Ejecutá supabase-sucursales-admin-trigger.sql en Supabase y volvé a intentar.',
    };
  }
  setSalonSessionProfile(profile);
  return { ok: true };
}

function isAlreadyRegisteredError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('already registered') || msg.includes('user already exists') || msg.includes('already been registered');
}

function isEmailNotConfirmedError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('email not confirmed') || msg.includes('not confirmed') || msg.includes('confirm your email');
}

function isInvalidCredentialsError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password');
}

function branchCredentialsHint() {
  return `Verificá código + PIN de ${BRANCH_PIN_LENGTH} números. Si la activaste antes del cambio a teléfono, probá «Entrar» de nuevo tras ejecutar supabase-branch-admin-finalize.sql en Supabase.`;
}

const EMAIL_CONFIRM_HINT =
  'Supabase exige confirmar el email y las cuentas de sucursal usan un correo interno. En Supabase → Authentication → Providers → Email, desactivá «Confirm email» y volvé a intentar.';

export function SalonAdminSignInScreen({ onSignedIn, initialError }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loginRaw, setLoginRaw] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(initialError ?? null);
  const [branchSetup, setBranchSetup] = useState(null);
  const [setupReady, setSetupReady] = useState(false);
  const styles = useMemo(() => createStyles(c), [c]);
  /** Teléfono +502… = matriz; alias corto = sucursal (aunque haya banner de activación pendiente). */
  const isBranchLogin = !isPhoneLoginInput(loginRaw);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pending = await loadPendingBranchAdminSetup();
      if (cancelled) return;
      if (pending) {
        setBranchSetup(pending);
        setLoginRaw(pending.loginCodigo);
        const pass = String(pending.adminPassword || '');
        setPassword(pass.length === BRANCH_PIN_LENGTH ? pass : '');
      }
      setSetupReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchToMatrixLogin = async () => {
    await clearPendingBranchAdminSetup();
    setBranchSetup(null);
    setLoginRaw('');
    setPassword('');
    setErr(null);
  };

  const submitLogin = async () => {
    setErr(null);
    if (!hasSupabaseEnv) {
      setErr('Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en apps/salon/.env');
      return;
    }
    if (!String(loginRaw || '').trim()) {
      setErr('Ingresá el código de sucursal o teléfono de matriz.');
      return;
    }
    if (!password) {
      setErr('Ingresá la contraseña.');
      return;
    }
    if (isMatrixSucursalCodigo(loginRaw)) {
      setErr(matrixLoginHint());
      return;
    }
    if (isBranchLogin) {
      const pinCheck = validateBranchLoginPassword(password);
      if (!pinCheck.ok) {
        setErr(pinCheck.message);
        return;
      }
    }

    setBusy(true);
    try {
      const pass = isBranchLogin ? validateBranchLoginPassword(password).password : password;

      const branchCtx = isBranchLogin
        ? await resolveBranchContext(loginRaw, branchSetup)
        : null;

      const signInOpts = branchCtx
        ? { forceBranch: true, branchLoginPhone: branchCtx.loginPhone }
        : {};

      const { data: signData, error: signErr } = await signInSalonAdmin(
        branchCtx?.loginCodigo || loginRaw,
        pass,
        signInOpts,
      );
      if (signErr) {
        if (isEmailNotConfirmedError(signErr)) {
          setErr(EMAIL_CONFIRM_HINT);
        } else if (isInvalidCredentialsError(signErr) && branchCtx) {
          setErr(`${translateAuthError(signErr)}\n\n${branchCredentialsHint()}`);
        } else {
          setErr(translateAuthError(signErr));
        }
        return;
      }

      if (branchCtx) {
        const done = await completeBranchSession(signData?.user?.id, branchCtx.sucursalId);
        if (!done.ok) {
          setErr(done.message);
          return;
        }
        if (branchSetup) await clearPendingBranchAdminSetup();
        setBranchSetup(null);
        onSignedIn?.();
        return;
      }

      const gate = await ensureAdminProfile(signData?.user?.id);
      if (!gate.ok) {
        setErr(gate.message);
        return;
      }
      onSignedIn?.();
    } catch (e) {
      setErr(e?.message || 'Error de red');
    } finally {
      setBusy(false);
    }
  };

  const submitBranchSetup = async () => {
    if (!branchSetup) return submitLogin();
    setErr(null);
    const loginCodigo = normalizeSucursalCodigo(branchSetup.loginCodigo || loginRaw);
    if (!resolveBranchLoginPhone(loginCodigo, branchSetup.loginPhone)) {
      setErr('Código de sucursal inválido.');
      return;
    }
    const pinCheck = validateBranchLoginPassword(password);
    if (!pinCheck.ok) {
      setErr(pinCheck.message);
      return;
    }

    setBusy(true);
    try {
      const meta = {
        full_name: branchSetup.adminNombre,
        admin_sucursal_id: branchSetup.sucursalId,
        branch_codigo: loginCodigo,
      };

      // 1) Si la cuenta ya existe, entrar directo
      const existing = await signInSalonAdmin(loginCodigo, pinCheck.password, {
        forceBranch: true,
        branchLoginPhone: branchSetup.loginPhone,
      });
      if (existing.data?.user?.id && !existing.error) {
        const done = await completeBranchSession(existing.data.user.id, branchSetup.sucursalId);
        if (!done.ok) {
          setErr(done.message);
          return;
        }
        await clearPendingBranchAdminSetup();
        setBranchSetup(null);
        onSignedIn?.();
        return;
      }
      if (existing.error && !isInvalidCredentialsError(existing.error) && !isEmailNotConfirmedError(existing.error)) {
        setErr(existing.error.message || 'No se pudo verificar la cuenta.');
        return;
      }
      if (existing.error && isEmailNotConfirmedError(existing.error)) {
        setErr(EMAIL_CONFIRM_HINT);
        return;
      }

      // 2) Crear cuenta nueva
      const { data: signUpData, error: signUpErr } = await signUpBranchAdmin({
        loginCodigo,
        loginPhone: branchSetup.loginPhone,
        password: pinCheck.password,
        meta,
      });

      if (signUpErr && !isAlreadyRegisteredError(signUpErr)) {
        setErr(translateAuthError(signUpErr));
        return;
      }

      let sessionUserId = signUpData?.session?.user?.id || signUpData?.user?.id;

      if (!sessionUserId || signUpErr) {
        const retrySignIn = await signInSalonAdmin(loginCodigo, pinCheck.password, {
          forceBranch: true,
          branchLoginPhone: branchSetup.loginPhone,
        });
        if (retrySignIn.error) {
          if (isEmailNotConfirmedError(retrySignIn.error)) {
            setErr(EMAIL_CONFIRM_HINT);
          } else if (isAlreadyRegisteredError(signUpErr) || isInvalidCredentialsError(retrySignIn.error)) {
            setErr('Ese código ya tiene cuenta pero la contraseña no coincide con la que usaste al crear la sucursal.');
          } else {
            setErr(translateAuthError(retrySignIn.error));
          }
          return;
        }
        sessionUserId = retrySignIn.data?.user?.id;
      }

      const done = await completeBranchSession(sessionUserId, branchSetup.sucursalId);
      if (!done.ok) {
        setErr(done.message);
        return;
      }

      await clearPendingBranchAdminSetup();
      setBranchSetup(null);
      onSignedIn?.();
    } catch (e) {
      setErr(e?.message || 'Error de red');
    } finally {
      setBusy(false);
    }
  };

  const dismissBranchSetup = async () => {
    await clearPendingBranchAdminSetup();
    setBranchSetup(null);
    setErr(null);
  };

  if (!setupReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <Text style={styles.title}>App Andrea Control</Text>
        {branchSetup ? (
          <View style={[styles.setupBanner, { backgroundColor: c.surfaceMuted, borderColor: c.cardBorder }]}>
            <Text style={[styles.setupBannerTitle, { color: c.foreground }]}>
              Activar sucursal: {branchSetup.sucursalNombre}
            </Text>
            <Text style={[styles.setupBannerTxt, { color: c.foregroundMuted }]}>
              Código {branchSetup.loginCodigo} y PIN de {BRANCH_PIN_LENGTH} números (definido en matriz). Primera vez:
              «Activar sucursal». Si ya activaste, «Entrar».
            </Text>
          </View>
        ) : (
          <Text style={[styles.lead, { color: c.foregroundMuted }]}>
            Sucursal: código (ej. NORTE) + PIN de {BRANCH_PIN_LENGTH} números. Matriz: teléfono +502… + contraseña.
          </Text>
        )}

        <Text style={styles.label}>{isBranchLogin ? 'Código de sucursal' : 'Código de sucursal o teléfono (matriz)'}</Text>
        <TextInput
          style={[styles.input, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
          placeholder={isBranchLogin ? 'Ej. NORTE' : 'NORTE o +50257199107'}
          placeholderTextColor={c.foregroundSubtle}
          value={loginRaw}
          onChangeText={setLoginRaw}
          autoCapitalize={isBranchLogin ? 'characters' : 'none'}
          autoCorrect={false}
          keyboardType={isBranchLogin ? 'default' : 'phone-pad'}
          editable={!busy}
        />

        <Text style={styles.label}>{isBranchLogin ? `PIN (${BRANCH_PIN_LENGTH} números)` : 'Contraseña'}</Text>
        <TextInput
          style={[styles.input, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
          placeholder={isBranchLogin ? `${BRANCH_PIN_LENGTH} números` : 'Contraseña matriz'}
          placeholderTextColor={c.foregroundSubtle}
          value={password}
          onChangeText={(t) => setPassword(isBranchLogin ? sanitizeBranchPinInput(t) : t)}
          secureTextEntry
          keyboardType={isBranchLogin ? 'number-pad' : 'default'}
          maxLength={isBranchLogin ? BRANCH_PIN_LENGTH : undefined}
          editable={!busy}
        />

        {err ? (
          <Text style={[styles.err, { color: c.foregroundMuted }]} accessibilityLiveRegion="polite">
            {err}
          </Text>
        ) : null}

        {busy ? (
          <ActivityIndicator style={{ marginTop: spacing.md }} color={c.primary} />
        ) : branchSetup ? (
          <>
            <SalonButton
              title="Activar sucursal"
              variant="heroGold"
              fullWidth
              onPress={submitBranchSetup}
              style={{ marginTop: spacing.lg }}
            />
            <SalonButton
              title="Entrar"
              variant="outlineGold"
              fullWidth
              onPress={submitLogin}
              style={{ marginTop: spacing.sm }}
            />
            <Text style={[styles.hintLink, { color: c.foregroundMuted }]}>
              ¿Ya activaste? Usá «Entrar» con el mismo código y PIN de {BRANCH_PIN_LENGTH} números.
            </Text>
            <SalonButton
              title="Quitar banner de activación"
              variant="outlineGray"
              fullWidth
              onPress={dismissBranchSetup}
              style={{ marginTop: spacing.sm }}
            />
            <SalonButton
              title="Entrar como matriz (+502…)"
              variant="outlineGold"
              fullWidth
              onPress={switchToMatrixLogin}
              style={{ marginTop: spacing.sm }}
            />
          </>
        ) : (
          <SalonButton
            title="Entrar"
            variant="heroGold"
            fullWidth
            onPress={submitLogin}
            style={{ marginTop: spacing.lg }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1 },
    scrollView: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: spacing.lg },
    title: {
      fontFamily: typography.fontDisplay,
      fontSize: 26,
      color: c.foreground,
      marginBottom: spacing.sm,
    },
    lead: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: spacing.xl,
    },
    setupBanner: {
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    setupBannerTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      marginBottom: spacing.xs,
    },
    setupBannerTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
    },
    label: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    input: {
      fontFamily: typography.fontSans,
      fontSize: 16,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    err: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginTop: spacing.sm,
    },
    hintLink: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  });
}
