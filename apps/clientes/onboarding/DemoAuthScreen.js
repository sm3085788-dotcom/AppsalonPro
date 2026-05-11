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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury/SalonButton';
import { AuraLogoMark } from '../components/AuraLogoMark';

/**
 * Login + registro solo demo (sin API). Guarda perfil vía `onAuthSuccess`.
 */
export function DemoAuthScreen({ onAuthSuccess }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [referralCode, setReferralCode] = useState('');

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

  const submitLogin = () => {
    const em = email.trim();
    const pw = password;
    if (!validateEmail(em)) {
      Alert.alert('Demo', 'Ingresá un correo con formato válido.');
      return;
    }
    if (pw.length < 4) {
      Alert.alert('Demo', 'La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    const displayName = em.split('@')[0] || 'Cliente';
    onAuthSuccess({ name: displayName, email: em });
  };

  const submitRegister = () => {
    const n = nombre.trim();
    const em = email.trim();
    const pw = password;
    if (n.length < 2) {
      Alert.alert('Demo', 'Ingresá tu nombre (mínimo 2 caracteres).');
      return;
    }
    if (!validateEmail(em)) {
      Alert.alert('Demo', 'Ingresá un correo válido.');
      return;
    }
    if (pw.length < 4) {
      Alert.alert('Demo', 'La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (pw !== password2) {
      Alert.alert('Demo', 'Las contraseñas no coinciden.');
      return;
    }
    const ref = referralCode.trim();
    onAuthSuccess(
      ref
        ? { name: n, email: em, referralCode: ref }
        : { name: n, email: em },
    );
  };

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
          <Text style={styles.subtitle}>
            Accedé en modo demo: sin servidor ni cuenta real todavía.
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
          placeholder="correo@ejemplo.com"
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
          placeholder="Mínimo 4 caracteres"
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

        {mode === 'login' ? (
          <SalonButton
            title="Ingresar · demo"
            variant="heroGold"
            fullWidth
            onPress={submitLogin}
          />
        ) : (
          <SalonButton
            title="Crear cuenta · demo"
            variant="heroGold"
            fullWidth
            onPress={submitRegister}
          />
        )}

        <Text style={styles.hint}>
          Modo demostración: los datos no se envían a ningún servidor. Más adelante conectaremos
          autenticación real con el salón.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
