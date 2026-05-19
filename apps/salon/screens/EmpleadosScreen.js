import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Switch,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { X, UserPlus, ChevronRight, User, Image as ImageIcon } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { db, uploadEmpleadoFotoFromUri } from '@appsalon/shared-config';

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
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [modalEmpleado, setModalEmpleado] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [comisionStr, setComisionStr] = useState('0');
  const [direccion, setDireccion] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [telEmergencia, setTelEmergencia] = useState('');
  const [activo, setActivo] = useState(true);
  const [localFoto, setLocalFoto] = useState(null);
  const [remoteFoto, setRemoteFoto] = useState('');
  const [saving, setSaving] = useState(false);

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

  const resetForm = useCallback(() => {
    setEditingId(null);
    setNombre('');
    setRol('');
    setTelefono('');
    setEmail('');
    setComisionStr('0');
    setDireccion('');
    setContactoEmergencia('');
    setTelEmergencia('');
    setActivo(true);
    setLocalFoto(null);
    setRemoteFoto('');
  }, []);

  const openNuevo = useCallback(() => {
    resetForm();
    setModalEmpleado(true);
  }, [resetForm]);

  const openEditar = useCallback((item) => {
    setEditingId(item.id);
    setNombre(String(item.nombre || ''));
    setRol(String(item.rol || ''));
    setTelefono(String(item.telefono || ''));
    setEmail(String(item.email || ''));
    const com = item.comision_porcentaje;
    setComisionStr(com != null && com !== '' ? String(com) : '0');
    setDireccion(String(item.direccion || ''));
    setContactoEmergencia(String(item.contacto_emergencia || ''));
    setTelEmergencia(String(item.tel_emergencia || ''));
    setActivo(item.activo !== false);
    setLocalFoto(null);
    setRemoteFoto(item.foto_url || '');
    setModalEmpleado(true);
  }, []);

  const pickFoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Se necesita acceso a la galería para la foto.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.88 });
    if (!res.canceled && res.assets?.[0]) setLocalFoto(res.assets[0]);
  };

  const clearLocalFoto = () => setLocalFoto(null);
  const removeRemoteFoto = () => setRemoteFoto('');

  const cerrarModalEmpleado = useCallback(() => {
    setModalEmpleado(false);
    resetForm();
  }, [resetForm]);

  const guardarEmpleado = async () => {
    const nom = nombre.trim();
    if (!nom) {
      Alert.alert('Falta el nombre', 'El nombre es obligatorio en la tabla empleados.');
      return;
    }
    const basePayload = {
      nombre: nom,
      rol: rol.trim() || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      comision_porcentaje: parseComision(comisionStr),
      direccion: direccion.trim() || null,
      contacto_emergencia: contactoEmergencia.trim() || null,
      tel_emergencia: telEmergencia.trim() || null,
      activo,
    };

    setSaving(true);
    try {
      let foto_url = remoteFoto?.trim() || null;
      if (localFoto?.uri) {
        const ext = guessExt(localFoto.uri, localFoto.mimeType);
        const { publicUrl, error: upErr } = await uploadEmpleadoFotoFromUri(localFoto.uri, {
          extension: ext,
          contentType: localFoto.mimeType || 'image/jpeg',
        });
        if (upErr) {
          throw new Error(
            upErr.message ||
              'No se pudo subir la foto. Ejecutá supabase-empleados-foto.sql en Supabase (columna + bucket).',
          );
        }
        foto_url = publicUrl;
      }
      const payload = { ...basePayload, foto_url };

      if (editingId) {
        const { error } = await db.empleados.update(editingId, payload);
        if (error) {
          Alert.alert('No se guardó', error.message || 'Revisá permisos RLS (admin).');
          return;
        }
      } else {
        const { error } = await db.empleados.create({ ...payload, tipo_registro: 'manual' });
        if (error) {
          Alert.alert('No se guardó', error.message || 'Revisá permisos RLS (admin).');
          return;
        }
      }
      cerrarModalEmpleado();
      await loadEmpleados();
      Alert.alert('Listo', editingId ? 'Cambios guardados en Supabase.' : 'Empleado creado. Podés verificarlo en Table Editor.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminar = () => {
    if (!editingId) return;
    Alert.alert(
      'Eliminar empleado',
      'Se borrará la ficha en empleados. Si tiene citas o ventas vinculadas, Supabase puede rechazar el borrado por FK.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await db.empleados.delete(editingId);
              if (error) {
                Alert.alert('No se eliminó', error.message || 'Revisá dependencias en otras tablas.');
                return;
              }
              cerrarModalEmpleado();
              await loadEmpleados();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Intentá de nuevo.');
            } finally {
              setSaving(false);
            }
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

  const addIconColor = isDark ? '#141414' : c.foreground;
  const rightAction = (
    <TouchableOpacity
      style={[styles.addCircle, isDark && styles.addCircleDark]}
      onPress={openNuevo}
      accessibilityRole="button"
      accessibilityLabel="Nuevo empleado"
      activeOpacity={0.85}
    >
      <UserPlus size={22} color={addIconColor} strokeWidth={2.2} />
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
            <TouchableOpacity
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Ordenar y filtros"
              onPress={() => setModalFiltros(true)}
            >
              <Text style={[styles.toolbarLink, { color: c.primary }]}>Ordenar · filtros</Text>
            </TouchableOpacity>
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
                contentContainerStyle={{ paddingBottom: padBottom, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      setRefreshing(true);
                      loadEmpleados();
                    }}
                    tintColor={c.primary}
                  />
                }
                renderItem={({ item }) => {
                  const com = item.comision_porcentaje;
                  const comTxt =
                    com != null && com !== '' && Number(com) > 0 ? `Comisión ${Number(com)}%` : null;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openEditar(item)}
                      style={[styles.row, { borderBottomColor: c.cardBorder }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Editar ${item.nombre}`}
                    >
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
                      <ChevronRight size={16} color={c.foregroundSubtle} />
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
      </SubScreenChrome>

      <Modal visible={modalEmpleado} animationType="slide" transparent onRequestClose={cerrarModalEmpleado}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.modalPad, { paddingBottom: insets.bottom + spacing.xl }]}
          >
            <View style={[styles.modalCard, { backgroundColor: c.background }]}>
              <Text style={[styles.modalTitle, { color: c.foreground, marginBottom: spacing.md }]}>
                {editingId ? 'Editar empleado' : 'Nuevo empleado'}
              </Text>

              <Text style={[styles.fieldLbl, { color: c.foreground }]}>Foto</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md }}>
                {localFoto?.uri ? (
                  <View>
                    <Image source={{ uri: localFoto.uri }} style={styles.thumb} />
                    <TouchableOpacity onPress={clearLocalFoto} style={styles.thumbX}>
                      <X size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : remoteFoto ? (
                  <View>
                    <Image source={{ uri: remoteFoto }} style={styles.thumb} />
                    <TouchableOpacity onPress={removeRemoteFoto} style={styles.thumbX}>
                      <X size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.thumbPh, { borderColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                    <ImageIcon size={28} color={c.foregroundSubtle} strokeWidth={1.4} />
                  </View>
                )}
              </View>
              <SalonButton
                title="Elegir foto (galería)"
                variant="outlineGray"
                onPress={pickFoto}
                style={{ marginBottom: spacing.md }}
              />

              <Text style={styles.fieldLbl}>Nombre</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Nombre completo"
                placeholderTextColor={c.foregroundSubtle}
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLbl}>Rol (texto libre)</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Ej. Estilista, Recepción"
                placeholderTextColor={c.foregroundSubtle}
                value={rol}
                onChangeText={setRol}
              />

              <Text style={styles.fieldLbl}>Teléfono</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Opcional"
                placeholderTextColor={c.foregroundSubtle}
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLbl}>Email</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Opcional (no inicia sesión)"
                placeholderTextColor={c.foregroundSubtle}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.fieldLbl}>Comisión %</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="0"
                placeholderTextColor={c.foregroundSubtle}
                value={comisionStr}
                onChangeText={setComisionStr}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLbl}>Dirección</Text>
              <TextInput
                style={[styles.fieldInp, styles.fieldArea, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Opcional"
                placeholderTextColor={c.foregroundSubtle}
                value={direccion}
                onChangeText={setDireccion}
                multiline
              />

              <Text style={styles.fieldLbl}>Contacto de emergencia</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Nombre"
                placeholderTextColor={c.foregroundSubtle}
                value={contactoEmergencia}
                onChangeText={setContactoEmergencia}
              />

              <Text style={styles.fieldLbl}>Teléfono de emergencia</Text>
              <TextInput
                style={[styles.fieldInp, { borderColor: c.cardBorder, color: c.foreground, backgroundColor: c.card }]}
                placeholder="Opcional"
                placeholderTextColor={c.foregroundSubtle}
                value={telEmergencia}
                onChangeText={setTelEmergencia}
                keyboardType="phone-pad"
              />

              <View style={styles.switchRow}>
                <Text style={[styles.fieldLbl, { marginBottom: 0, flex: 1 }]}>Activo</Text>
                <Switch value={activo} onValueChange={setActivo} trackColor={{ false: c.cardBorder, true: c.primary }} />
              </View>

              <SalonButton
                title={saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear empleado'}
                variant="heroGold"
                fullWidth
                disabled={saving}
                onPress={guardarEmpleado}
              />
              {editingId ? (
                <SalonButton
                  title="Eliminar ficha"
                  variant="outlineGray"
                  fullWidth
                  disabled={saving}
                  onPress={confirmarEliminar}
                  style={{ marginTop: spacing.sm }}
                />
              ) : null}
              <SalonButton
                title="Cancelar"
                variant="outlineGray"
                fullWidth
                onPress={cerrarModalEmpleado}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.filterModalCard, { backgroundColor: c.background }]}>
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      padding: spacing.md,
    },
    modalPad: { padding: spacing.md },
    filterModalCard: {
      borderRadius: radii.lg,
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
      padding: spacing.lg,
      overflow: 'hidden',
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
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
