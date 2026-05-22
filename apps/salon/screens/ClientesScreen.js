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
import { UserPlus, Calendar, X, ChevronRight, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, MEMBRESIA_TIERS, membresiaLabel, isClienteAppVerificado } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, modalSheetBottomPad, modalScrollBottomPad } from '../components/luxury';
import { SalonFichaSheet } from '../components/SalonFichaSheet';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { MembresiaBadge } from '../components/MembresiaBadge';
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

const CLIENTE_FICHA_FIELDS = [
  { key: 'nombre', label: 'Nombre', getValue: (r) => r.nombre, required: true, alwaysShow: true, autoCapitalize: 'words' },
  { key: 'email', label: 'Email', getValue: (r) => r.email, alwaysShow: true, keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false },
  { key: 'telefono', label: 'Teléfono', getValue: (r) => r.telefono, alwaysShow: true, keyboardType: 'phone-pad' },
  { key: 'direccion', label: 'Dirección', getValue: (r) => r.direccion, alwaysShow: true, multiline: true },
  { key: 'cumpleanos', label: 'Cumpleaños', getValue: (r) => r.cumpleanos, alwaysShow: true, placeholder: 'Ej. 1990-05-15' },
  { key: 'categoria', label: 'Categoría', getValue: (r) => r.categoria, alwaysShow: true },
  {
    key: 'puntos_fidelidad',
    label: 'Puntos',
    getValue: (r) => r.puntos_fidelidad,
    alwaysShow: true,
    keyboardType: 'number-pad',
    parse: (s) => {
      const n = parseInt(String(s || '').replace(/\D/g, ''), 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    },
    formatDisplay: (v) => (v != null && v !== '' ? String(v) : '0'),
    getEditDraft: (r) => String(r.puntos_fidelidad ?? 0),
  },
];

export function ClientesScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const [clientes, setClientes] = useState([]);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const sel = useListSelection();
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
  const [email, setEmail] = useState('');
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
  const [codigosPendientes, setCodigosPendientes] = useState([]);
  const [nivelCodigo, setNivelCodigo] = useState('bronce');
  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  const [asignandoMembresia, setAsignandoMembresia] = useState(false);
  const [savingClienteKey, setSavingClienteKey] = useState(null);

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
        const blob = [
          row.nombre,
          row.telefono,
          row.email,
          row.direccion,
          row.notas,
          row.membresia_nivel ? membresiaLabel(row.membresia_nivel) : null,
        ]
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

  const loadCodigosPendientes = useCallback(async (clienteId) => {
    if (!clienteId) {
      setCodigosPendientes([]);
      return;
    }
    const { data } = await db.membresias.listCodigosPendientes(clienteId);
    setCodigosPendientes(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (!detailCliente?.id) {
      setCodigosPendientes([]);
      return;
    }
    if (detailCliente.membresia_nivel) {
      setNivelCodigo(String(detailCliente.membresia_nivel).toLowerCase());
    }
    if (isClienteAppVerificado(detailCliente)) {
      void loadCodigosPendientes(detailCliente.id);
    } else {
      setCodigosPendientes([]);
    }
  }, [detailCliente, loadCodigosPendientes]);

  const asignarMembresiaManual = async () => {
    if (!detailCliente?.id) return;
    setAsignandoMembresia(true);
    const { data, error } = await db.membresias.asignarDirecta({
      clienteId: detailCliente.id,
      nivel: nivelCodigo,
    });
    setAsignandoMembresia(false);
    if (error) {
      Alert.alert('No se asignó', error.message || 'Intentá de nuevo.');
      return;
    }
    const actualizado = data || { ...detailCliente, membresia_nivel: nivelCodigo };
    setDetailCliente(actualizado);
    setClientes((prev) => prev.map((c) => (c.id === actualizado.id ? { ...c, ...actualizado } : c)));
    Alert.alert('Listo', `Membresía ${membresiaLabel(nivelCodigo)} asignada en la ficha (sin código).`);
  };

  const syncClienteInList = useCallback((updated) => {
    setDetailCliente(updated);
    setClientes((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
  }, []);

  const saveClienteField = useCallback(
    async (key, value, field) => {
      if (!detailCliente?.id) return { ok: false };
      if (field?.required && (value == null || String(value).trim() === '')) {
        Alert.alert('Dato obligatorio', `Completá ${field.label.toLowerCase()}.`);
        return { ok: false };
      }
      setSavingClienteKey(key);
      try {
        const patch = { [key]: value };
        if (key === 'nombre') patch.nombre = String(value || '').trim();
        if (['email', 'telefono', 'direccion', 'cumpleanos', 'categoria'].includes(key)) {
          patch[key] = value != null && String(value).trim() !== '' ? String(value).trim() : null;
        }
        const { data, error } = await db.clientes.update(detailCliente.id, patch);
        if (error) {
          Alert.alert('No se guardó', error.message || 'Intentá de nuevo.');
          return { ok: false, error: error.message };
        }
        syncClienteInList(data || { ...detailCliente, ...patch });
        return { ok: true, record: data };
      } catch (e) {
        Alert.alert('Error', e?.message || 'Intentá de nuevo.');
        return { ok: false, error: e?.message };
      } finally {
        setSavingClienteKey(null);
      }
    },
    [detailCliente, syncClienteInList],
  );

  const generarCodigoMembresia = async () => {
    if (!detailCliente?.id) return;
    if (!isClienteAppVerificado(detailCliente)) {
      Alert.alert(
        'Cliente manual',
        'Este cliente no tiene App Clientes vinculada. Usá «Asignar membresía» para fijar el nivel en la ficha.',
      );
      return;
    }
    setGenerandoCodigo(true);
    const { data, error } = await db.membresias.crearCodigo({
      nivel: nivelCodigo,
      clienteId: detailCliente.id,
    });
    setGenerandoCodigo(false);
    if (error) {
      const msg = error.message || '';
      if (msg.includes('membresia_codigos') || msg.includes('does not exist')) {
        Alert.alert(
          'Base de datos',
          'Ejecutá supabase-membresias-setup.sql en Supabase para habilitar códigos de membresía.',
        );
      } else {
        Alert.alert('No se generó', msg || 'Intentá de nuevo.');
      }
      return;
    }
    await loadCodigosPendientes(detailCliente.id);
    Alert.alert(
      'Código para el cliente',
      `Nivel ${membresiaLabel(nivelCodigo)}:\n\n${data.codigo}\n\nEl cliente debe ingresarlo en App Clientes → Membresías.`,
      [{ text: 'Entendido' }],
    );
  };

  const openManual = useCallback(() => {
    setNombre('');
    setTelefono('');
    setEmail('');
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
    const em = email.trim().toLowerCase();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      Alert.alert('Correo inválido', 'Revisá el formato del correo electrónico o dejalo vacío.');
      return;
    }
    const cumple = nacimiento.toISOString().split('T')[0];
    setSaving(true);
    try {
      const { error } = await db.clientes.create({
        nombre: nom,
        telefono: tel,
        email: em || null,
        direccion: dir,
        cumpleanos: cumple,
        tipo_registro: 'manual_panel_tercera_edad',
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

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar clientes',
      `¿Eliminar ${sel.count} cliente(s)? Copia en Basurero. Puede fallar si hay citas o ventas vinculadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleteBusy(true);
            let ok = 0;
            const errs = [];
            for (const id of sel.selectedIds) {
              const row = clientes.find((x) => String(x.id) === String(id));
              if (!row) continue;
              const r = await deleteRowWithBasurero('clientes', row, () => db.clientes.delete(row.id));
              if (r.ok) ok += 1;
              else errs.push(r.error);
            }
            sel.exitSelectMode();
            await loadClientes();
            setDeleteBusy(false);
            if (errs.length) Alert.alert('Parcial', `Eliminados: ${ok}. Fallos: ${errs.length}.`);
            else Alert.alert('Listo', ok === 1 ? 'Cliente eliminado.' : `Se eliminaron ${ok}.`);
          },
        },
      ],
    );
  };

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
      const picked = sel.isSelected(item.id);

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (sel.active) sel.toggleId(item.id);
            else setDetailCliente(item);
          }}
          onLongPress={() => {
            if (!sel.active) sel.setActive(true);
            sel.toggleId(item.id);
          }}
          style={[styles.row, { borderBottomColor: c.cardBorder }, picked && { backgroundColor: c.surfaceMuted }]}
        >
          {sel.active ? (
            <View
              style={[
                styles.check,
                {
                  borderColor: picked ? c.primary : c.cardBorder,
                  backgroundColor: picked ? c.primary : 'transparent',
                },
              ]}
            >
              {picked ? <Check size={14} color={isDark ? '#141414' : '#fff'} strokeWidth={3} /> : null}
            </View>
          ) : null}
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
              <View style={styles.rowChips}>
                {item.membresia_nivel ? <MembresiaBadge nivel={item.membresia_nivel} compact /> : null}
                <View style={[styles.chip, { backgroundColor: manual ? MINT.chip : c.surfaceMuted }]}>
                  <Text style={[styles.chipTxt, { color: manual ? '#1B5E20' : c.foregroundMuted }]}>
                    {manual ? 'Manual' : 'App'}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
              {subParts.length ? subParts.join(' · ') : 'Sin contacto'}
            </Text>
          </View>
          {!sel.active ? <ChevronRight size={16} color={c.foregroundSubtle} style={styles.rowChev} /> : null}
        </TouchableOpacity>
      );
    },
    [c, isDark, sel, styles],
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
              <Text style={{ color: c.foregroundSubtle }}> · </Text>
              <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)}>
                <Text style={[styles.toolbarLink, { color: c.primary }]}>Filtros</Text>
              </TouchableOpacity>
            </View>
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
                contentContainerStyle={{
                  paddingBottom: sel.count ? 100 : padList,
                  flexGrow: filtered.length === 0 ? 1 : 0,
                }}
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
        {sel.active && sel.count > 0 ? (
          <ListSelectionActionBar
            count={sel.count}
            onCancel={sel.exitSelectMode}
            onConfirm={confirmDeleteSelected}
            confirmLabel={deleteBusy ? 'Eliminando…' : 'Eliminar'}
            confirmTextStyle={{ color: c.error }}
            confirmStyle={{ borderColor: c.error }}
            colors={c}
            bottomInset={insets.bottom}
          />
        ) : null}
      </SubScreenChrome>

      <Modal visible={modalManual} animationType="slide" transparent onRequestClose={closeManual}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.modalPad, { paddingBottom: modalScrollBottomPad(insets) }]}
          >
            <View style={[styles.modalCard, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
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

              <Text style={styles.fieldLbl}>Correo electrónico (opcional)</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ej. maria.lopez@correo.com"
                placeholderTextColor={c.foregroundSubtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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

      <SalonFichaSheet
        visible={!!detailCliente}
        onClose={() => setDetailCliente(null)}
        title="Ficha de cliente"
        colors={c}
        insets={insets}
        record={detailCliente}
        fields={CLIENTE_FICHA_FIELDS}
        onSaveField={saveClienteField}
        savingKey={savingClienteKey}
        photo={{
          uri: detailCliente?.photo_url || undefined,
          letter: (detailCliente?.nombre || '?').trim().charAt(0).toUpperCase(),
        }}
        extraContent={
          detailCliente ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLbl}>Membresía</Text>
                <Text style={styles.detailVal}>
                  {detailCliente.membresia_nivel
                    ? membresiaLabel(detailCliente.membresia_nivel)
                    : 'Sin activar'}
                </Text>
              </View>
              {(() => {
                const conApp = isClienteAppVerificado(detailCliente);
                return (
                  <View style={[styles.membresiaBlock, { borderColor: c.cardBorder }]}>
                    <Text style={[styles.membresiaBlockTitle, { color: c.foreground }]}>
                      {conApp ? 'Membresía · App Clientes' : 'Membresía · ficha manual'}
                    </Text>
                    <Text style={[styles.membresiaBlockHint, { color: c.foregroundMuted }]}>
                      {conApp
                        ? 'Generá un código para que el cliente lo active en App Clientes → Membresías.'
                        : 'Cliente sin cuenta en la app: asigná el nivel directo en la ficha (no usa código).'}
                    </Text>
                    <View style={styles.chipRow}>
                      {MEMBRESIA_TIERS.map((t) => {
                        const on = nivelCodigo === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={[
                              styles.filterChip,
                              {
                                borderColor: on ? t.accent : c.cardBorder,
                                backgroundColor: on ? `${t.accent}18` : c.card,
                              },
                            ]}
                            onPress={() => setNivelCodigo(t.id)}
                          >
                            <Text style={[styles.filterChipTxt, { color: on ? t.accent : c.foreground }]}>
                              {t.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {conApp ? (
                      <>
                        <SalonButton
                          title={
                            generandoCodigo ? 'Generando…' : `Generar código ${membresiaLabel(nivelCodigo) || ''}`
                          }
                          variant="heroGold"
                          fullWidth
                          disabled={generandoCodigo || asignandoMembresia}
                          onPress={() => void generarCodigoMembresia()}
                          style={{ marginTop: spacing.xs }}
                        />
                        {codigosPendientes.length > 0 ? (
                          <View style={{ marginTop: spacing.sm }}>
                            <Text
                              style={[styles.membresiaBlockHint, { color: c.foregroundMuted, marginBottom: 4 }]}
                            >
                              Códigos pendientes de activar:
                            </Text>
                            {codigosPendientes.map((row) => (
                              <Text
                                key={row.id}
                                style={[styles.codigoPendiente, { color: c.primary }]}
                                selectable
                              >
                                {row.codigo} · {membresiaLabel(row.nivel)}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <SalonButton
                        title={
                          asignandoMembresia
                            ? 'Guardando…'
                            : `Asignar membresía ${membresiaLabel(nivelCodigo) || ''}`
                        }
                        variant="heroGold"
                        fullWidth
                        disabled={asignandoMembresia || generandoCodigo}
                        onPress={() => void asignarMembresiaManual()}
                        style={{ marginTop: spacing.xs }}
                      />
                    )}
                  </View>
                );
              })()}
            </>
          ) : null
        }
        footer={
          detailCliente ? (
            <>
              <SalonButton
                title={exportingId === detailCliente.id ? 'Generando PDF…' : 'Exportar PDF (ficha y foto)'}
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
            </>
          ) : null
        }
      />

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
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
    rowChips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
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
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.xs,
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
    membresiaBlock: {
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    membresiaBlockTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      marginBottom: 4,
    },
    membresiaBlockHint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.sm,
    },
    codigoPendiente: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
  });
}
