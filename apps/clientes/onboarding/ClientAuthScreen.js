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
const MIN_PASSWORD = 6;

/**
 * Registro e inicio de sesión con Supabase Auth (correo + contraseña).
 * La confirmación de correo se activará al lanzar con proveedor SMTP propio.
 */
export function ClientAuthScreen({ onAuthSuccess }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login');

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

  const finishAuth = async (user, displayName, em, ref) => {
    const link = await linkClienteFicha(user, displayName, ref);
    if (!link.ok) {
      Alert.alert('Cuenta', link.message);
      return;
    }
    onAuthSuccess({
      name: displayName,
      email: user?.email || em,
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });
      if (error) {
        Alert.alert('Inicio de sesión', error.message || 'No se pudo iniciar sesión.');
        return;
      }
      const u = data.user;
      if (!data.session?.user) {
        Alert.alert('Sesión', 'No se pudo abrir sesión.');
        return;
      }
      const name =
        (u?.user_metadata?.full_name && String(u.user_metadata.full_name).trim()) ||
        u?.email?.split('@')[0] ||
        'Cliente';
      await finishAuth(u, name, em);
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
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password: pw,
        options: {
          data: { full_name: n },
        },
      });
      if (error) {
        const msg = error.message || 'No se pudo crear la cuenta.';
        const hint = /database error saving new user/i.test(msg)
          ? '\n\nEjecutá supabase-auth-signup-app-clientes.sql en Supabase.'
          : '';
        Alert.alert('Registro', msg + hint);
        return;
      }

      if (data.session?.user) {
        await finishAuth(data.session.user, n, em, ref || undefined);
        return;
      }

      setMode('login');
      Alert.alert(
        'Cuenta creada',
        'Iniciá sesión con tu correo y contraseña.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoShadow}>
            <AuraLogoMark diameter={124} />
          </View>
          <Text style={styles.title}>Aura Salón</Text>
          <Text style={styles.subtitle}>
            Tienda del salón: creá tu cuenta e iniciá sesión para comprar y agendar.
          </Text>
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
              <Text style={styles.labelOptional}>Opcional.</Text>
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

        <Text style={styles.hint}>
          Al continuar aceptás las prácticas descritas en la política de privacidad del salón.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
