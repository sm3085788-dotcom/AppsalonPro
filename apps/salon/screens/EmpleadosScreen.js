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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, UserPlus } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { SubScreenChrome, SalonButton } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { db } from '@appsalon/shared-config';

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
  const [saving, setSaving] = useState(false);

  const loadEmpleados = useCallback(async () => {
    setLoadError(null);
    try {
      const { data, error } = await db.empleados.getAll();
      if (error) {
        setLoadError(error.message || 'No se pudo cargar el listado.');
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
    setModalEmpleado(true);
  }, []);

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
      if (editingId) {
        const { error } = await db.empleados.update(editingId, basePayload);
        if (error) {
          Alert.alert('No se guardó', error.message || 'Revisá permisos RLS (admin).');
          return;
        }
      } else {
        const { error } = await db.empleados.create({ ...basePayload, tipo_registro: 'manual' });
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

          <View style={styles.listShell}>
            <View style={styles.agendaToolbar}>
              <Text style={styles.agendaToolbarMeta}>
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
                <Text style={styles.agendaToolbarLink}>Ordenar · filtros</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: c.foregroundMuted }]} numberOfLines={2}>
              {resumenFiltros}
            </Text>

            {loadError ? (
              <Text style={{ color: c.foregroundMuted, marginBottom: spacing.sm }}>{loadError}</Text>
            ) : null}

            {loading ? (
              <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingBottom: padBottom, flexGrow: 1 }}
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
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => openEditar(item)}
                    style={[styles.row, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${item.nombre}`}
                  >
                    <View style={styles.rowTop}>
                      <Text style={[styles.nombre, { color: c.foreground }]} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      {item.activo === false ? (
                        <View style={[styles.badgeInactivo, { borderColor: c.cardBorder }]}>
                          <Text style={[styles.badgeInactivoTxt, { color: c.foregroundMuted }]}>Inactivo</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.rol, { color: c.foregroundMuted }]} numberOfLines={1}>
                      {item.rol || '—'}
                    </Text>
                    <Text style={[styles.meta, { color: c.foregroundSubtle }]} numberOfLines={1}>
                      {item.telefono || '—'} · {item.email || '—'}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ color: c.foregroundMuted, marginTop: spacing.md }}>Sin coincidencias.</Text>
                }
              />
            )}
          </View>
        </View>
      </SubScreenChrome>

      <Modal visible={modalEmpleado} animationType="slide" transparent onRequestClose={cerrarModalEmpleado}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.modalPad, { paddingBottom: insets.bottom + spacing.xl }]}
          >
            <View style={[styles.modalCard, { backgroundColor: c.background }]}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar empleado' : 'Nuevo empleado'}</Text>

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
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background }]}>
            <View style={styles.filterHead}>
              <Text style={styles.filterTitle}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionLbl}>Orden</Text>
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
            <Text style={styles.sectionLbl}>Rol</Text>
            <View style={styles.chipRow}>
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
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setRolFiltro(opt.id)}
                  >
                    <Text style={[styles.chipTxt, { color: on ? c.primary : c.foreground }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.sectionLbl}>Estado</Text>
            <View style={styles.chipRow}>
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
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setActivoFiltro(opt.id)}
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

function createStyles(c) {
  return StyleSheet.create({
    shell: { flex: 1 },
    body: { flex: 1 },
    search: {
      fontFamily: typography.fontSans,
      fontSize: 15,
      minHeight: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    listShell: {
      flex: 1,
      paddingTop: spacing.xs,
    },
    agendaToolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
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
    hint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.md,
    },
    row: {
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    nombre: { fontFamily: typography.fontSansMedium, fontSize: 16, flex: 1 },
    badgeInactivo: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    badgeInactivoTxt: { fontFamily: typography.fontSansMedium, fontSize: 11 },
    rol: { fontFamily: typography.fontSans, fontSize: 14, marginTop: 4 },
    meta: { fontFamily: typography.fontSans, fontSize: 12, marginTop: 2 },
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
    filterTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
      color: c.foreground,
    },
    sectionLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foreground,
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
