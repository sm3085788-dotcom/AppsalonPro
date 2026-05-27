import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Building2, Plus, X, ChevronRight, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, uploadProveedorLogoFromUri } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, modalSheetBottomPad } from '../components/luxury';
import { SalonFichaSheet } from '../components/SalonFichaSheet';
import { useTheme } from '../theme/ThemeProvider';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { useListSelection } from '../hooks/useListSelection';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';

function guessExt(uri, mime) {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'jpg';
  const m = String(uri || '').match(/\.([a-z0-9]+)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

function emptyProveedor() {
  return {
    id: null,
    nombre_compania: '',
    nit: '',
    telefono: '',
    nombre_agente: '',
    telefono_agente: '',
    email: '',
    sitio_web: '',
    direccion: '',
    notas: '',
    logo_url: '',
  };
}

function proveedorPayloadFrom(record, patch = {}) {
  const m = { ...record, ...patch };
  return {
    nombre_compania: String(m.nombre_compania || '').trim(),
    nit: m.nit != null && String(m.nit).trim() !== '' ? String(m.nit).trim() : null,
    telefono: m.telefono != null && String(m.telefono).trim() !== '' ? String(m.telefono).trim() : null,
    nombre_agente:
      m.nombre_agente != null && String(m.nombre_agente).trim() !== ''
        ? String(m.nombre_agente).trim()
        : null,
    telefono_agente:
      m.telefono_agente != null && String(m.telefono_agente).trim() !== ''
        ? String(m.telefono_agente).trim()
        : null,
    email: m.email != null && String(m.email).trim() !== '' ? String(m.email).trim() : null,
    sitio_web: m.sitio_web != null && String(m.sitio_web).trim() !== '' ? String(m.sitio_web).trim() : null,
    direccion: m.direccion != null && String(m.direccion).trim() !== '' ? String(m.direccion).trim() : null,
    notas: m.notas != null && String(m.notas).trim() !== '' ? String(m.notas).trim() : null,
    logo_url: m.logo_url != null && String(m.logo_url).trim() !== '' ? String(m.logo_url).trim() : null,
  };
}

const PROVEEDOR_FICHA_FIELDS = [
  {
    key: 'nombre_compania',
    label: 'Compañía',
    getValue: (r) => r.nombre_compania,
    required: true,
    alwaysShow: true,
  },
  { key: 'nit', label: 'NIT / tax ID', getValue: (r) => r.nit, alwaysShow: true },
  { key: 'telefono', label: 'Teléfono compañía', getValue: (r) => r.telefono, alwaysShow: true, keyboardType: 'phone-pad' },
  { key: 'nombre_agente', label: 'Agente (contacto)', getValue: (r) => r.nombre_agente, alwaysShow: true },
  {
    key: 'telefono_agente',
    label: 'Teléfono agente',
    getValue: (r) => r.telefono_agente,
    alwaysShow: true,
    keyboardType: 'phone-pad',
  },
  {
    key: 'email',
    label: 'Correo',
    getValue: (r) => r.email,
    alwaysShow: true,
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoCorrect: false,
  },
  {
    key: 'sitio_web',
    label: 'Sitio web',
    getValue: (r) => r.sitio_web,
    alwaysShow: true,
    autoCapitalize: 'none',
    placeholder: 'https://…',
  },
  { key: 'direccion', label: 'Dirección / bodega', getValue: (r) => r.direccion, alwaysShow: true, multiline: true },
  {
    key: 'notas',
    label: 'Notas internas',
    getValue: (r) => r.notas,
    alwaysShow: true,
    multiline: true,
    placeholder: 'Condiciones de pago, vendedor…',
  },
];

export function ProveedoresScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const sel = useListSelection();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [detailProveedor, setDetailProveedor] = useState(null);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const creatingRef = useRef(false);
  const [sortMode, setSortMode] = useState('nombre_asc');
  const [filterLogo, setFilterLogo] = useState('todos');

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await db.proveedores.getAll();
      if (error) throw error;
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e?.message || 'No se pudo cargar.';
      const faltaTabla = /could not find the table|relation.*does not exist/i.test(msg);
      Alert.alert(
        'Proveedores',
        faltaTabla
          ? `${msg}\n\nLa tabla aún no existe en Supabase. Abrí el proyecto → SQL Editor y ejecutá el archivo supabase-proveedores-setup.sql de la raíz del repo (crea tabla, permisos y bucket de logos).`
          : `${msg}\n\nSi faltan columnas (logo_url, etc.), ejecutá supabase-proveedores-setup.sql en Supabase SQL Editor.`,
      );
      setItems([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const filtroResumen = useMemo(() => {
    const orden = sortMode === 'nombre_desc' ? 'Nombre Z → A' : 'Nombre A → Z';
    const logo =
      filterLogo === 'con_logo' ? 'Con logo' : filterLogo === 'sin_logo' ? 'Sin logo' : 'Todos';
    return `${orden} · ${logo}`;
  }, [sortMode, filterLogo]);

  const filtered = useMemo(() => {
    let rows = [...items];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const blob = [
          r.nombre_compania,
          r.nit,
          r.telefono,
          r.nombre_agente,
          r.telefono_agente,
          r.email,
          r.sitio_web,
          r.direccion,
          r.notas,
        ]
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    if (filterLogo === 'con_logo') {
      rows = rows.filter((r) => String(r.logo_url || '').trim().length > 0);
    } else if (filterLogo === 'sin_logo') {
      rows = rows.filter((r) => !String(r.logo_url || '').trim());
    }
    rows.sort((a, b) => {
      const cmp = String(a.nombre_compania || '').localeCompare(String(b.nombre_compania || ''), 'es', {
        sensitivity: 'base',
      });
      return sortMode === 'nombre_desc' ? -cmp : cmp;
    });
    return rows;
  }, [items, query, sortMode, filterLogo]);

  const closeDetail = useCallback(() => setDetailProveedor(null), []);

  const openNew = useCallback(() => setDetailProveedor(emptyProveedor()), []);

  const openEdit = useCallback((row) => setDetailProveedor({ ...row }), []);

  const syncProveedorInList = useCallback((updated) => {
    setDetailProveedor(updated);
    if (!updated?.id) return;
    setItems((prev) => {
      const ix = prev.findIndex((p) => String(p.id) === String(updated.id));
      if (ix >= 0) {
        const next = [...prev];
        next[ix] = { ...next[ix], ...updated };
        return next;
      }
      return [updated, ...prev];
    });
  }, []);

  const saveProveedorField = useCallback(
    async (key, value, field) => {
      const cur = detailProveedor;
      if (!cur) return { ok: false };

      if (!cur.id) {
        const merged = { ...cur, [key]: value };
        setDetailProveedor(merged);
        return { ok: true, record: merged };
      }

      if (field?.required && (value == null || String(value).trim() === '')) {
        Alert.alert('Dato obligatorio', `Completá ${field.label.toLowerCase()}.`);
        return { ok: false };
      }

      setSavingKey(key);
      try {
        const merged = { ...cur, [key]: value };
        const payload = proveedorPayloadFrom(merged);
        const { data, error } = await db.proveedores.update(cur.id, payload);
        if (error) throw error;
        const updated = data || { ...cur, ...merged, logo_url: payload.logo_url };
        syncProveedorInList(updated);
        return { ok: true, record: updated };
      } catch (e) {
        const hint =
          'Si falla por tabla o columnas, ejecutá supabase-proveedores-setup.sql en Supabase SQL Editor.';
        Alert.alert('Guardar', `${e?.message || 'Error'}\n\n${hint}`);
        return { ok: false, error: e?.message };
      } finally {
        setSavingKey(null);
      }
    },
    [detailProveedor, syncProveedorInList],
  );

  const crearProveedor = useCallback(async () => {
    const cur = detailProveedor;
    if (!cur || cur.id || creatingRef.current || savingKey) return;
    const nom = String(cur.nombre_compania || '').trim();
    if (!nom) {
      Alert.alert('Falta el nombre', 'Completá el nombre de la compañía y tocá «Crear compañía».');
      return;
    }
    creatingRef.current = true;
    setSavingKey('create');
    try {
      const payload = proveedorPayloadFrom({ ...cur, nombre_compania: nom });
      const { data, error } = await db.proveedores.create(payload);
      if (error) throw error;
      setDetailProveedor(data);
      await load(false);
      Alert.alert('Listo', 'Proveedor creado.');
    } catch (e) {
      const hint =
        'Si falla por tabla o columnas, ejecutá supabase-proveedores-setup.sql en Supabase SQL Editor.';
      Alert.alert('Guardar', `${e?.message || 'Error'}\n\n${hint}`);
    } finally {
      creatingRef.current = false;
      setSavingKey(null);
    }
  }, [detailProveedor, load, savingKey]);

  const pickLogo = useCallback(async () => {
    const cur = detailProveedor;
    if (!cur?.id) {
      Alert.alert('Logo', 'Primero guardá el nombre de la compañía; después podés subir el logo.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Se necesita acceso a la galería para el logo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.88 });
    if (res.canceled || !res.assets?.[0]) return;

    setLogoUploading(true);
    try {
      const asset = res.assets[0];
      const ext = guessExt(asset.uri, asset.mimeType);
      const { publicUrl, error: upErr } = await uploadProveedorLogoFromUri(asset.uri, {
        extension: ext,
        contentType: asset.mimeType || 'image/jpeg',
      });
      if (upErr) throw new Error(upErr.message);
      const payload = proveedorPayloadFrom(cur, { logo_url: publicUrl });
      const { data, error } = await db.proveedores.update(cur.id, payload);
      if (error) throw error;
      syncProveedorInList(data || { ...cur, logo_url: publicUrl });
    } catch (e) {
      Alert.alert('Logo', e?.message || 'No se pudo subir.');
    } finally {
      setLogoUploading(false);
    }
  }, [detailProveedor, syncProveedorInList]);

  const eliminar = () => {
    if (!detailProveedor?.id) return;
    const row = items.find((p) => String(p.id) === String(detailProveedor.id)) || detailProveedor;
    Alert.alert(
      'Eliminar proveedor',
      `¿Borrar «${row.nombre_compania || 'proveedor'}»? Se guardará copia en Basurero.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setSavingKey('delete');
            try {
              const r = await deleteRowWithBasurero('proveedores', row, () => db.proveedores.delete(row.id));
              if (!r.ok) throw new Error(r.error);
              closeDetail();
              load(false);
              Alert.alert('Listo', 'Proveedor eliminado.');
            } catch (e) {
              Alert.alert('Error', e?.message || 'No se pudo eliminar.');
            } finally {
              setSavingKey(null);
            }
          },
        },
      ],
    );
  };

  const rightAction = (
    <TouchableOpacity
      onPress={openNew}
      style={styles.addCircle}
      hitSlop={12}
      accessibilityLabel="Nuevo proveedor"
      activeOpacity={0.85}
    >
      <Plus size={22} color={c.foreground} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar proveedores',
      `¿Eliminar ${sel.count} compañía(s)? Copia en Basurero antes del borrado.`,
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
              const row = items.find((p) => String(p.id) === String(id));
              if (!row) continue;
              const r = await deleteRowWithBasurero('proveedores', row, () => db.proveedores.delete(row.id));
              if (r.ok) ok += 1;
              else errs.push(r.error);
            }
            sel.exitSelectMode();
            await load(false);
            setDeleteBusy(false);
            if (errs.length) Alert.alert('Parcial', `Eliminados: ${ok}. Fallos: ${errs.length}.`);
            else Alert.alert('Listo', ok === 1 ? 'Proveedor eliminado.' : `Se eliminaron ${ok}.`);
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const contacto = [item.telefono, item.email].filter(Boolean).join(' · ') || 'Sin contacto';
    const agente =
      item.nombre_agente || item.telefono_agente
        ? `Agente: ${[item.nombre_agente, item.telefono_agente].filter(Boolean).join(' · ')}`
        : null;
    const picked = sel.isSelected(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (sel.active) sel.toggleId(item.id);
          else openEdit(item);
        }}
        onLongPress={() => {
          if (!sel.active) sel.setActive(true);
          sel.toggleId(item.id);
        }}
        style={[styles.row, { borderBottomColor: c.cardBorder }, picked && { backgroundColor: c.surfaceMuted }]}
        accessibilityRole="button"
        accessibilityLabel={sel.active ? `Seleccionar ${item.nombre_compania}` : `Editar ${item.nombre_compania}`}
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
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.logo} resizeMode="cover" />
        ) : (
          <View style={[styles.logoPh, { backgroundColor: c.surfaceMuted }]}>
            <Building2 size={16} color={c.foregroundMuted} strokeWidth={1.6} />
          </View>
        )}
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
              {item.nombre_compania || 'Sin nombre'}
            </Text>
            <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
              {item.nit ? `NIT ${item.nit}` : '—'}
            </Text>
          </View>
          <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
            {contacto}
          </Text>
          {agente ? (
            <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
              {agente}
            </Text>
          ) : null}
        </View>
        {!sel.active ? <ChevronRight size={16} color={c.foregroundSubtle} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Proveedores"
        subtitle="Compañías que abastecen al salón: datos de la empresa, agente de cuenta (nombre y teléfono) y logo."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        rightAction={rightAction}
        edgeToEdge
      >
        <View style={styles.body}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar compañía, NIT, agente, teléfonos…"
            placeholderTextColor={c.foregroundSubtle}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            accessibilityLabel="Buscar proveedores"
          />

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading ? 'Cargando…' : `${filtered.length} compañía${filtered.length === 1 ? '' : 's'}`}
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
            {filtroResumen}
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={filtered}
                keyExtractor={(r) => String(r.id)}
                renderItem={renderItem}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => load(true)}
                    tintColor={c.primary}
                    colors={[c.primary]}
                    progressBackgroundColor={c.card}
                  />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: sel.count ? 100 : padBottom, flexGrow: 1 }}
                ListEmptyComponent={
                  <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
                    {items.length === 0
                      ? 'No hay proveedores. Tocá + para registrar la primera compañía.'
                      : 'Ningún resultado con la búsqueda o filtros actuales.'}
                  </Text>
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
        visible={!!detailProveedor}
        onClose={closeDetail}
        title={detailProveedor?.id ? 'Ficha de proveedor' : 'Nueva compañía'}
        colors={c}
        insets={insets}
        record={detailProveedor}
        fields={PROVEEDOR_FICHA_FIELDS}
        onSaveField={saveProveedorField}
        savingKey={logoUploading ? 'logo' : savingKey}
        isNew={!!detailProveedor && !detailProveedor.id}
        initialEditKey="nombre_compania"
        newHint="Completá los datos (se guardan en esta pantalla) y tocá «Crear compañía» para registrar en Supabase."
        photo={{
          uri: detailProveedor?.logo_url || undefined,
          letter: (detailProveedor?.nombre_compania || '?').trim().charAt(0).toUpperCase(),
          onPress: detailProveedor?.id ? pickLogo : undefined,
        }}
        footer={
          <>
            {detailProveedor && !detailProveedor.id ? (
              <SalonButton
                title={savingKey === 'create' ? 'Creando…' : 'Crear compañía'}
                variant="heroGold"
                fullWidth
                disabled={!!savingKey}
                onPress={() => void crearProveedor()}
                style={{ marginTop: spacing.md }}
              />
            ) : null}
            {detailProveedor?.id ? (
              <SalonButton
                title="Eliminar proveedor"
                variant="outlineGray"
                fullWidth
                disabled={!!savingKey}
                onPress={eliminar}
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
          <View style={[styles.filterModalCard, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.filterHead}>
              <Text style={[styles.filterTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Orden</Text>
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
            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Logo</Text>
            <View style={styles.typeGrid}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'con_logo', label: 'Con logo' },
                { id: 'sin_logo', label: 'Sin logo' },
              ].map((opt) => {
                const on = filterLogo === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.typeChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilterLogo(opt.id)}
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
      backgroundColor: c.background,
    },
    search: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 11 : 9,
      fontFamily: typography.fontSans,
      fontSize: 15,
      marginBottom: spacing.sm,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    toolbarMeta: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    toolbarLink: { fontFamily: typography.fontSansMedium, fontSize: 13 },
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
    logo: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      backgroundColor: c.surfaceMuted,
    },
    logoPh: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
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
      backgroundColor: c.card,
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    filterModalCard: {
      borderRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      maxHeight: '92%',
    },
    modalShell: { flex: 1 },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontFamily: typography.fontDisplay, fontSize: 22 },
    inp: {
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontFamily: typography.fontSans,
      fontSize: 15,
    },
    area: { minHeight: 88, textAlignVertical: 'top' },
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
    filterHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    filterTitle: { fontFamily: typography.fontDisplay, fontSize: 20 },
    sectionLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    typeChip: {
      minWidth: '47%',
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    typeChipTxt: { fontFamily: typography.fontSansMedium, fontSize: 13 },
  });
}
