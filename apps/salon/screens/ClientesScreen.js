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
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UserPlus, Calendar, X, ChevronRight } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { shareClienteFicha } from '../utils/shareClienteFicha';

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
  const styles = useMemo(() => createStyles(c), [c]);

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');

  const [modalManual, setModalManual] = useState(false);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortMode, setSortMode] = useState('nombre_asc');
  const [filterTipo, setFilterTipo] = useState('todos');
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
  const [detailCliente, setDetailCliente] = useState(null);
  const [exportingId, setExportingId] = useState(null);

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
    let rows = clientes;
    if (q) {
      rows = rows.filter((row) => {
        const blob = [row.nombre, row.telefono, row.email, row.direccion, row.notas]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    if (filterTipo === 'manual') rows = rows.filter((row) => isManualProfile(row));
    if (filterTipo === 'app') rows = rows.filter((row) => !isManualProfile(row));

    const sorted = [...rows];
    if (sortMode === 'nombre_asc') {
      sorted.sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }));
    } else if (sortMode === 'nombre_desc') {
      sorted.sort((a, b) => String(b.nombre || '').localeCompare(String(a.nombre || ''), 'es', { sensitivity: 'base' }));
    } else if (sortMode === 'reciente') {
      sorted.sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at || 0).getTime();
        const tb = new Date(b.updated_at || b.created_at || 0).getTime();
        return tb - ta;
      });
    }
    return sorted;
  }, [clientes, search, filterTipo, sortMode]);

  const filtroResumen = useMemo(() => {
    const orden =
      sortMode === 'nombre_desc' ? 'Nombre Z → A' : sortMode === 'reciente' ? 'Más recientes' : 'Nombre A → Z';
    const tipo =
      filterTipo === 'manual' ? 'Solo manual' : filterTipo === 'app' ? 'Solo app clientes' : 'Todos los orígenes';
    return `${orden} · ${tipo}`;
  }, [sortMode, filterTipo]);

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

  const exportarCliente = async (item) => {
    if (!item) return;
    setExportingId(item.id);
    try {
      await shareClienteFicha(item);
    } catch (e) {
      Alert.alert('Exportar', e?.message || 'No se pudo compartir la ficha.');
    } finally {
      setExportingId(null);
    }
  };

  const padList = Math.max(insets.bottom + spacing.md, spacing.lg);

  const renderItem = useCallback(
    ({ item }) => {
      const manual = isManualProfile(item);
      const edad = ageFromBirthdate(item.cumpleanos);
      const subParts = [
        item.telefono,
        item.email,
        item.direccion,
        edad != null ? `${edad} años` : null,
      ].filter(Boolean);

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setDetailCliente(item)}
          style={[styles.row, { borderBottomColor: c.cardBorder }]}
        >
          <View style={styles.rowAvatarWrap}>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.rowAvatar} resizeMode="cover" />
            ) : (
              <View style={[styles.rowAvatar, styles.rowAvatarEmpty, { backgroundColor: c.surfaceMuted }]}>
                <Text style={[styles.rowAvatarLetter, { color: c.foregroundMuted }]}>
                  {(item.nombre || '?').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTopLine}>
              <Text style={[styles.rowName, { color: c.foreground }]} numberOfLines={1}>
                {item.nombre || 'Sin nombre'}
              </Text>
              <View style={[styles.chip, { backgroundColor: manual ? MINT.chip : c.surfaceMuted }]}>
                <Text style={[styles.chipTxt, { color: manual ? '#1B5E20' : c.foregroundMuted }]}>
                  {manual ? 'Manual' : 'App'}
                </Text>
              </View>
            </View>
            <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
              {subParts.length ? subParts.join(' · ') : 'Sin contacto'}
            </Text>
          </View>
          <ChevronRight size={16} color={c.foregroundSubtle} style={styles.rowChev} />
        </TouchableOpacity>
      );
    },
    [c.cardBorder, c.foreground, c.foregroundMuted, c.foregroundSubtle, c.surfaceMuted, styles],
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
        edgeToEdge
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

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading ? '…' : `${filtered.length} cliente${filtered.length === 1 ? '' : 's'}`}
            </Text>
            <TouchableOpacity
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Ordenar y filtros"
              onPress={() => setModalFiltros(true)}
            >
              <Text style={[styles.toolbarLink, { color: c.primary }]}>Ordenar · filtros</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.filtroResumen, { color: c.foregroundSubtle }]} numberOfLines={1}>
            {filtroResumen}
          </Text>

          {loadError ? (
            <Text style={[styles.errTxt, { color: c.foregroundMuted }]}>{loadError}</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.md }} color={c.primary} />
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      setRefreshing(true);
                      loadClientes();
                    }}
                    tintColor={c.primary}
                  />
                }
                contentContainerStyle={{ paddingBottom: padList, flexGrow: filtered.length === 0 ? 1 : 0 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
                    {clientes.length === 0
                      ? 'No hay clientes registrados.'
                      : 'Ningún resultado con la búsqueda o filtros actuales.'}
                  </Text>
                }
                initialNumToRender={16}
                windowSize={8}
                removeClippedSubviews
              />
            </View>
          )}
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

      <Modal visible={!!detailCliente} animationType="slide" transparent onRequestClose={() => setDetailCliente(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={[styles.modalPad, { paddingBottom: insets.bottom + spacing.xl }]}>
            {detailCliente ? (
              <View style={[styles.modalCard, { backgroundColor: c.background }]}>
                <View style={styles.filterModalHead}>
                  <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Ficha de cliente</Text>
                  <TouchableOpacity onPress={() => setDetailCliente(null)} hitSlop={12}>
                    <X size={22} color={c.foregroundMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailPhotoWrap}>
                  {detailCliente.photo_url ? (
                    <Image source={{ uri: detailCliente.photo_url }} style={styles.detailPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.detailPhoto, styles.rowAvatarEmpty, { backgroundColor: c.surfaceMuted }]}>
                      <Text style={styles.detailPhotoLetter}>
                        {(detailCliente.nombre || '?').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                {[
                  ['Nombre', detailCliente.nombre],
                  ['Email', detailCliente.email],
                  ['Teléfono', detailCliente.telefono],
                  ['Dirección', detailCliente.direccion],
                  ['Cumpleaños', detailCliente.cumpleanos],
                  ['Categoría', detailCliente.categoria],
                  ['Puntos', detailCliente.puntos_fidelidad != null ? String(detailCliente.puntos_fidelidad) : null],
                  ['Origen', detailCliente.tipo_registro],
                  ['Notas', detailCliente.notas],
                ].map(([label, val]) =>
                  val ? (
                    <View key={label} style={styles.detailRow}>
                      <Text style={styles.detailLbl}>{label}</Text>
                      <Text style={styles.detailVal}>{String(val)}</Text>
                    </View>
                  ) : null,
                )}
                <SalonButton
                  title={exportingId === detailCliente.id ? 'Exportando…' : 'Exportar ficha y foto'}
                  variant="outlineGold"
                  fullWidth
                  disabled={exportingId === detailCliente.id}
                  onPress={() => void exportarCliente(detailCliente)}
                  style={{ marginTop: spacing.md }}
                />
                <SalonButton
                  title="Cerrar"
                  variant="outlineGray"
                  fullWidth
                  onPress={() => setDetailCliente(null)}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.background }]}>
            <View style={styles.filterModalHead}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12} accessibilityLabel="Cerrar">
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLbl}>Orden</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'nombre_asc', label: 'Nombre A → Z' },
                { id: 'nombre_desc', label: 'Nombre Z → A' },
                { id: 'reciente', label: 'Más recientes' },
              ].map((opt) => {
                const on = sortMode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setSortMode(opt.id)}
                  >
                    <Text style={[styles.filterChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.fieldLbl}>Origen</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'manual', label: 'Solo manual' },
                { id: 'app', label: 'Solo app clientes' },
              ].map((opt) => {
                const on = filterTipo === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilterTipo(opt.id)}
                  >
                    <Text style={[styles.filterChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalFiltros(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    body: {
      flex: 1,
      paddingHorizontal: spacing.sm,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    toolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    toolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    filtroResumen: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
      marginBottom: spacing.xs,
    },
    listShell: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
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
      fontSize: 14,
      minHeight: 40,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.xs,
    },
    errTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    emptyTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTopLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    rowAvatarWrap: {
      width: 34,
      height: 34,
      flexShrink: 0,
    },
    rowAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
    },
    rowAvatarEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowAvatarLetter: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    rowName: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    chip: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.pill,
      flexShrink: 0,
    },
    chipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
    },
    rowSub: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    rowChev: {
      flexShrink: 0,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalPad: { padding: spacing.md },
    modalCard: {
      borderRadius: radii.lg,
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
    filterModalHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    filterChipTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    detailPhotoWrap: {
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    detailPhoto: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    detailPhotoLetter: {
      fontFamily: typography.fontDisplay,
      fontSize: 36,
      color: c.foregroundMuted,
      lineHeight: 96,
      textAlign: 'center',
    },
    detailRow: {
      marginBottom: spacing.sm,
    },
    detailLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      color: c.foregroundMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    detailVal: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      color: c.foreground,
      lineHeight: 21,
    },
  });
}
