import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { X, UserPlus, ChevronRight, User, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, SalonButton, modalSheetBottomPad } from '../components/luxury';
import { SalonFichaSheet } from '../components/SalonFichaSheet';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { useTheme } from '../theme/ThemeProvider';
import { db, uploadEmpleadoFotoFromUri } from '@appsalon/shared-config';

function mensajeErrorStorage(msg) {
  const m = String(msg || '').toLowerCase();
  if (m.includes('bucket not found') || m.includes('bucket') && m.includes('not found')) {
    return (
      'Falta el bucket «empleados» en Supabase Storage.\n\n' +
      '1. Entrá a tu proyecto en supabase.com\n' +
      '2. SQL Editor → pegá y ejecutá el archivo supabase-empleados-foto.sql (raíz del proyecto)\n' +
      '   O en Storage → Create bucket → nombre: empleados → Public\n' +
      '3. Volvé a la app y guardá de nuevo la foto.'
    );
  }
  if (/foto_url|column.*does not exist/i.test(msg || '')) {
    return `${msg}\n\nEjecutá también supabase-empleados-foto.sql (añade la columna foto_url).`;
  }
  return msg || 'No se pudo subir la foto.';
}

function guessExt(uri, mime) {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'jpg';
  const m = String(uri || '').match(/\.([a-z0-9]+)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

function parseComision(str) {
  const n = parseFloat(String(str || '').replace(',', '.').trim());
  if (Number.isNaN(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function emptyEmpleado() {
  return {
    id: null,
    nombre: '',
    rol: '',
    telefono: '',
    email: '',
    comision_porcentaje: 0,
    direccion: '',
    contacto_emergencia: '',
    tel_emergencia: '',
    activo: true,
    foto_url: '',
  };
}

const EMPLEADO_FICHA_FIELDS = [
  { key: 'nombre', label: 'Nombre', getValue: (r) => r.nombre, required: true, alwaysShow: true, autoCapitalize: 'words' },
  { key: 'rol', label: 'Rol', getValue: (r) => r.rol, alwaysShow: true, placeholder: 'Ej. Estilista, Recepción' },
  { key: 'telefono', label: 'Teléfono', getValue: (r) => r.telefono, alwaysShow: true, keyboardType: 'phone-pad' },
  { key: 'email', label: 'Email', getValue: (r) => r.email, alwaysShow: true, keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false },
  {
    key: 'comision_porcentaje',
    label: 'Comisión',
    getValue: (r) => r.comision_porcentaje,
    alwaysShow: true,
    keyboardType: 'decimal-pad',
    parse: (s) => parseComision(s),
    formatDisplay: (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? `${n}%` : '0%';
    },
    getEditDraft: (r) => String(r.comision_porcentaje ?? 0),
  },
  { key: 'direccion', label: 'Dirección', getValue: (r) => r.direccion, alwaysShow: true, multiline: true },
  { key: 'contacto_emergencia', label: 'Contacto de emergencia', getValue: (r) => r.contacto_emergencia, alwaysShow: true },
  { key: 'tel_emergencia', label: 'Teléfono de emergencia', getValue: (r) => r.tel_emergencia, alwaysShow: true, keyboardType: 'phone-pad' },
  { key: 'activo', label: 'Activo', type: 'switch', getValue: (r) => r.activo !== false, alwaysShow: true },
];

export function EmpleadosScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);
  const [search, setSearch] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortMode, setSortMode] = useState('nombre_asc');
  const [rolFiltro, setRolFiltro] = useState('todos');
  const [activoFiltro, setActivoFiltro] = useState('todos');
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const sel = useListSelection();
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [detailEmpleado, setDetailEmpleado] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [fotoUploading, setFotoUploading] = useState(false);
  const creatingRef = useRef(false);

  const loadEmpleados = useCallback(async () => {
    setLoadError(null);
    try {
      const { data, error } = await db.empleados.getAll();
      if (error) {
        const msg = error.message || 'No se pudo cargar el listado.';
        const faltaFoto = /foto_url|column.*does not exist/i.test(msg);
        setLoadError(
          faltaFoto
            ? `${msg}\n\nEjecutá supabase-empleados-foto.sql en Supabase (columna foto_url + bucket Storage).`
            : msg,
        );
        setEmpleados([]);
        return;
      }
      setEmpleados(Array.isArray(data) ? data : []);
    } catch (e) {
      setLoadError(e?.message || 'Error de red');
      setEmpleados([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEmpleados();
  }, [loadEmpleados]);

  const closeDetail = useCallback(() => setDetailEmpleado(null), []);

  const openNuevo = useCallback(() => {
    setDetailEmpleado(emptyEmpleado());
  }, []);

  const openEditar = useCallback((item) => {
    setDetailEmpleado({ ...item });
  }, []);

  const syncEmpleadoInList = useCallback((updated) => {
    setDetailEmpleado(updated);
    if (!updated?.id) return;
    setEmpleados((prev) => {
      const ix = prev.findIndex((e) => String(e.id) === String(updated.id));
      if (ix >= 0) {
        const next = [...prev];
        next[ix] = { ...next[ix], ...updated };
        return next;
      }
      return [updated, ...prev];
    });
  }, []);

  const saveEmpleadoField = useCallback(
    async (key, value, field) => {
      const cur = detailEmpleado;
      if (!cur) return { ok: false };

      if (!cur.id) {
        let val = value;
        if (key === 'nombre') val = String(value || '').trim();
        if (key === 'comision_porcentaje') val = parseComision(String(value ?? ''));
        if (key === 'activo') val = value === true || value === 'true' || value === 1;
        if (key === 'direccion') {
          val = value != null && String(value).trim() !== '' ? String(value).trim() : '';
        } else if (['rol', 'telefono', 'email', 'contacto_emergencia', 'tel_emergencia'].includes(key)) {
          val = value != null && String(value).trim() !== '' ? String(value).trim() : '';
        }
        const merged = { ...cur, [key]: val };
        setDetailEmpleado(merged);
        return { ok: true, record: merged };
      }

      if (field?.required && (value == null || String(value).trim() === '')) {
        Alert.alert('Dato obligatorio', `Completá ${field.label.toLowerCase()}.`);
        return { ok: false };
      }

      setSavingKey(key);
      try {
        const patch = { [key]: value };
        if (key === 'nombre') patch.nombre = String(value || '').trim();
        if (key === 'comision_porcentaje') patch.comision_porcentaje = parseComision(String(value ?? ''));
        if (key === 'direccion') {
          patch.direccion = value != null && String(value).trim() !== '' ? String(value).trim() : null;
        } else if (key === 'rol' || key === 'telefono' || key === 'email') {
          patch[key] = value != null && String(value).trim() !== '' ? String(value).trim() : null;
        }
        if (key === 'contacto_emergencia' || key === 'tel_emergencia') {
          patch[key] = value != null && String(value).trim() !== '' ? String(value).trim() : null;
        }
        if (key === 'activo') patch.activo = value === true || value === 'true' || value === 1;

        const { data, error } = await db.empleados.update(cur.id, patch);
        if (error) {
          Alert.alert('No se guardó', error.message || 'Revisá permisos RLS.');
          return { ok: false, error: error.message };
        }
        const updated = data || { ...cur, ...patch };
        syncEmpleadoInList(updated);
        return { ok: true, record: updated };
      } catch (e) {
        Alert.alert('Error', e?.message || 'Intentá de nuevo.');
        return { ok: false, error: e?.message };
      } finally {
        setSavingKey(null);
      }
    },
    [detailEmpleado, syncEmpleadoInList],
  );

  const crearEmpleado = useCallback(async () => {
    const cur = detailEmpleado;
    if (!cur || cur.id || creatingRef.current || savingKey) return;
    const nom = String(cur.nombre || '').trim();
    if (!nom) {
      Alert.alert('Falta el nombre', 'Completá el nombre del empleado y tocá «Crear empleado».');
      return;
    }
    creatingRef.current = true;
    setSavingKey('create');
    try {
      const { data, error } = await db.empleados.create({
        nombre: nom,
        rol: cur.rol?.trim() || null,
        telefono: cur.telefono?.trim() || null,
        email: cur.email?.trim() || null,
        comision_porcentaje: parseComision(String(cur.comision_porcentaje ?? 0)),
        direccion: cur.direccion != null && String(cur.direccion).trim() !== '' ? String(cur.direccion).trim() : null,
        contacto_emergencia: cur.contacto_emergencia?.trim() || null,
        tel_emergencia: cur.tel_emergencia?.trim() || null,
        activo: cur.activo !== false,
        foto_url: null,
        tipo_registro: 'manual',
      });
      if (error) {
        Alert.alert('No se creó', error.message || 'Revisá permisos RLS.');
        return;
      }
      setDetailEmpleado(data);
      await loadEmpleados();
      Alert.alert('Listo', 'Empleado creado.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Intentá de nuevo.');
    } finally {
      creatingRef.current = false;
      setSavingKey(null);
    }
  }, [detailEmpleado, loadEmpleados, savingKey]);

  const pickFoto = useCallback(async () => {
    const cur = detailEmpleado;
    if (!cur?.id) {
      Alert.alert('Foto', 'Primero completá el nombre; después podés agregar la foto al crear el empleado.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Se necesita acceso a la galería para la foto.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.88 });
    if (res.canceled || !res.assets?.[0]) return;

    setFotoUploading(true);
    try {
      const asset = res.assets[0];
      const ext = guessExt(asset.uri, asset.mimeType);
      const { publicUrl, error: upErr } = await uploadEmpleadoFotoFromUri(asset.uri, {
        extension: ext,
        contentType: asset.mimeType || 'image/jpeg',
      });
      if (upErr) throw new Error(mensajeErrorStorage(upErr.message));
      const { data, error } = await db.empleados.update(cur.id, { foto_url: publicUrl });
      if (error) throw new Error(error.message);
      syncEmpleadoInList(data || { ...cur, foto_url: publicUrl });
    } catch (e) {
      Alert.alert('Foto', e?.message || 'No se pudo subir.');
    } finally {
      setFotoUploading(false);
    }
  }, [detailEmpleado, syncEmpleadoInList]);

  const confirmarEliminar = () => {
    if (!detailEmpleado?.id) return;
    const row = empleados.find((e) => String(e.id) === String(detailEmpleado.id)) || detailEmpleado;
    Alert.alert(
      'Eliminar empleado',
      'Se borrará la ficha en empleados y se guardará una copia en Basurero. Si tiene citas o ventas vinculadas, Supabase puede rechazar el borrado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setSavingKey('delete');
            try {
              const r = await deleteRowWithBasurero('empleados', row, () => db.empleados.delete(row.id));
              if (!r.ok) {
                Alert.alert('No se eliminó', r.error || 'Revisá dependencias en otras tablas.');
                return;
              }
              closeDetail();
              await loadEmpleados();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Intentá de nuevo.');
            } finally {
              setSavingKey(null);
            }
          },
        },
      ],
    );
  };

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar empleados',
      `¿Eliminar ${sel.count} ficha(s)? Copia en Basurero antes del borrado en Supabase.`,
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
              const row = empleados.find((e) => String(e.id) === String(id));
              if (!row) continue;
              const r = await deleteRowWithBasurero('empleados', row, () => db.empleados.delete(row.id));
              if (r.ok) ok += 1;
              else errs.push(r.error);
            }
            sel.exitSelectMode();
            await loadEmpleados();
            setDeleteBusy(false);
            if (errs.length) Alert.alert('Parcial', `Eliminados: ${ok}. Fallos: ${errs.length}.`);
            else Alert.alert('Listo', ok === 1 ? 'Empleado eliminado.' : `Se eliminaron ${ok} fichas.`);
          },
        },
      ],
    );
  };

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const resumenFiltros = useMemo(() => {
    const s = sortMode === 'nombre_desc' ? 'Nombre Z → A' : 'Nombre A → Z';
    const r =
      rolFiltro === 'todos'
        ? 'Todos los roles'
        : rolFiltro === 'estilista'
          ? 'Estilistas'
          : rolFiltro === 'colorista'
            ? 'Coloristas'
            : 'Recepción';
    const a =
      activoFiltro === 'activos' ? 'Solo activos' : activoFiltro === 'inactivos' ? 'Solo inactivos' : 'Activos e inactivos';
    return `${s} · ${r} · ${a}`;
  }, [sortMode, rolFiltro, activoFiltro]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = [...empleados];
    if (q) {
      rows = rows.filter((e) => {
        const blob = [e.nombre, e.rol, e.email, e.telefono].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    if (rolFiltro === 'estilista') rows = rows.filter((e) => String(e.rol || '').toLowerCase().includes('estilista'));
    if (rolFiltro === 'colorista') rows = rows.filter((e) => String(e.rol || '').toLowerCase().includes('colorista'));
    if (rolFiltro === 'recepcion') {
      rows = rows.filter(
        (e) =>
          String(e.rol || '').toLowerCase().includes('recepción') ||
          String(e.rol || '').toLowerCase().includes('recepcion'),
      );
    }
    if (activoFiltro === 'activos') rows = rows.filter((e) => e.activo !== false);
    if (activoFiltro === 'inactivos') rows = rows.filter((e) => e.activo === false);
    rows.sort((a, b) => {
      const cmp = String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' });
      return sortMode === 'nombre_desc' ? -cmp : cmp;
    });
    return rows;
  }, [empleados, search, sortMode, rolFiltro, activoFiltro]);

  const rightAction = (
    <TouchableOpacity
      style={[styles.addCircle, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      onPress={openNuevo}
      accessibilityRole="button"
      accessibilityLabel="Nuevo empleado"
      activeOpacity={0.85}
    >
      <UserPlus size={22} color={c.foreground} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Empleados"
        subtitle="Fichas manuales en Supabase; no crean cuenta Auth ni perfil verificado."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        rightAction={rightAction}
        edgeToEdge
      >
        <View style={styles.body}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar por nombre, rol, teléfono o email…"
            placeholderTextColor={c.foregroundSubtle}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            accessibilityLabel="Buscar empleados"
          />

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading
                ? 'Cargando…'
                : `${filtered.length} ficha${filtered.length === 1 ? '' : 's'} de ${empleados.length}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
              <Text style={{ color: c.foregroundSubtle }}> · </Text>
              <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)}>
                <Text style={[styles.toolbarLink, { color: c.primary }]}>Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.filtroResumen, { color: c.foregroundMuted }]} numberOfLines={2}>
            {resumenFiltros}
          </Text>

          {loadError ? (
            <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>{loadError}</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingBottom: sel.count ? 100 : padBottom, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      setRefreshing(true);
                      loadEmpleados();
                    }}
                    tintColor={c.primary}
                    colors={[c.primary]}
                    progressBackgroundColor={c.card}
                  />
                }
                renderItem={({ item }) => {
                  const com = item.comision_porcentaje;
                  const comTxt =
                    com != null && com !== '' && Number(com) > 0 ? `Comisión ${Number(com)}%` : null;
                  const picked = sel.isSelected(item.id);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        if (sel.active) sel.toggleId(item.id);
                        else openEditar(item);
                      }}
                      onLongPress={() => {
                        if (!sel.active) sel.setActive(true);
                        sel.toggleId(item.id);
                      }}
                      style={[
                        styles.row,
                        { borderBottomColor: c.cardBorder },
                        picked && { backgroundColor: c.surfaceMuted },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={sel.active ? `Seleccionar ${item.nombre}` : `Editar ${item.nombre}`}
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
                      {item.foto_url ? (
                        <Image source={{ uri: item.foto_url }} style={styles.avatar} resizeMode="cover" />
                      ) : (
                        <View style={[styles.avatarPh, { backgroundColor: c.surfaceMuted }]}>
                          <User size={16} color={c.foregroundMuted} strokeWidth={1.6} />
                        </View>
                      )}
                      <View style={styles.rowBody}>
                        <View style={styles.rowTop}>
                          <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
                            {item.nombre}
                          </Text>
                          <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
                            {item.activo === false ? 'Inactivo' : item.rol || 'Sin rol'}
                          </Text>
                        </View>
                        <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
                          {item.telefono || '—'} · {item.email || '—'}
                        </Text>
                        {comTxt ? (
                          <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
                            {comTxt}
                          </Text>
                        ) : null}
                      </View>
                      {!sel.active ? <ChevronRight size={16} color={c.foregroundSubtle} /> : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>Sin coincidencias.</Text>
                }
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

      <SalonFichaSheet
        visible={!!detailEmpleado}
        onClose={closeDetail}
        title={detailEmpleado?.id ? 'Ficha de empleado' : 'Nuevo empleado'}
        colors={c}
        insets={insets}
        record={detailEmpleado}
        fields={EMPLEADO_FICHA_FIELDS}
        onSaveField={saveEmpleadoField}
        savingKey={fotoUploading ? 'foto' : savingKey}
        isNew={!!detailEmpleado && !detailEmpleado.id}
        initialEditKey="nombre"
        advanceOnEnter
        newHint="Completá los datos (Enter pasa al siguiente campo; en dirección Enter es nueva línea). Luego «Crear empleado»."
        photo={{
          uri: detailEmpleado?.foto_url || undefined,
          onPress: detailEmpleado?.id ? pickFoto : undefined,
        }}
        footer={
          <>
            {detailEmpleado && !detailEmpleado.id ? (
              <SalonButton
                title={savingKey === 'create' ? 'Creando…' : 'Crear empleado'}
                variant="heroGold"
                fullWidth
                disabled={!!savingKey}
                onPress={() => void crearEmpleado()}
                style={{ marginTop: spacing.md }}
              />
            ) : null}
            {detailEmpleado?.id ? (
              <SalonButton
                title="Eliminar ficha"
                variant="outlineGray"
                fullWidth
                disabled={!!savingKey}
                onPress={confirmarEliminar}
                style={{ marginTop: spacing.md }}
                textStyle={{ color: c.error }}
              />
            ) : null}
            <SalonButton
              title="Cerrar"
              variant="outlineGray"
              fullWidth
              onPress={closeDetail}
              style={{ marginTop: spacing.sm }}
            />
          </>
        }
      />

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.filterModalCard,
              { backgroundColor: c.background, borderColor: c.cardBorder, paddingBottom: modalSheetBottomPad(insets) },
            ]}
          >
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLbl, { color: c.foreground }]}>Orden</Text>
            <View style={styles.typeGrid}>
              {[
                { id: 'nombre_asc', label: 'Nombre A → Z' },
                { id: 'nombre_desc', label: 'Nombre Z → A' },
              ].map((opt) => {
                const on = sortMode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.typeChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setSortMode(opt.id)}
                  >
                    <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.fieldLbl, { color: c.foreground }]}>Rol</Text>
            <View style={styles.typeGrid}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'estilista', label: 'Estilista' },
                { id: 'colorista', label: 'Colorista' },
                { id: 'recepcion', label: 'Recepción' },
              ].map((opt) => {
                const on = rolFiltro === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.typeChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setRolFiltro(opt.id)}
                  >
                    <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.fieldLbl, { color: c.foreground }]}>Estado</Text>
            <View style={styles.typeGrid}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'activos', label: 'Solo activos' },
                { id: 'inactivos', label: 'Solo inactivos' },
              ].map((opt) => {
                const on = activoFiltro === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.typeChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setActivoFiltro(opt.id)}
                  >
                    <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
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
      paddingTop: spacing.xs,
      backgroundColor: c.background,
    },
    search: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    toolbarMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    toolbarLink: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
    },
    filtroResumen: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    listShell: {
      flex: 1,
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      backgroundColor: c.surfaceMuted,
    },
    avatarPh: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumb: { width: 96, height: 96, borderRadius: radii.md },
    thumbPh: {
      width: 96,
      height: 96,
      borderRadius: radii.md,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbX: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 12,
      padding: 4,
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
    rowBody: { flex: 1, minWidth: 0 },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    rowTitle: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    rowMeta: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
    },
    rowSub: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 2,
    },
    emptyTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 19,
      padding: spacing.md,
    },
    addCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    modalPad: { padding: spacing.md },
    filterModalCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      maxHeight: '92%',
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    modalCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.lg,
      overflow: 'hidden',
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
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
      minHeight: 80,
      paddingTop: spacing.sm,
      textAlignVertical: 'top',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    typeChip: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      minWidth: '47%',
    },
    typeChipTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
    },
  });
}
