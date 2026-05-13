import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Building2, Plus, Search, X, Image as ImageIcon } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, uploadProveedorLogoFromUri } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { recordSalonDeletion } from '../services/salonBasurero';

function guessExt(uri, mime) {
  if (mime?.includes('png')) return 'png';
  if (mime?.includes('jpeg') || mime?.includes('jpg')) return 'jpg';
  const m = String(uri || '').match(/\.([a-z0-9]+)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

const emptyForm = () => ({
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
  localLogo: null,
  remoteLogo: '',
});

export function ProveedoresScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
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
      Alert.alert(
        'Proveedores',
        `${e?.message || 'No se pudo cargar.'}\n\nSi la tabla no tiene columnas nuevas (logo_url, etc.), ejecutá en Supabase el SQL sugerido en la ayuda al guardar.`,
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

  const openNew = () => {
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      nombre_compania: row.nombre_compania || '',
      nit: row.nit || '',
      telefono: row.telefono || '',
      nombre_agente: row.nombre_agente || '',
      telefono_agente: row.telefono_agente || '',
      email: row.email || '',
      sitio_web: row.sitio_web || '',
      direccion: row.direccion || '',
      notas: row.notas || '',
      localLogo: null,
      remoteLogo: row.logo_url || '',
    });
    setModalOpen(true);
  };

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Se necesita acceso a la galería para el logo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.88 });
    if (!res.canceled && res.assets?.[0]) setForm((f) => ({ ...f, localLogo: res.assets[0] }));
  };

  const clearLocalLogo = () => setForm((f) => ({ ...f, localLogo: null }));
  const removeRemoteLogo = () => setForm((f) => ({ ...f, remoteLogo: '' }));

  const eliminar = () => {
    if (!form.id) return;
    Alert.alert(
      'Eliminar proveedor',
      `¿Borrar "${form.nombre_compania.trim()}"? Se quitará de la base de datos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const snap = {
                id: form.id,
                nombre_compania: form.nombre_compania,
                nit: form.nit,
                telefono: form.telefono,
                nombre_agente: form.nombre_agente,
                telefono_agente: form.telefono_agente,
                email: form.email,
                sitio_web: form.sitio_web,
                direccion: form.direccion,
                notas: form.notas,
                remoteLogo: form.remoteLogo,
              };
              const { error } = await db.proveedores.delete(form.id);
              if (error) throw error;
              await recordSalonDeletion({
                source: 'proveedores',
                title: snap.nombre_compania || 'Proveedor',
                summary:
                  [form.nombre_agente, form.telefono_agente, form.email, form.telefono].filter(Boolean).join(' · ') ||
                  '',
                snapshot: snap,
              });
              setModalOpen(false);
              setForm(emptyForm());
              load(false);
              Alert.alert('Listo', 'Proveedor eliminado.');
            } catch (e) {
              Alert.alert('Error', e?.message || 'No se pudo eliminar.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const guardar = async () => {
    if (!form.nombre_compania.trim()) {
      Alert.alert('Nombre', 'El nombre de la compañía es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      let logo_url = form.remoteLogo?.trim() || null;
      if (form.localLogo?.uri) {
        const ext = guessExt(form.localLogo.uri, form.localLogo.mimeType);
        const { publicUrl, error: upErr } = await uploadProveedorLogoFromUri(form.localLogo.uri, {
          extension: ext,
          contentType: form.localLogo.mimeType || 'image/jpeg',
        });
        if (upErr) {
          throw new Error(
            upErr.message ||
              'No se pudo subir el logo. Creá el bucket Storage "proveedores" y políticas para staff.',
          );
        }
        logo_url = publicUrl;
      }

      const payload = {
        nombre_compania: form.nombre_compania.trim(),
        nit: form.nit.trim() || null,
        telefono: form.telefono.trim() || null,
        nombre_agente: form.nombre_agente.trim() || null,
        telefono_agente: form.telefono_agente.trim() || null,
        email: form.email.trim() || null,
        sitio_web: form.sitio_web.trim() || null,
        direccion: form.direccion.trim() || null,
        notas: form.notas.trim() || null,
        logo_url,
      };

      if (form.id) {
        const { error } = await db.proveedores.update(form.id, payload);
        if (error) throw error;
      } else {
        const { error } = await db.proveedores.create(payload);
        if (error) throw error;
      }

      setModalOpen(false);
      setForm(emptyForm());
      load(false);
      Alert.alert('Listo', form.id ? 'Proveedor actualizado.' : 'Proveedor creado.');
    } catch (e) {
      const hint =
        'Si falla por columnas faltantes, en Supabase SQL editor:\n\n' +
        'alter table proveedores add column if not exists logo_url text;\n' +
        'alter table proveedores add column if not exists telefono text;\n' +
        'alter table proveedores add column if not exists email text;\n' +
        'alter table proveedores add column if not exists direccion text;\n' +
        'alter table proveedores add column if not exists sitio_web text;\n' +
        'alter table proveedores add column if not exists notas text;\n' +
        'alter table proveedores add column if not exists nit text;\n' +
        'alter table proveedores add column if not exists nombre_agente text;\n' +
        'alter table proveedores add column if not exists telefono_agente text;';
      Alert.alert('Guardar', `${e?.message || 'Error'}\n\n${hint}`);
    } finally {
      setSaving(false);
    }
  };

  const addIconColor = isDark ? '#141414' : c.foreground;

  const rightAction = (
    <TouchableOpacity
      onPress={openNew}
      style={[styles.addCircle, isDark && styles.addCircleDark]}
      hitSlop={12}
      accessibilityLabel="Nuevo proveedor"
      activeOpacity={0.85}
    >
      <Plus size={22} color={addIconColor} strokeWidth={2.2} />
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, { borderColor: c.cardBorder, backgroundColor: c.card }]}
      onPress={() => openEdit(item)}
      activeOpacity={0.88}
    >
      {item.logo_url ? (
        <Image source={{ uri: item.logo_url }} style={styles.logo} resizeMode="cover" />
      ) : (
        <View style={[styles.logoPh, { backgroundColor: c.surfaceMuted }]}>
          <Building2 size={26} color={c.foregroundMuted} strokeWidth={1.6} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={2}>
          {item.nombre_compania || 'Sin nombre'}
        </Text>
        <Text style={[subStyles.muted, styles.rowMeta]} numberOfLines={1}>
          {[item.telefono, item.email].filter(Boolean).join(' · ') || 'Sin contacto empresa'}
        </Text>
        {item.nombre_agente || item.telefono_agente ? (
          <Text style={[subStyles.muted, styles.rowSub]} numberOfLines={1}>
            Agente: {[item.nombre_agente, item.telefono_agente].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {item.nit ? (
          <Text style={[subStyles.muted, styles.rowSub]} numberOfLines={1}>
            NIT · {item.nit}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

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
      >
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <View style={[styles.searchWrap, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
            <Search size={18} color={c.foregroundMuted} />
            <TextInput
              style={[styles.searchIn, { color: c.foreground }]}
              placeholder="Buscar compañía, NIT, agente, teléfonos…"
              placeholderTextColor={c.foregroundSubtle}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading ? '…' : `${filtered.length} compañía${filtered.length === 1 ? '' : 's'}`}
            </Text>
            <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)} accessibilityRole="button">
              <Text style={[styles.toolbarLink, { color: c.primary }]}>Ordenar · filtros</Text>
            </TouchableOpacity>
          </View>
          <Text style={[subStyles.muted, { fontSize: 12, lineHeight: 17, marginBottom: spacing.md }]} numberOfLines={2}>
            {filtroResumen}
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(r) => String(r.id)}
              renderItem={renderItem}
              onRefresh={() => load(true)}
              refreshing={refreshing}
              contentContainerStyle={{ paddingBottom: padBottom, flexGrow: 1 }}
              ListEmptyComponent={
                <Text style={subStyles.muted}>
                  {items.length === 0
                    ? 'No hay proveedores. Tocá + para registrar la primera compañía con su logo.'
                    : 'Ningún resultado con la búsqueda o filtros actuales.'}
                </Text>
              }
            />
          )}
        </View>
      </SubScreenChrome>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <View style={[styles.modalHead, { borderBottomColor: c.cardBorder, paddingTop: insets.top + spacing.sm }]}>
          <Text style={[styles.modalTitle, { color: c.foreground }]}>
            {form.id ? 'Editar compañía' : 'Nueva compañía'}
          </Text>
          <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={12}>
            <X size={24} color={c.foreground} />
          </TouchableOpacity>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: padBottom + 40 }}
        >
          <Text style={[subStyles.rowLabel, { marginBottom: spacing.sm }]}>Logo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md }}>
            {form.localLogo?.uri ? (
              <View>
                <Image source={{ uri: form.localLogo.uri }} style={styles.thumb} />
                <TouchableOpacity onPress={clearLocalLogo} style={styles.thumbX}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : form.remoteLogo ? (
              <View>
                <Image source={{ uri: form.remoteLogo }} style={styles.thumb} />
                <TouchableOpacity onPress={removeRemoteLogo} style={styles.thumbX}>
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.thumbPh, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                <ImageIcon size={28} color={c.foregroundSubtle} strokeWidth={1.4} />
              </View>
            )}
          </View>
          <SalonButton title="Elegir logo (galería)" variant="outlineGray" onPress={pickLogo} />

          <Field label="Nombre de la compañía *" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.nombre_compania}
              onChangeText={(t) => setForm((f) => ({ ...f, nombre_compania: t }))}
              placeholder="Ej. Distribuidora Keraplús"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="NIT / tax ID" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.nit}
              onChangeText={(t) => setForm((f) => ({ ...f, nit: t }))}
              placeholder="Opcional"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Teléfono de la compañía" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.telefono}
              onChangeText={(t) => setForm((f) => ({ ...f, telefono: t }))}
              keyboardType="phone-pad"
              placeholder="Central / recepción del proveedor"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Nombre del agente (contacto)" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.nombre_agente}
              onChangeText={(t) => setForm((f) => ({ ...f, nombre_agente: t }))}
              placeholder="Ej. vendedor o ejecutivo de cuenta"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Teléfono del agente" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.telefono_agente}
              onChangeText={(t) => setForm((f) => ({ ...f, telefono_agente: t }))}
              keyboardType="phone-pad"
              placeholder="Móvil o directo del contacto"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Correo" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.email}
              onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Sitio web" c={c}>
            <TextInput
              style={[styles.inp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.sitio_web}
              onChangeText={(t) => setForm((f) => ({ ...f, sitio_web: t }))}
              autoCapitalize="none"
              placeholder="https://…"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Dirección / bodega" c={c}>
            <TextInput
              style={[styles.inp, styles.area, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.direccion}
              onChangeText={(t) => setForm((f) => ({ ...f, direccion: t }))}
              multiline
              textAlignVertical="top"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>
          <Field label="Notas internas" c={c}>
            <TextInput
              style={[styles.inp, styles.area, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
              value={form.notas}
              onChangeText={(t) => setForm((f) => ({ ...f, notas: t }))}
              multiline
              textAlignVertical="top"
              placeholder="Condiciones de pago, vendedor asignado…"
              placeholderTextColor={c.foregroundSubtle}
            />
          </Field>

          {form.id ? (
            <SalonButton
              title="Eliminar proveedor"
              variant="outlineGray"
              fullWidth
              onPress={eliminar}
              style={{ marginBottom: spacing.sm }}
            />
          ) : null}
          <SalonButton
            title={saving ? 'Guardando…' : 'Guardar'}
            variant="heroGold"
            fullWidth
            loading={saving}
            onPress={guardar}
          />
        </ScrollView>
      </Modal>

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background }]}>
            <View style={styles.filterHead}>
              <Text style={[styles.filterTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Orden</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'nombre_asc', label: 'Nombre A → Z' },
                { id: 'nombre_desc', label: 'Nombre Z → A' },
              ].map((opt) => {
                const on = sortMode === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setSortMode(opt.id)}
                  >
                    <Text style={[styles.chipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Logo</Text>
            <View style={styles.chipRow}>
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
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilterLogo(opt.id)}
                  >
                    <Text style={[styles.chipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
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

function Field({ label, children, c }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: typography.fontSansMedium, fontSize: 13, color: c.foreground, marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    addCircle: {
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
    addCircleDark: {
      borderColor: 'rgba(255,255,255,0.35)',
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      minHeight: 46,
      marginBottom: spacing.sm,
    },
    searchIn: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 15,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    toolbarMeta: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    toolbarLink: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    logo: {
      width: 56,
      height: 56,
      borderRadius: radii.md,
      backgroundColor: c.surfaceMuted,
    },
    logoPh: {
      width: 56,
      height: 56,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: { fontFamily: typography.fontSansMedium, fontSize: 16 },
    rowMeta: { fontSize: 13, marginTop: 4 },
    rowSub: { fontSize: 12, marginTop: 2 },
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
    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    filterSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
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
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    chipTxt: { fontFamily: typography.fontSansMedium, fontSize: 13 },
  });
}
