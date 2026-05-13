import { useMemo, useState } from 'react';
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
import { db, isSalonAdminRole } from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury';

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

async function loadProfileAfterSignIn(userId) {
  const { data: sessionData } = await db.auth.getSession();
  const uid = userId ?? sessionData?.session?.user?.id;
  if (!uid) return { profile: null, error: { message: 'Sesión no disponible.' } };

  let result = await db.profiles.getCurrentProfile();
  if (result.data) return { profile: result.data, error: null };

  result = await db.profiles.getById(uid);
  if (result.data) return { profile: result.data, error: null };

  return { profile: null, error: result.error };
}

async function ensureAdminProfile(userId) {
  const { profile, error: pErr } = await loadProfileAfterSignIn(userId);
  if (!profile) {
    await db.auth.signOut();
    const detail = pErr?.message ? ` (${pErr.message})` : '';
    const rlsHint = /current_profile_role|permission denied/i.test(detail)
      ? ' En Supabase ejecutá GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated; y la política profiles_self_select (auth.uid() = id).'
      : '';
    return {
      ok: false,
      message: `No se pudo leer profiles para id ${userId ?? '—'}.${detail}${rlsHint} Si no hay fila, INSERT con role = admin y el mismo UUID que Auth.`,
    };
  }
  if (!isSalonAdminRole(profile.role)) {
    await db.auth.signOut();
    return {
      ok: false,
      message: `Tu profiles.role es "${profile.role}". Para la app salón debe ser exactamente admin (check_rol_types solo permite admin o staff).`,
    };
  }
  return { ok: true };
}

export function SalonAdminSignInScreen({ onSignedIn, initialError }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [phoneRaw, setPhoneRaw] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(initialError ?? null);
  const styles = useMemo(() => createStyles(c), [c]);

  const submit = async () => {
    setErr(null);
    if (!hasSupabaseEnv) {
      setErr('Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en apps/salon/.env');
      return;
    }
    const phone = normalizePhoneForAuth(phoneRaw);
    if (!phone || !phone.startsWith('+')) {
      setErr('Teléfono con código de país (ej. +50257199107 o 50257199107).');
      return;
    }
    if (!password) {
      setErr('Ingresá la contraseña de tu cuenta en Authentication.');
      return;
    }

    setBusy(true);
    try {
      const { data: signData, error: signErr } = await db.auth.signInWithPassword({ phone, password });
      if (signErr) {
        setErr(signErr.message || 'No se pudo iniciar sesión.');
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

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <Text style={styles.title}>App Andrea Control</Text>
        <Text style={[styles.lead, { color: c.foregroundMuted }]}>
          Iniciá sesión con el teléfono y la contraseña de tu cuenta en Supabase Authentication.
        </Text>

        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={[styles.input, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
          placeholder="+50257199107"
          placeholderTextColor={c.foregroundSubtle}
          value={phoneRaw}
          onChangeText={setPhoneRaw}
          keyboardType="phone-pad"
          editable={!busy}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={[styles.input, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
          placeholder="••••••••"
          placeholderTextColor={c.foregroundSubtle}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!busy}
        />

        {err ? (
          <Text style={[styles.err, { color: c.foregroundMuted }]} accessibilityLiveRegion="polite">
            {err}
          </Text>
        ) : null}

        {busy ? (
          <ActivityIndicator style={{ marginTop: spacing.md }} color={c.primary} />
        ) : (
          <SalonButton title="Entrar" variant="heroGold" fullWidth onPress={submit} style={{ marginTop: spacing.lg }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    root: { flex: 1 },
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
  });
}
