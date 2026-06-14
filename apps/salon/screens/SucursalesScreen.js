import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { useTheme } from '../theme/ThemeProvider';
import { SubScreenChrome } from '../components/luxury/SubScreenChrome';
import { SalonButton } from '../components/luxury';
import { PinField } from '../components/auth/PinField';
import {
  normalizeSucursalCodigo,
  savePendingBranchAdminSetup,
  validateBranchLoginCodigo,
  validateBranchLoginPassword,
  branchLoginPreview,
  sanitizeBranchPinInput,
  BRANCH_PIN_LENGTH,
} from '../services/branchAdminSetup';

export function SucursalesScreen({ onBack, onRequestSignOut }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefonoLocal, setTelefonoLocal] = useState('');
  const [loginCodigo, setLoginCodigo] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginPinConfirm, setLoginPinConfirm] = useState('');

  const existingCodigos = useMemo(
    () => rows.filter((r) => !r.es_matriz).map((r) => r.codigo),
    [rows],
  );

  const loginPreview = useMemo(
    () => branchLoginPreview(loginCodigo),
    [loginCodigo],
  );

  const codigoValidation = useMemo(
    () => validateBranchLoginCodigo(loginCodigo, { existingCodigos }),
    [loginCodigo, existingCodigos],
  );

  const load = useCallback(async () => {
    try {
      const { data, error } = await db.sucursales.listActivas();
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      Alert.alert('Sucursales', e?.message || 'No se pudo cargar.');
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const resetForm = () => {
    setNombre('');
    setDireccion('');
    setTelefonoLocal('');
    setLoginCodigo('');
    setLoginPin('');
    setLoginPinConfirm('');
  };

  const promptLogoutForBranchAdmin = (sucursalRow, codigo, pin) => {
    Alert.alert(
      'Sucursal creada',
      `«${sucursalRow.nombre}» quedó activa.\n\nCredenciales App Salón (sucursal):\n· Código: ${codigo}\n· PIN: ${pin} (${BRANCH_PIN_LENGTH} números)\n\n1. Tocá «Cerrar sesión ahora»\n2. En login: código + PIN\n3. Tocá «Activar sucursal» (primera vez) o «Entrar»\n\nLa matriz sigue entrando con teléfono +502…, no con este código.`,
      [
        { text: 'Seguir como matriz', style: 'cancel' },
        {
          text: 'Cerrar sesión ahora',
          onPress: () => {
            onBack?.();
            onRequestSignOut?.();
          },
        },
      ],
    );
  };

  const crear = async () => {
    const cNom = String(nombre || '').trim();
    if (!cNom) {
      Alert.alert('Sucursales', 'El nombre del local es obligatorio.');
      return;
    }

    const codigoCheck = validateBranchLoginCodigo(loginCodigo, { existingCodigos });
    if (!codigoCheck.ok) {
      Alert.alert('Acceso App Salón', codigoCheck.message);
      return;
    }

    const pinCheck = validateBranchLoginPassword(loginPin, loginPinConfirm);
    if (!pinCheck.ok) {
      Alert.alert('Acceso App Salón', pinCheck.message);
      return;
    }

    const cCod = codigoCheck.codigo;
    const adminPass = pinCheck.password;

    setSaving(true);
    try {
      const { data, error } = await db.sucursales.crear({
        codigo: cCod,
        nombre: cNom,
        direccion: direccion.trim() || null,
        telefono: telefonoLocal.trim() || null,
      });
      if (error) throw error;
      if (!data?.id) throw new Error('No se recibió id de la sucursal.');

      await savePendingBranchAdminSetup({
        sucursalId: String(data.id),
        sucursalNombre: data.nombre || cNom,
        loginCodigo: cCod,
        loginPhone: data.login_phone || loginPreview?.loginPhone,
        adminNombre: cNom,
        adminPassword: adminPass,
      });

      resetForm();
      await load();
      promptLogoutForBranchAdmin(data, cCod, adminPass);
    } catch (e) {
      Alert.alert('Sucursales', e?.message || 'No se pudo crear.');
    } finally {
      setSaving(false);
    }
  };

  const pinMismatch =
    loginPinConfirm.length > 0 && loginPin !== loginPinConfirm;

  const canSubmit =
    String(nombre || '').trim().length > 0 &&
    codigoValidation.ok &&
    loginPin.length === BRANCH_PIN_LENGTH &&
    loginPinConfirm.length === BRANCH_PIN_LENGTH &&
    loginPin === loginPinConfirm;

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Sucursales"
        subtitle={`Creá el local y definí código + PIN de ${BRANCH_PIN_LENGTH} números para el login de sucursal en App Salón.`}
        onBack={onBack}
        bottomPadding={0}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        >
          <Text style={styles.sectionTitle}>1 · Datos del local</Text>
          <Text style={[styles.hint, { color: c.foregroundMuted }]}>
            Información del negocio. El teléfono acá es solo contacto del local, no el login de la app.
          </Text>

          <Text style={styles.label}>Nombre del local *</Text>
          <TextInput
            style={[styles.input, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Sucursal zona 10"
            placeholderTextColor={c.foregroundSubtle}
            value={nombre}
            onChangeText={setNombre}
            editable={!saving}
          />

          <Text style={styles.label}>Dirección (opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Dirección para clientes / reportes"
            placeholderTextColor={c.foregroundSubtle}
            value={direccion}
            onChangeText={setDireccion}
            editable={!saving}
          />

          <Text style={styles.label}>Teléfono de contacto (opcional)</Text>
          <TextInput
            style={[styles.input, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="+502… (no es el login)"
            placeholderTextColor={c.foregroundSubtle}
            keyboardType="phone-pad"
            value={telefonoLocal}
            onChangeText={setTelefonoLocal}
            editable={!saving}
          />

          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>2 · Acceso App Salón</Text>
          <Text style={[styles.hint, { color: c.foregroundMuted }]}>
            El admin de esta sucursal iniciará sesión con código + PIN ({BRANCH_PIN_LENGTH} números). Igual que matriz usa
            teléfono, pero la sucursal usa un alias corto — no pongas tu +502 de matriz acá.
          </Text>

          <Text style={styles.label}>Código de acceso *</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: loginCodigo && !codigoValidation.ok ? c.error || '#c0392b' : c.cardBorder,
                backgroundColor: c.card,
                color: c.foreground,
              },
            ]}
            placeholder="NORTE, Z10, CENTRO…"
            placeholderTextColor={c.foregroundSubtle}
            autoCapitalize="characters"
            autoCorrect={false}
            value={loginCodigo}
            onChangeText={(t) => setLoginCodigo(normalizeSucursalCodigo(t))}
            editable={!saving}
          />
          {loginCodigo && !codigoValidation.ok ? (
            <Text style={[styles.fieldErr, { color: c.error || '#c0392b' }]}>{codigoValidation.message}</Text>
          ) : (
            <Text style={[styles.fieldHint, { color: c.foregroundSubtle }]}>
              Letras y números cortos. Se guardará como {loginPreview?.codigo || '…'}.
            </Text>
          )}

          <PinField
            label={`PIN de ${BRANCH_PIN_LENGTH} números *`}
            value={loginPin}
            onChangeText={(t) => setLoginPin(sanitizeBranchPinInput(t))}
            placeholder={`${BRANCH_PIN_LENGTH} números`}
            maxLength={BRANCH_PIN_LENGTH}
            editable={!saving}
          />

          <PinField
            label="Confirmar PIN *"
            value={loginPinConfirm}
            onChangeText={(t) => setLoginPinConfirm(sanitizeBranchPinInput(t))}
            placeholder="Repetí el PIN"
            maxLength={BRANCH_PIN_LENGTH}
            showMismatch={pinMismatch}
            mismatchText="Los PIN no coinciden."
            editable={!saving}
          />

          {loginPreview && codigoValidation.ok && loginPin.length === BRANCH_PIN_LENGTH && loginPin === loginPinConfirm ? (
            <View style={[styles.previewCard, { borderColor: c.primary, backgroundColor: c.surfaceMuted }]}>
              <Text style={[styles.previewTitle, { color: c.foreground }]}>Resumen de login</Text>
              <Text style={[styles.previewLine, { color: c.foregroundMuted }]}>
                En App Salón el admin verá:
              </Text>
              <Text style={[styles.previewCred, { color: c.foreground }]}>
                Código: {loginPreview.codigo}
              </Text>
              <Text style={[styles.previewCred, { color: c.foreground }]}>PIN: {BRANCH_PIN_LENGTH} números</Text>
              <Text style={[styles.previewNote, { color: c.foregroundSubtle }]}>
                Tras crear, cerrá sesión de matriz y activá la sucursal con estos datos.
              </Text>
            </View>
          ) : null}

          {saving ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.md }} />
          ) : (
            <SalonButton
              title="Crear sucursal"
              variant="heroGold"
              fullWidth
              onPress={crear}
              disabled={!canSubmit}
              style={{ marginTop: spacing.md, opacity: canSubmit ? 1 : 0.55 }}
            />
          )}

          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Sucursales activas</Text>
          {loading ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
          ) : rows.length === 0 ? (
            <Text style={[styles.hint, { color: c.foregroundMuted }]}>No hay sucursales activas.</Text>
          ) : (
            rows.map((s) => (
              <View key={s.id} style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                <Text style={styles.cardTitle}>
                  {s.nombre}
                  {s.es_matriz ? ' · Matriz' : ''}
                </Text>
                <Text style={[styles.cardMeta, { color: c.foregroundMuted }]}>
                  {s.es_matriz
                    ? 'Login matriz: teléfono +502…'
                    : `Acceso sucursal · código ${s.codigo}`}
                  {s.direccion ? `\n${s.direccion}` : ''}
                  {s.telefono ? `\nContacto: ${s.telefono}` : ''}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </SubScreenChrome>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    sectionTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    hint: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: spacing.md,
    },
    label: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    fieldHint: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },
    fieldErr: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },
    input: {
      fontFamily: typography.fontSans,
      fontSize: 16,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
    },
    previewCard: {
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    previewTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      marginBottom: spacing.xs,
    },
    previewLine: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginBottom: spacing.xs,
    },
    previewCred: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      marginTop: 2,
    },
    previewNote: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 16,
      marginTop: spacing.sm,
    },
    card: {
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    cardTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      color: c.foreground,
    },
    cardMeta: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginTop: 4,
      lineHeight: 18,
    },
  });
}
