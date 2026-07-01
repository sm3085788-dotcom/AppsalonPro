import { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  supabase,
  db,
  normalizeReferralCode,
  peekPendingReferralCode,
  storePendingReferralCode,
  resolveReferralCodeForAuth,
} from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury/SalonButton';
import { AuraLogoMark } from '../components/AuraLogoMark';
import { PasswordField } from '../components/auth/PasswordField';
import {
  resetOnboardingForUser,
  markPendingOnboardingEmail,
  consumePendingOnboardingEmail,
  markPendingOnboardingUserId,
} from './onboardingStorage';
import { splitFullName, displayNameFromAuthUser } from '../utils/clientDisplayName';
import { useAuthKeyboardScroll } from '../utils/useAuthKeyboardScroll';
import {
  getEmailRedirectTo,
  isSignUpDuplicateEmail,
  isSignUpEmailAlreadyRegisteredError,
  translateClientLoginError,
  REGISTER_EMAIL_ACTIVE_TITLE,
  REGISTER_EMAIL_ACTIVE_MESSAGE,
} from '../utils/clientAuthEmail';

const MIN_PASSWORD = 6;

/**
 * Registro e inicio de sesión con Supabase Auth (correo + contraseña).
 */
export function ClientAuthScreen({ onAuthSuccess, onAuthHandoffStart }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login');

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const { contentRef, keyboardOpen, keyboardHeight, bindField, onScroll } =
    useAuthKeyboardScroll(scrollRef, insets);

  const fieldNombre = bindField('nombre');
  const fieldEmail = bindField('email');
  const fieldPassword = bindField('password');
  const fieldPassword2 = bindField('password2');
  const fieldReferral = bindField('referral');

  useEffect(() => {
    void peekPendingReferralCode().then((pending) => {
      if (pending) setReferralCode(pending);
    });
  }, []);

  const passwordMismatch =
    mode === 'register' && password2.length > 0 && password !== password2;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.background,
        },
        scroll: {
          flex: 1,
          backgroundColor: c.background,
        },
        scrollContent: {
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        },
        brandRow: {
          alignItems: 'center',
          marginBottom: keyboardOpen ? spacing.md : spacing.xl,
        },
        logoShadow: {
          marginBottom: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        },
        title: {
          fontFamily: typography.fontDisplay,
          fontSize: 26,
          color: c.foreground,
          textAlign: 'center',
          marginBottom: spacing.xs,
        },
        subtitle: {
          fontFamily: typography.fontSans,
          fontSize: 14,
          color: c.foregroundMuted,
          textAlign: 'center',
          lineHeight: 20,
          marginBottom: spacing.lg,
        },
        segment: {
          flexDirection: 'row',
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: c.cardBorder,
          padding: 4,
          marginBottom: spacing.lg,
          backgroundColor: c.card,
        },
        segmentBtn: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: radii.pill,
          alignItems: 'center',
        },
        segmentBtnOn: {
          backgroundColor: c.surfaceMuted,
        },
        segmentTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 14,
          color: c.foregroundMuted,
        },
        segmentTxtOn: {
          color: c.foreground,
        },
        label: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.foreground,
          marginBottom: spacing.xs,
        },
        labelOptional: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundMuted,
        },
        input: {
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foreground,
          borderWidth: 1,
          borderColor: c.cardBorder,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: 14,
          backgroundColor: c.card,
        },
        hint: {
          fontFamily: typography.fontSans,
          fontSize: 12,
          color: c.foregroundSubtle,
          textAlign: 'center',
          marginTop: spacing.md,
          lineHeight: 18,
        },
      }),
    [c, insets.bottom, insets.top, keyboardOpen],
  );

  const validateEmail = (v) => /\S+@\S+\.\S+/.test(v.trim());

  const linkClienteFicha = async (user, displayName, referralCode) => {
    if (!user?.id) return { ok: false };
    const { error } = await db.clientes.ensureFromAuth({
      userId: user.id,
      nombre: displayName,
      email: user.email,
      referralCode,
    });
    if (error) {
      return {
        ok: false,
        message:
          error.message ||
          'No se pudo crear tu ficha de cliente. Ejecutá supabase-clientes-auth-insert.sql en Supabase.',
      };
    }
    return { ok: true };
  };

  const finishAuth = async (user, displayName, em, ref, { isNewAccount = false } = {}) => {
    void supabase.auth.updateUser({ data: { signup_source: 'app_clientes' } });
    const link = await linkClienteFicha(user, displayName, ref);
    if (!link.ok) {
      Alert.alert('Cuenta', link.message);
      return;
    }
    let newAccount = isNewAccount;
    if (!newAccount && user?.id && em) {
      const pending = await consumePendingOnboardingEmail(em);
      if (pending) {
        await resetOnboardingForUser(user.id);
        newAccount = true;
      }
    }
    if (newAccount && user?.id) {
      await resetOnboardingForUser(user.id);
      await markPendingOnboardingUserId(user.id);
    }
    await onAuthSuccess({
      userId: user?.id,
      name: displayName,
      email: user?.email || em,
      isNewAccount: newAccount,
      ...(ref ? { referralCode: ref } : {}),
    });
  };

  const submitLogin = async () => {
    const em = email.trim();
    const pw = password;
    if (!validateEmail(em)) {
      Alert.alert('Correo', 'Ingresá un correo con formato válido.');
      return;
    }
    if (pw.length < MIN_PASSWORD) {
      Alert.alert(
        'Contraseña',
        `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
      );
      return;
    }
    if (busy) return;
    setBusy(true);
    onAuthHandoffStart?.();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });
      if (error) {
        Alert.alert('Inicio de sesión', translateClientLoginError(error));
        return;
      }
      const u = data.user;
      if (!data.session?.user) {
        Alert.alert('Sesión', 'No se pudo abrir sesión.');
        return;
      }
      const name = displayNameFromAuthUser(u);
      const pendingRef = await resolveReferralCodeForAuth(u);
      await finishAuth(u, name, em, pendingRef || undefined);
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async () => {
    const fullName = nombreCompleto.trim().replace(/\s+/g, ' ');
    const { nombre: nom, apellido: ape } = splitFullName(fullName);
    const em = email.trim();
    const pw = password;
    if (nom.length < 2) {
      Alert.alert('Nombre y apellido', 'Ingresá tu nombre (mínimo 2 caracteres).');
      return;
    }
    if (ape.length < 2) {
      Alert.alert(
        'Nombre y apellido',
        'Ingresá nombre y apellido en el mismo campo, separados por un espacio.',
      );
      return;
    }
    if (!validateEmail(em)) {
      Alert.alert('Correo', 'Ingresá un correo válido.');
      return;
    }
    if (pw.length < MIN_PASSWORD) {
      Alert.alert(
        'Contraseña',
        `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
      );
      return;
    }
    if (pw !== password2) {
      Alert.alert('Contraseña', 'Las contraseñas no coinciden. Revisá confirmar contraseña.');
      return;
    }
    const ref = normalizeReferralCode(referralCode.trim());
    if (busy) return;
    setBusy(true);
    onAuthHandoffStart?.();
    try {
      if (ref) await storePendingReferralCode(ref);

      const emailCheck = await db.clientes.isEmailAccountActive(em);
      if (emailCheck.error) {
        Alert.alert('Registro', emailCheck.error.message || 'No se pudo verificar el correo.');
        return;
      }
      if (emailCheck.data === true) {
        Alert.alert(REGISTER_EMAIL_ACTIVE_TITLE, REGISTER_EMAIL_ACTIVE_MESSAGE);
        setMode('login');
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: em,
        password: pw,
        options: {
          emailRedirectTo: getEmailRedirectTo(),
          data: {
            full_name: fullName,
            first_name: nom,
            last_name: ape,
            signup_source: 'app_clientes',
            ...(ref ? { referral_code: ref } : {}),
          },
        },
      });
      if (error) {
        const msg = error.message || 'No se pudo crear la cuenta.';
        if (isSignUpEmailAlreadyRegisteredError(error)) {
          Alert.alert(REGISTER_EMAIL_ACTIVE_TITLE, REGISTER_EMAIL_ACTIVE_MESSAGE);
          setMode('login');
          return;
        }
        const hint = /database error saving new user/i.test(msg)
          ? '\n\nEjecutá supabase-auth-signup-app-clientes.sql en Supabase.'
          : '';
        Alert.alert('Registro', msg + hint);
        return;
      }

      if (isSignUpDuplicateEmail(data)) {
        Alert.alert(REGISTER_EMAIL_ACTIVE_TITLE, REGISTER_EMAIL_ACTIVE_MESSAGE);
        setMode('login');
        return;
      }

      if (data.session?.user) {
        await markPendingOnboardingUserId(data.session.user.id);
        await finishAuth(data.session.user, fullName, em, ref || undefined, { isNewAccount: true });
        return;
      }

      await markPendingOnboardingEmail(em);
      setMode('login');
      Alert.alert(
        'Cuenta creada',
        ref
          ? 'Confirmá tu correo e iniciá sesión. Tu código de referido y la bienvenida te esperan al entrar.'
          : 'Confirmá tu correo e iniciá sesión para ver la bienvenida y el recorrido de la app.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              insets.bottom +
              spacing.xl +
              (keyboardOpen ? keyboardHeight + spacing.lg : 0),
          },
        ]}
      >
        <View ref={contentRef} collapsable={false}>
        <View style={styles.brandRow}>
          {!keyboardOpen ? (
            <View style={styles.logoShadow}>
              <AuraLogoMark diameter={124} />
            </View>
          ) : (
            <View style={styles.logoShadow}>
              <AuraLogoMark diameter={56} />
            </View>
          )}
          <Text style={[styles.title, keyboardOpen && { fontSize: 22, marginBottom: 0 }]}>
            Aura Salón
          </Text>
          {!keyboardOpen ? (
            <Text style={styles.subtitle}>
              Tienda del salón: creá tu cuenta e iniciá sesión para comprar y agendar.
            </Text>
          ) : null}
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'login' && styles.segmentBtnOn]}
            onPress={() => setMode('login')}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'login' }}
          >
            <Text style={[styles.segmentTxt, mode === 'login' && styles.segmentTxtOn]}>
              Iniciar sesión
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'register' && styles.segmentBtnOn]}
            onPress={() => setMode('register')}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'register' }}
          >
            <Text style={[styles.segmentTxt, mode === 'register' && styles.segmentTxtOn]}>
              Crear cuenta
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'register' ? (
          <View ref={fieldNombre.setRef} collapsable={false} style={{ marginBottom: spacing.md }}>
            <Text style={styles.label}>Nombre y apellido</Text>
            <TextInput
              style={styles.input}
              value={nombreCompleto}
              onChangeText={setNombreCompleto}
              placeholder="Nombre y apellido"
              placeholderTextColor={c.foregroundSubtle}
              autoCapitalize="words"
              onFocus={fieldNombre.onFocus}
            />
          </View>
        ) : null}

        <View ref={fieldEmail.setRef} collapsable={false}>
        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={[styles.input, { marginBottom: spacing.md }]}
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          placeholderTextColor={c.foregroundSubtle}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={fieldEmail.onFocus}
        />
        </View>

        <PasswordField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
          wrapRef={fieldPassword.setRef}
          onInputFocus={fieldPassword.onFocus}
        />

        {mode === 'register' ? (
          <>
            <PasswordField
              label="Confirmar contraseña"
              value={password2}
              onChangeText={setPassword2}
              placeholder="Repetí la contraseña"
              showMismatch={passwordMismatch}
              wrapRef={fieldPassword2.setRef}
              onInputFocus={fieldPassword2.onFocus}
            />

            <View ref={fieldReferral.setRef} collapsable={false}>
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.label}>Código de referido</Text>
              <Text style={styles.labelOptional}>Opcional.</Text>
            </View>
            <TextInput
              style={[styles.input, { marginBottom: spacing.md }]}
              value={referralCode}
              onChangeText={setReferralCode}
              placeholder="Ej. ANDREAS-9F014A9E4D9B"
              placeholderTextColor={c.foregroundSubtle}
              autoCapitalize="characters"
              autoCorrect={false}
              onFocus={fieldReferral.onFocus}
            />
            </View>
          </>
        ) : null}

        {busy ? (
          <ActivityIndicator style={{ marginVertical: spacing.md }} color={c.primary} />
        ) : mode === 'login' ? (
          <SalonButton title="Ingresar" variant="heroGold" fullWidth onPress={submitLogin} />
        ) : (
          <SalonButton title="Crear cuenta" variant="heroGold" fullWidth onPress={submitRegister} />
        )}

        <Text style={styles.hint}>
          Al continuar aceptás las prácticas descritas en la política de privacidad del salón.
        </Text>
        </View>
      </ScrollView>
    </View>
  );
}
