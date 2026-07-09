import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, FileCheck, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, modalSheetBottomPad } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';
import { offerUneteEquipoRevisadoWhatsApp } from '../utils/salonStaffWhatsApp';

const BRANCH_LABELS = {
  coloracion: 'Coloración',
  maquillaje: 'Maquillaje',
  cejas: 'Cejas',
  manicure: 'Manicure',
  pedicure: 'Pedicure',
  planchado: 'Planchado',
  cuidado_capilar: 'Cuidado capilar',
  higiene: 'Higiene',
  spa_masaje: 'Masaje',
  spa_corporal: 'Tratamiento corporal',
  spa_relajacion: 'Relajación y aromaterapia',
  skincare_facial: 'Facial',
  skincare_limpieza: 'Limpieza profunda',
  skincare_hidratacion: 'Hidratación y nutrición',
  recepcion_administrativa: 'Habilidad administrativa',
  recepcion_atencion: 'Atención al cliente',
  recepcion_agenda: 'Agenda y citas',
  recepcion_cobros: 'Cobros y POS',
  recepcion_multitarea: 'Atención al cliente y coordinación simultánea bajo presión',
  spas: 'Spas',
  skincare: 'Skincare',
  pestanas: 'Pestañas',
  corte_peinado: 'Corte y peinado',
};

const MODALIDAD_LABELS = {
  empleado_directo: 'Empleado directo',
  socio_co_dependiente: 'Socio co-dependiente',
};

const ESTADO_LABELS = {
  enviado: 'Pendiente',
  recibido: 'Recibido',
  revisado: 'Revisado',
};

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'enviado', label: 'Pendientes' },
  { id: 'recibido', label: 'Recibidas' },
  { id: 'revisado', label: 'Revisadas' },
];

const SORT_OPTIONS = [
  { id: 'reciente', label: 'Más recientes' },
  { id: 'nombre_asc', label: 'Nombre A → Z' },
  { id: 'nombre_desc', label: 'Nombre Z → A' },
];

