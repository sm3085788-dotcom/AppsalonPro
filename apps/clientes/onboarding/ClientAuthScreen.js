import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { supabase, db } from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury/SalonButton';
import { AuraLogoMark } from '../components/AuraLogoMark';
import { setLocalProfile } from './onboardingStorage';

const hasSupabaseEnv = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim(),
);

const MIN_PASSWORD = hasSupabaseEnv ? 6 : 4;

/**
 * Inicio de sesión y registro: Supabase cuando hay URL y anon key; si no, perfil solo en el dispositivo.
 */
export function ClientAuthScreen({ onAuthSuccess }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [busy, setBusy] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
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
          marginBottom: spacing.xl,
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
          marginBottom: spacing.md,
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
    [c, insets.bottom, insets.top],
  );

  const validateEmail = (v) => /\S+@\S+\.\S+/.test(v.trim());

  const linkClienteFicha = async (user, displayName, referralCode) => {
    if (!user?.id) return;
    const { error } = await db.clientes.ensureFromAuth({
      userId: user.id,
      nombre: displayName,
      email: user.email,
      referralCode,
    });
    if (error && __DEV__) {
      console.warn('[clientes.ensureFromAuth]', error.message);
    }
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
    try {
      if (hasSupabaseEnv) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: em,
          password: pw,
        });
        if (error) {
          Alert.alert('Inicio de sesión', error.message || 'No se pudo iniciar sesión.');
          return;
        }
        const u = data.user;
        const name =
          (u?.user_metadata?.full_name && String(u.user_metadata.full_name).trim()) ||
          u?.email?.split('@')[0] ||
          'Cliente';
        await linkClienteFicha(u, name);
        onAuthSuccess({ name, email: u?.email || em });
        return;
      }
      const displayName = em.split('@')[0] || 'Cliente';
      const profile = { name: displayName, email: em };
      await setLocalProfile(profile);
      onAuthSuccess(profile);
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async () => {
    const n = nombre.trim();
    const em = email.trim();
    const pw = password;
    if (n.length < 2) {
      Alert.alert('Nombre', 'Ingresá tu nombre (mínimo 2 caracteres).');
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
      Alert.alert('Contraseña', 'Las contraseñas no coinciden.');
      return;
    }
    const ref = referralCode.trim();
    const profile = ref ? { name: n, email: em, referralCode: ref } : { name: n, email: em };
    if (busy) return;
    setBusy(true);
    try {
      if (hasSupabaseEnv) {
        const { data, error } = await supabase.auth.signUp({
          email: em,
          password: pw,
          options: {
            data: { full_name: n },
          },
        });
        if (error) {
          Alert.alert('Registro', error.message || 'No se pudo crear la cuenta.');
          return;
        }
        if (!data.session && data.user) {
          Alert.alert(
            'Confirmá tu correo',
            'Si tu salón exige verificación por email, revisá la bandeja de entrada para activar la cuenta.',
          );
        }
        const u = data.session?.user ?? data.user;
        if (u) {
          await linkClienteFicha(u, n, ref || undefined);
          onAuthSuccess({
            name: n,
            email: u.email || em,
            ...(ref ? { referralCode: ref } : {}),
          });
        }
        return;
      }
      await setLocalProfile(profile);
      onAuthSuccess(profile);
    } finally {
      setBusy(false);
    }
  };

  const enterDemoLocal = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const profile = {
        name: 'Cliente demo',
        email: 'demo-local@appsalon.invalid',
      };
      await setLocalProfile(profile);
      onAuthSuccess(profile);
    } finally {
      setBusy(false);
    }
  };

  const subtitle = hasSupabaseEnv
    ? 'Iniciá sesión con la cuenta que te dio el salón o creá una nueva.'
    : 'Sin conexión a Supabase en esta compilación: el perfil se guarda solo en este dispositivo.';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoShadow}>
            <AuraLogoMark diameter={124} />
          </View>
          <Text style={styles.title}>Aura Salón</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
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
          <>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              placeholderTextColor={c.foregroundSubtle}
              autoCapitalize="words"
            />
          </>
        ) : null}

        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="tu@correo.com"
          placeholderTextColor={c.foregroundSubtle}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
          placeholderTextColor={c.foregroundSubtle}
          secureTextEntry
        />

        {mode === 'register' ? (
          <>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              value={password2}
              onChangeText={setPassword2}
              placeholder="Repetí la contraseña"
              placeholderTextColor={c.foregroundSubtle}
              secureTextEntry
            />

            <View style={{ marginBottom: 4 }}>
              <Text style={styles.label}>Código de referido</Text>
              <Text style={styles.labelOptional}>
                Opcional. Si alguien te invitó, ingresá su código (ej. AURA-XXX-000).
              </Text>
            </View>
            <TextInput
              style={styles.input}
              value={referralCode}
              onChangeText={setReferralCode}
              placeholder="Ej. AURA-SM308-482"
              placeholderTextColor={c.foregroundSubtle}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </>
        ) : null}

        {busy ? (
          <ActivityIndicator style={{ marginVertical: spacing.md }} color={c.primary} />
        ) : mode === 'login' ? (
          <SalonButton title="Ingresar" variant="heroGold" fullWidth onPress={submitLogin} />
        ) : (
          <SalonButton title="Crear cuenta" variant="heroGold" fullWidth onPress={submitRegister} />
        )}

        <SalonButton
          title="Entrar en modo demo (sin cuenta)"
          variant="outlineGray"
          fullWidth
          style={{ marginTop: spacing.md }}
          onPress={enterDemoLocal}
          disabled={busy}
        />
        <Text style={[styles.hint, { marginTop: spacing.sm, fontSize: 11 }]}>
          Solo en esta pantalla: no usa Supabase ni contraseña. Sirve para revisar la app; los datos no se
          sincronizan con el salón.
        </Text>

        <Text style={styles.hint}>
          Al continuar aceptás las prácticas descritas en la política de privacidad del salón.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
