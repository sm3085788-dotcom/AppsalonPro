import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserPlus, Phone, MapPin, Calendar } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { SubScreenChrome, useSubStyles, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

const MINT = { border: '#2E7D32', bg: '#E8F5E9', chip: '#C8E6C9' };

function ageFromBirthdate(isoOrDate) {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function isManualProfile(row) {
  const t = String(row?.tipo_registro || '').toLowerCase();
  return t.includes('manual');
}

export function ClientesScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');

  const [modalManual, setModalManual] = useState(false);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [nacimiento, setNacimiento] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 70);
    return d;
  });
  const [showNacPicker, setShowNacPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadClientes = useCallback(async () => {
    setLoadError(null);
    try {
      const { data, error } = await db.clientes.getAll();
      if (error) {
        setLoadError(error.message || 'No se pudo cargar la lista');
        setClientes([]);
        return;
      }
      setClientes(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e?.message || 'Error de red');
      setClientes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((row) => {
      const blob = [
        row.nombre,
        row.telefono,
        row.email,
        row.direccion,
        row.notas,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [clientes, search]);

  const openManual = useCallback(() => {
    setNombre('');
    setTelefono('');
    setDireccion('');
    const d = new Date();
    d.setFullYear(d.getFullYear() - 70);
    setNacimiento(d);
    setModalManual(true);
  }, []);

  const closeManual = useCallback(() => {
    setModalManual(false);
    setShowNacPicker(false);
  }, []);

  const guardarManual = async () => {
    const nom = nombre.trim();
    const tel = telefono.trim();
    const dir = direccion.trim();
    if (!nom) {
      Alert.alert('Falta el nombre', 'Escribí el nombre completo de la persona.');
      return;
    }
    if (!tel) {
      Alert.alert('Falta el teléfono', 'Ingresá un número de contacto.');
      return;
    }
    if (!dir) {
      Alert.alert('Falta la dirección', 'Aunque sea zona o colonia, ayuda al equipo.');
      return;
    }
    const cumple = nacimiento.toISOString().split('T')[0];
    setSaving(true);
    try {
      const { error } = await db.clientes.create({
        nombre: nom,
        telefono: tel,
        direccion: dir,
        cumpleanos: cumple,
        tipo_registro: 'manual_panel_tercera_edad',
        email: null,
        notas: 'Alta manual desde panel salón (persona sin uso habitual de la app).',
        categoria: 'Nuevo',
      });
      if (error) {
        Alert.alert('No se guardó', error.message || 'Revisá permisos en Supabase.');
        return;
      }
      closeManual();
      await loadClientes();
      Alert.alert('Listo', 'La ficha quedó registrada. Aparecerá en la lista.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const padList = Math.max(insets.bottom + spacing.lg, spacing.xl * 2);

  const renderItem = useCallback(
    ({ item }) => {
      const manual = isManualProfile(item);
      const edad = ageFromBirthdate(item.cumpleanos);
      return (
        <View style={[styles.rowCard, { borderColor: MINT.border, backgroundColor: c.card }]}>
          <View style={styles.rowTop}>
            <Text style={styles.rowName} numberOfLines={2}>
              {item.nombre || 'Sin nombre'}
            </Text>
            <View style={[styles.chip, { backgroundColor: manual ? MINT.chip : c.surfaceMuted }]}>
              <Text style={[styles.chipTxt, { color: manual ? '#1B5E20' : c.foregroundMuted }]}>
                {manual ? 'Manual' : 'App clientes'}
              </Text>
            </View>
          </View>
          {item.telefono ? (
            <View style={styles.rowLine}>
              <Phone size={16} color={c.foregroundMuted} strokeWidth={2} />
              <Text style={styles.rowMeta}>{item.telefono}</Text>
            </View>
          ) : null}
          {item.direccion ? (
            <View style={styles.rowLine}>
              <MapPin size={16} color={c.foregroundMuted} strokeWidth={2} />
              <Text style={styles.rowMeta} numberOfLines={2}>
                {item.direccion}
              </Text>
            </View>
          ) : null}
          {edad != null ? (
            <Text style={styles.rowAge}>Edad aproximada: {edad} años</Text>
          ) : null}
        </View>
      );
    },
    [c.card, c.foreground, c.foregroundMuted, c.foregroundSubtle, c.surfaceMuted, styles],
  );

  const addPersonIconColor = isDark ? '#141414' : c.foreground;

  const rightAction = (
    <TouchableOpacity
      style={[styles.addPersonCircle, isDark && styles.addPersonCircleDark]}
      onPress={openManual}
      accessibilityRole="button"
      accessibilityLabel="Agregar cliente manual"
      activeOpacity={0.85}
    >
      <UserPlus size={22} color={addPersonIconColor} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Clientes"
        onBack={onBack}
        disableBodyScroll
        rightAction={rightAction}
        bottomPadding={0}
      >
        <View style={styles.body}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar por nombre, teléfono o dirección…"
            placeholderTextColor={c.foregroundSubtle}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            accessibilityLabel="Buscar clientes"
          />

          <View style={styles.listShell}>
            <View style={styles.agendaToolbar}>
              <Text style={styles.agendaToolbarMeta}>Clientes del salón</Text>
              <TouchableOpacity hitSlop={12} accessibilityRole="button" accessibilityLabel="Ordenar y filtros">
                <Text style={styles.agendaToolbarLink}>Ordenar · filtros</Text>
              </TouchableOpacity>
            </View>

            {loadError ? (
              <View style={styles.centerBox}>
                <Text style={[subStyles.muted, styles.errTxt]}>{loadError}</Text>
              </View>
            ) : null}

            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color={c.primary} />
              </View>
            ) : (
              <View style={styles.listWrap}>
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderItem}
                  style={{ flex: 1 }}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadClientes(); }} tintColor={c.primary} />
                  }
                  contentContainerStyle={{ paddingBottom: padList, flexGrow: 1 }}
                  ListEmptyComponent={null}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                  initialNumToRender={12}
                  windowSize={8}
                  removeClippedSubviews
                />
              </View>
            )}

          </View>
        </View>
      </SubScreenChrome>

      <Modal visible={modalManual} animationType="slide" transparent onRequestClose={closeManual}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.modalPad, { paddingBottom: insets.bottom + spacing.xl }]}
          >
            <View style={[styles.modalCard, { backgroundColor: c.background }]}>
              <Text style={styles.modalTitle}>Cliente manual</Text>

              <Text style={styles.fieldLbl}>Nombre completo</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ej. María Concepción López de Pérez"
                placeholderTextColor={c.foregroundSubtle}
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLbl}>Teléfono</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ej. 55123456"
                placeholderTextColor={c.foregroundSubtle}
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLbl}>Dirección o zona</Text>
              <TextInput
                style={[styles.fieldInp, styles.fieldArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Colonia, calle, zona o referencia"
                placeholderTextColor={c.foregroundSubtle}
                value={direccion}
                onChangeText={setDireccion}
                multiline
              />

              <Text style={styles.fieldLbl}>Fecha de nacimiento (para calcular edad)</Text>
              <TouchableOpacity
                style={[styles.dateRow, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                onPress={() => setShowNacPicker(true)}
                accessibilityRole="button"
              >
                <Text style={[styles.dateTxt, { color: c.foreground }]}>
                  {nacimiento.toLocaleDateString('es-GT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Calendar size={18} color={c.primary} strokeWidth={2} />
              </TouchableOpacity>
              {showNacPicker ? (
                <>
                  <DateTimePicker
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    value={nacimiento}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                    onChange={(ev, date) => {
                      if (Platform.OS !== 'ios') setShowNacPicker(false);
                      if (date) setNacimiento(date);
                    }}
                  />
                  {Platform.OS === 'ios' ? (
                    <SalonButton title="Listo" variant="outlineGold" fullWidth onPress={() => setShowNacPicker(false)} />
                  ) : null}
                </>
              ) : null}

              <SalonButton
                title={saving ? 'Guardando…' : 'Guardar ficha'}
                variant="heroGold"
                fullWidth
                disabled={saving}
                onPress={guardarManual}
              />
              <SalonButton
                title="Cancelar"
                variant="outlineGray"
                fullWidth
                onPress={closeManual}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    body: { flex: 1 },
    listShell: {
      flex: 1,
      paddingTop: spacing.xs,
    },
    agendaToolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    agendaToolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    agendaToolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.primary,
    },
    listWrap: { flex: 1 },
    addPersonCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBorder,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
    },
    addPersonCircleDark: {
      borderColor: 'rgba(255,255,255,0.35)',
    },
    search: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    centerBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    errTxt: { textAlign: 'center', marginBottom: spacing.sm },
    rowCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.md,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    rowName: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      lineHeight: 20,
      color: c.foreground,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    chipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
    },
    rowLine: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: 4,
    },
    rowMeta: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 20,
      color: c.foregroundMuted,
    },
    rowAge: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
      marginTop: spacing.sm,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalPad: { padding: spacing.md },
    modalCard: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      overflow: 'hidden',
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
      marginBottom: spacing.md,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    fieldInp: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    fieldArea: {
      minHeight: 100,
      paddingTop: spacing.sm,
      textAlignVertical: 'top',
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    dateTxt: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      flex: 1,
    },
  });
}