function branchList(experiencia) {
  if (!experiencia || typeof experiencia !== 'object') return [];
  return Object.entries(experiencia)
    .filter(([, v]) => v)
    .map(([k]) => BRANCH_LABELS[k] || k);
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function ageFromBirthdate(isoOrDate) {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function formatBirthdate(isoOrDate) {
  if (!isoOrDate) return '';
  try {
    return new Date(isoOrDate).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(isoOrDate);
  }
}

function clienteNombre(item) {
  return String(item?.cliente?.nombre || '').trim() || 'Cliente web';
}

function SolicitudFieldLine({ label, value, lineStyle, labelStyle }) {
  if (value == null || value === '') return null;
  return (
    <Text style={lineStyle}>
      <Text style={labelStyle}>{label}: </Text>
      {value}
    </Text>
  );
}

export function UneteEquipoScreen({ onBack, onSeen }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);
  const [filter, setFilter] = useState('all');
  const [sortMode, setSortMode] = useState('reciente');
  const [search, setSearch] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.uneteEquipo.listSolicitudes(null);
    if (error) {
      Alert.alert('Solicitudes', error.message || 'No se pudo cargar.');
      setSolicitudes([]);
    } else {
      setSolicitudes(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onSeen?.();
  }, [onSeen]);

  const pendientes = useMemo(
    () => solicitudes.filter((s) => s.estado === 'enviado').length,
    [solicitudes],
  );

  const filtroResumen = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)?.label || 'Todas';
    const s = SORT_OPTIONS.find((x) => x.id === sortMode)?.label || 'Más recientes';
    const pending =
      filter !== 'enviado' && pendientes > 0 ? ` · ${pendientes} pendiente${pendientes === 1 ? '' : 's'}` : '';
    return `${f} · ${s}${pending}`;
  }, [filter, sortMode, pendientes]);

  const filteredSolicitudes = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = solicitudes.filter((item) => {
      if (filter !== 'all' && item.estado !== filter) return false;
      if (!q) return true;
      const nombre = clienteNombre(item).toLowerCase();
      const email = String(item.cliente?.email || '').toLowerCase();
      const tel = String(item.cliente?.telefono || '').toLowerCase();
      return nombre.includes(q) || email.includes(q) || tel.includes(q);
    });

    rows = [...rows];
    if (sortMode === 'nombre_asc') {
      rows.sort((a, b) => clienteNombre(a).localeCompare(clienteNombre(b), 'es'));
    } else if (sortMode === 'nombre_desc') {
      rows.sort((a, b) => clienteNombre(b).localeCompare(clienteNombre(a), 'es'));
    } else {
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return rows;
  }, [solicitudes, filter, search, sortMode]);

  const updateEstado = async (item, estado) => {
    const { error } = await db.uneteEquipo.updateEstado(item.id, estado);
    if (error) {
      Alert.alert('Actualizar', error.message || 'No se pudo actualizar.');
      return;
    }
    await load();
    if (estado === 'revisado' && item?.cliente?.telefono) {
      void offerUneteEquipoRevisadoWhatsApp({
        telefono: item.cliente.telefono,
        clienteNombre: clienteNombre(item),
      });
    }
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Únete al Equipo"
        subtitle="Solicitudes de reclutamiento desde la web"
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        edgeToEdge
      >
        <View style={styles.body}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar por nombre…"
            placeholderTextColor={c.foregroundSubtle}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            accessibilityLabel="Buscar solicitudes por nombre"
          />

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading ? '…' : `${filteredSolicitudes.length} solicitud${filteredSolicitudes.length === 1 ? '' : 'es'}`}
            </Text>
            <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)}>
              <Text style={[styles.toolbarLink, { color: c.primary }]}>Ordenar y filtrar</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.filtroResumen, { color: c.foregroundSubtle }]} numberOfLines={1}>
            {filtroResumen}
          </Text>

          <FlatList
            data={filteredSolicitudes}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={c.primary} />
            }
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator color={c.primary} style={{ marginTop: spacing.lg }} />
              ) : (
                <Text style={styles.empty}>
                  {search.trim()
                    ? 'Ningún resultado con ese nombre.'
                    : 'Sin solicitudes con este filtro.'}
                </Text>
              )
            }
            renderItem={({ item }) => {
              const ramas = branchList(item.experiencia_ramas);
              const cliente = item.cliente || {};
              const edad = ageFromBirthdate(cliente.cumpleanos);
              const direccion = String(cliente.direccion || '').trim();
              return (
                <View style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                  <Text style={styles.cardTitle}>{clienteNombre(item)}</Text>
                  <Text style={styles.cardSub}>
                    {ESTADO_LABELS[item.estado] || item.estado} · {formatDate(item.created_at)}
                  </Text>
                  {cliente.telefono ? (
                    <SolicitudFieldLine
                      label="Tel"
                      value={cliente.telefono}
                      lineStyle={styles.cardLine}
                      labelStyle={styles.cardLabel}
                    />
                  ) : null}
                  {cliente.email ? (
                    <SolicitudFieldLine
                      label="Email"
                      value={cliente.email}
                      lineStyle={styles.cardLine}
                      labelStyle={styles.cardLabel}
                    />
                  ) : null}
                  {edad != null ? (
                    <SolicitudFieldLine
                      label="Edad"
                      value={`${edad} años`}
                      lineStyle={styles.cardLine}
                      labelStyle={styles.cardLabel}
                    />
                  ) : cliente.cumpleanos ? (
                    <SolicitudFieldLine
                      label="Cumpleaños"
                      value={formatBirthdate(cliente.cumpleanos)}
                      lineStyle={styles.cardLine}
                      labelStyle={styles.cardLabel}
                    />
                  ) : null}
                  {direccion ? (
                    <SolicitudFieldLine
                      label="Dirección"
                      value={direccion}
                      lineStyle={styles.cardLine}
                      labelStyle={styles.cardLabel}
                    />
                  ) : null}
                  {ramas.length > 0 ? (
                    <SolicitudFieldLine
                      label="Experiencia"
                      value={ramas.join(' · ')}
                      lineStyle={styles.cardLine}
                      labelStyle={styles.cardLabel}
                    />
                  ) : null}
                  {item.rama_destacada ? (
                    <SolicitudFieldLine
                      label="Servicios destacados"
                      value={BRANCH_LABELS[item.rama_destacada] || item.rama_destacada}
                      lineStyle={styles.cardLine}
                      labelStyle={styles.cardLabel}
                    />
                  ) : null}
                  <SolicitudFieldLine
                    label="Modalidad"
                    value={MODALIDAD_LABELS[item.modalidad] || item.modalidad}
                    lineStyle={styles.cardLine}
                    labelStyle={styles.cardLabel}
                  />
                  {item.mensaje ? <Text style={styles.cardMsg}>{item.mensaje}</Text> : null}

                  {item.estado === 'enviado' ? (
                    <SalonButton
                      title="Confirmar recibido"
                      variant="outlineGold"
                      fullWidth
                      style={{ marginTop: spacing.sm }}
                      onPress={() => void updateEstado(item, 'recibido')}
                    />
                  ) : null}
                  {item.estado === 'recibido' ? (
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => void updateEstado(item, 'revisado')}
                    >
                      <FileCheck size={16} color="#2E7D32" />
                      <Text style={styles.reviewTxt}>Documentación revisada</Text>
                    </TouchableOpacity>
                  ) : null}
                  {item.estado === 'revisado' ? (
                    <View style={styles.doneRow}>
                      <View style={styles.doneRowMain}>
                        <Check size={16} color="#2E7D32" />
                        <Text style={styles.doneTxt}>Revisión completada</Text>
                      </View>
                      {cliente.telefono ? (
                        <TouchableOpacity
                          hitSlop={10}
                          onPress={() =>
                            void offerUneteEquipoRevisadoWhatsApp({
                              telefono: cliente.telefono,
                              clienteNombre: clienteNombre(item),
                            })
                          }
                          accessibilityLabel="Avisar por WhatsApp"
                        >
                          <Text style={[styles.waLink, { color: c.primary }]}>WhatsApp</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        </View>
      </SubScreenChrome>

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) },
            ]}
          >
            <View style={styles.filterModalHead}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12} accessibilityLabel="Cerrar">
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLbl, { color: c.foregroundMuted }]}>Estado</Text>
            <View style={styles.chipRow}>
              {FILTERS.map((f) => {
                const on = filter === f.id;
                const suffix = f.id === 'enviado' && pendientes > 0 ? ` (${pendientes})` : '';
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.filterChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilter(f.id)}
                  >
                    <Text style={[styles.filterChipTxt, { color: on ? c.primary : c.foreground }]}>
                      {f.label}
                      {suffix}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.fieldLbl, { color: c.foregroundMuted }]}>Orden</Text>
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((opt) => {
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
                    <Text style={[styles.filterChipTxt, { color: on ? c.primary : c.foreground }]}>
                      {opt.label}
                    </Text>
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
      borderRadius: radii.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      fontFamily: typography.fontSans,
      fontSize: 14,
      marginBottom: spacing.sm,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    toolbarMeta: { fontFamily: typography.fontSans, fontSize: 12 },
    toolbarLink: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    filtroResumen: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      marginBottom: spacing.sm,
    },
    listContent: { paddingBottom: spacing.xl, gap: spacing.sm },
    card: {
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    cardTitle: { fontFamily: typography.fontSansMedium, fontSize: 15, color: c.foreground },
    cardSub: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: c.foregroundMuted,
      marginTop: 2,
      marginBottom: spacing.xs,
    },
    cardLine: { fontFamily: typography.fontSans, fontSize: 13, color: c.foreground, marginTop: 2 },
    cardLabel: { fontFamily: typography.fontSansMedium, color: c.primary },
    cardMsg: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
      marginTop: spacing.sm,
      fontStyle: 'italic',
    },
    empty: { textAlign: 'center', color: c.foregroundMuted, marginTop: spacing.lg },
    reviewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
    },
    reviewTxt: { color: '#2E7D32', fontFamily: typography.fontSansMedium, fontSize: 13 },
    doneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    doneRowMain: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    doneTxt: { color: '#2E7D32', fontFamily: typography.fontSans, fontSize: 13 },
    waLink: { fontFamily: typography.fontSansMedium, fontSize: 12 },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalCard: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    filterModalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    modalTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 20,
    },
    fieldLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      marginTop: spacing.xs,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radii.sm,
      borderWidth: 1,
    },
    filterChipTxt: {
      fontFamily: typography.fontSans,
      fontSize: 12,
    },
  });
}
