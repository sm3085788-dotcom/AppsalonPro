import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, FileText, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

function formatQ(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 'Q 0.00';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function montoVenta(v) {
  return Number(v?.total ?? v?.monto ?? 0);
}

function facturaLabel(v) {
  const n = v?.no_factura?.trim();
  return n || `Venta ${String(v?.id || '').slice(0, 8)}…`;
}

export function PapeleriaScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortMode, setSortMode] = useState('fecha_desc');
  const [filterVendedor, setFilterVendedor] = useState('todos');
  const [filterMetodo, setFilterMetodo] = useState('todos');
  const [filterFactura, setFilterFactura] = useState('todas');

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await db.ventas.getAll();
      if (error) throw error;
      setVentas(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Papelería', e?.message || 'No se pudieron cargar las ventas.');
      setVentas([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const onRefresh = () => {
    load(true);
  };

  const vendedoresOpts = useMemo(() => {
    const map = new Map();
    for (const v of ventas) {
      const id = v?.vendedor_id ?? v?.vendedor?.id ?? null;
      const nombre = v?.vendedor?.nombre?.trim() || 'Sin vendedor';
      const key = id || '__sin__';
      if (!map.has(key)) map.set(key, { id: key, dbId: id, label: nombre });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [ventas]);

  const metodosOpts = useMemo(() => {
    const set = new Set();
    for (const v of ventas) {
      const m = String(v?.metodo_pago || '').trim();
      if (m) set.add(m);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [ventas]);

  const filtroResumen = useMemo(() => {
    const orden =
      sortMode === 'fecha_asc'
        ? 'Fecha más antigua'
        : sortMode === 'monto_desc'
          ? 'Monto mayor'
          : sortMode === 'monto_asc'
            ? 'Monto menor'
            : 'Fecha más reciente';
    let vend = 'Todos los empleados';
    if (filterVendedor === '__sin__') vend = 'Sin vendedor asignado';
    else if (filterVendedor !== 'todos') {
      const o = vendedoresOpts.find((x) => x.id === filterVendedor);
      vend = o ? `Vendedor: ${o.label}` : 'Empleado';
    }
    const met = filterMetodo === 'todos' ? 'Cualquier pago' : filterMetodo;
    const fac =
      filterFactura === 'con_numero' ? 'Con folio' : filterFactura === 'sin_numero' ? 'Sin folio' : 'Todas';
    return `${orden} · ${vend} · ${met} · ${fac}`;
  }, [sortMode, filterVendedor, filterMetodo, filterFactura, vendedoresOpts]);

  const filtered = useMemo(() => {
    let rows = [...ventas];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((v) => {
        const cli = v?.cliente?.nombre || v?.cliente_nombre || '';
        const vend = v?.vendedor?.nombre || '';
        const blob = [facturaLabel(v), cli, vend, v?.metodo_pago, v?.notas].join(' ').toLowerCase();
        return blob.includes(q);
      });
    }
    if (filterVendedor === '__sin__') {
      rows = rows.filter((v) => !v?.vendedor_id && !v?.vendedor?.id);
    } else if (filterVendedor !== 'todos') {
      const opt = vendedoresOpts.find((x) => x.id === filterVendedor);
      const want = opt?.dbId;
      rows = rows.filter((v) => (want ? v?.vendedor_id === want : !v?.vendedor_id));
    }
    if (filterMetodo !== 'todos') {
      rows = rows.filter((v) => String(v?.metodo_pago || '').trim() === filterMetodo);
    }
    if (filterFactura === 'con_numero') {
      rows = rows.filter((v) => String(v?.no_factura || '').trim().length > 0);
    } else if (filterFactura === 'sin_numero') {
      rows = rows.filter((v) => !String(v?.no_factura || '').trim());
    }

    rows.sort((a, b) => {
      if (sortMode === 'monto_desc' || sortMode === 'monto_asc') {
        const ma = montoVenta(a);
        const mb = montoVenta(b);
        return sortMode === 'monto_desc' ? mb - ma : ma - mb;
      }
      const ta = new Date(a?.fecha || 0).getTime();
      const tb = new Date(b?.fecha || 0).getTime();
      return sortMode === 'fecha_asc' ? ta - tb : tb - ta;
    });
    return rows;
  }, [ventas, query, sortMode, filterVendedor, filterMetodo, filterFactura, vendedoresOpts]);

  const verDetalle = (v) => {
    const lines = [
      `Factura / folio: ${facturaLabel(v)}`,
      `Fecha: ${v?.fecha ? new Date(v.fecha).toLocaleString('es-GT') : '—'}`,
      `Cliente: ${v?.cliente?.nombre || v?.cliente_nombre || '—'}`,
      `Vendedor: ${v?.vendedor?.nombre || '—'}`,
      `Total: ${formatQ(montoVenta(v))}`,
      `Pago: ${v?.metodo_pago || '—'}`,
    ].join('\n');
    let items = '';
    try {
      items = v?.items != null ? `\n\nÍtems (JSON):\n${JSON.stringify(v.items, null, 2)}` : '';
    } catch {
      items = '';
    }
    const body = `${lines}${items}`.slice(0, 8000);
    Alert.alert('Detalle de venta', body, [{ text: 'Cerrar' }], { cancelable: true });
  };

  const renderItem = ({ item: v }) => (
    <TouchableOpacity
      style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}
      onPress={() => verDetalle(v)}
      activeOpacity={0.88}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
        <FileText size={20} color={c.foregroundMuted} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={1}>
          {facturaLabel(v)}
        </Text>
        <Text style={[subStyles.muted, styles.meta]} numberOfLines={2}>
          {v?.vendedor?.nombre ? `${v.vendedor.nombre} · ` : ''}
          {v?.cliente?.nombre || v?.cliente_nombre || 'Cliente'} · {formatQ(montoVenta(v))}
        </Text>
        <Text style={[subStyles.muted, styles.meta]} numberOfLines={1}>
          {v?.fecha ? new Date(v.fecha).toLocaleString('es-GT') : '—'} · {v?.metodo_pago || '—'}
        </Text>
      </View>
      <ChevronRight size={18} color={c.foregroundMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Papelería"
        subtitle="Facturas generadas en caja por los empleados (tabla ventas). La app Ventas (cliente) mostrará el mismo tipo de documento desde el lado de quien compra."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
      >
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar folio, cliente, empleado…"
            placeholderTextColor={c.foregroundSubtle}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            accessibilityLabel="Buscar facturas"
          />

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading ? '…' : `${filtered.length} factura${filtered.length === 1 ? '' : 's'}`}
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
          <Text style={[subStyles.muted, { fontSize: 12, lineHeight: 17, marginBottom: spacing.md }]} numberOfLines={3}>
            {filtroResumen}
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(v) => String(v.id)}
              renderItem={renderItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={{ paddingBottom: padBottom, flexGrow: 1 }}
              ListEmptyComponent={
                <Text style={[subStyles.muted, { marginTop: spacing.sm }]}>
                  {ventas.length === 0
                    ? 'No hay ventas registradas. Cuando el equipo facture desde caja o punto de venta, aparecerán aquí con folio y totales.'
                    : 'Ningún resultado con la búsqueda o filtros actuales.'}
                </Text>
              }
            />
          )}
        </View>
      </SubScreenChrome>

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
                { id: 'fecha_desc', label: 'Más recientes' },
                { id: 'fecha_asc', label: 'Más antiguos' },
                { id: 'monto_desc', label: 'Monto ↓' },
                { id: 'monto_asc', label: 'Monto ↑' },
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

            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Empleado (vendedor)</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    borderColor: filterVendedor === 'todos' ? c.primary : c.cardBorder,
                    backgroundColor: filterVendedor === 'todos' ? c.surfaceMuted : c.card,
                  },
                ]}
                onPress={() => setFilterVendedor('todos')}
              >
                <Text style={[styles.chipTxt, { color: filterVendedor === 'todos' ? c.primary : c.foreground }]}>Todos</Text>
              </TouchableOpacity>
              {vendedoresOpts.map((opt) => {
                const on = filterVendedor === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilterVendedor(opt.id)}
                  >
                    <Text style={[styles.chipTxt, { color: on ? c.primary : c.foreground }]} numberOfLines={1}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Método de pago</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    borderColor: filterMetodo === 'todos' ? c.primary : c.cardBorder,
                    backgroundColor: filterMetodo === 'todos' ? c.surfaceMuted : c.card,
                  },
                ]}
                onPress={() => setFilterMetodo('todos')}
              >
                <Text style={[styles.chipTxt, { color: filterMetodo === 'todos' ? c.primary : c.foreground }]}>Todos</Text>
              </TouchableOpacity>
              {metodosOpts.map((m) => {
                const on = filterMetodo === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilterMetodo(m)}
                  >
                    <Text style={[styles.chipTxt, { color: on ? c.primary : c.foreground }]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Folio</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'todas', label: 'Todas' },
                { id: 'con_numero', label: 'Con folio' },
                { id: 'sin_numero', label: 'Sin folio' },
              ].map((opt) => {
                const on = filterFactura === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.chip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setFilterFactura(opt.id)}
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
    toolbarMeta: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    toolbarLink: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    filterSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      maxHeight: '92%',
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
      maxWidth: '100%',
    },
    chipTxt: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontFamily: typography.fontSansMedium, fontSize: 16 },
    meta: { fontSize: 12, marginTop: 4 },
  });
}
