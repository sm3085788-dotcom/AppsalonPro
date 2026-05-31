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
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, X, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, modalSheetBottomPad, modalScrollBottomPad } from '../components/luxury';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { useTheme } from '../theme/ThemeProvider';
import {
  formatQ,
  montoVenta,
  facturaLabel,
  profesionalLabel,
  parseVentaItems,
  formatFechaVenta,
  formatMetodoPago,
  formatVentaNotasParaDisplay,
} from '../../../shared/utils/ventaFactura';

export function PapeleriaScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const sel = useListSelection();
  const [sortMode, setSortMode] = useState('fecha_desc');
  const [filterVendedor, setFilterVendedor] = useState('todos');
  const [filterMetodo, setFilterMetodo] = useState('todos');
  const [filterFactura, setFilterFactura] = useState('todas');
  const [detalleVenta, setDetalleVenta] = useState(null);

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

  const detalleItems = useMemo(
    () => (detalleVenta ? parseVentaItems(detalleVenta.items) : []),
    [detalleVenta],
  );
  const detalleNotasDisplay = useMemo(
    () => (detalleVenta ? formatVentaNotasParaDisplay(detalleVenta.notas) : null),
    [detalleVenta],
  );

  const filtered = useMemo(() => {
    let rows = [...ventas];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((v) => {
        const cli = v?.cliente?.nombre || v?.cliente_nombre || '';
        const vend = profesionalLabel(v);
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
    if (!sel.active) setDetalleVenta(v);
  };

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar facturas',
      `¿Eliminar ${sel.count} venta(s)? Se guardará una copia en Basurero antes de borrar en la base de datos.`,
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
              const v = ventas.find((x) => String(x.id) === String(id));
              if (!v) continue;
              const r = await deleteRowWithBasurero('ventas', v, () => db.ventas.delete(v.id));
              if (r.ok) ok += 1;
              else errs.push(r.error);
            }
            sel.exitSelectMode();
            await load();
            setDeleteBusy(false);
            if (errs.length) {
              Alert.alert('Completado con errores', `Eliminadas: ${ok}. Fallos: ${errs.length}.`);
            } else {
              Alert.alert('Listo', ok === 1 ? 'Factura eliminada.' : `Se eliminaron ${ok} facturas.`);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item: v }) => {
    const prof = profesionalLabel(v);
    const cli = v?.cliente?.nombre || v?.cliente_nombre || '';
    const fecha = v?.fecha
      ? new Date(v.fecha).toLocaleString('es-GT', {
          day: '2-digit',
          month: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
    const subParts = [prof, cli, fecha, v?.metodo_pago].filter(Boolean);
    const picked = sel.isSelected(v.id);

    return (
      <TouchableOpacity
        style={[
          styles.row,
          { borderBottomColor: c.cardBorder },
          picked && { backgroundColor: c.surfaceMuted },
        ]}
        onPress={() => {
          if (sel.active) sel.toggleId(v.id);
          else verDetalle(v);
        }}
        onLongPress={() => {
          if (!sel.active) sel.setActive(true);
          sel.toggleId(v.id);
        }}
        activeOpacity={0.7}
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
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.folio, { color: c.foreground }]} numberOfLines={1}>
              {facturaLabel(v)}
            </Text>
            <Text style={[styles.monto, { color: c.primary }]} numberOfLines={1}>
              {formatQ(montoVenta(v))}
            </Text>
          </View>
          <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
            {subParts.length ? subParts.join(' · ') : '—'}
          </Text>
        </View>
        {!sel.active ? <ChevronRight size={16} color={c.foregroundSubtle} style={styles.rowChev} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Papelería"
        subtitle="Facturas del punto de venta. «Seleccionar» para eliminar varias (copia en Basurero)."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        edgeToEdge
      >
        <View style={styles.body}>
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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
              <Text style={{ color: c.foregroundSubtle }}> · </Text>
              <TouchableOpacity
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Ordenar y filtros"
                onPress={() => setModalFiltros(true)}
              >
                <Text style={[styles.toolbarLink, { color: c.primary }]}>Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text
            style={[styles.filtroResumen, { color: c.foregroundSubtle }]}
            numberOfLines={1}
          >
            {filtroResumen}
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.md }} color={c.primary} />
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={filtered}
                keyExtractor={(v) => String(v.id)}
                renderItem={renderItem}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={c.primary}
                    colors={[c.primary]}
                    progressBackgroundColor={c.card}
                  />
                }
                contentContainerStyle={{
                  paddingBottom: sel.count ? 100 : padBottom,
                  flexGrow: filtered.length === 0 ? 1 : 0,
                }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
                    {ventas.length === 0
                      ? 'No hay ventas registradas.'
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

      <Modal visible={!!detalleVenta} animationType="slide" transparent onRequestClose={() => setDetalleVenta(null)}>
        <View style={styles.detailBackdrop}>
          <View style={[styles.detailSheet, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            {detalleVenta ? (
              <>
                <View style={styles.detailHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.detailTitle, { color: c.foreground }]}>Detalle de venta</Text>
                    <Text style={[styles.detailFolio, { color: c.primary }]} numberOfLines={2}>
                      {facturaLabel(detalleVenta)}
                    </Text>
                    <Text style={[styles.detailFecha, { color: c.foregroundMuted }]}>
                      {formatFechaVenta(detalleVenta.fecha)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetalleVenta(null)} hitSlop={12} accessibilityLabel="Cerrar">
                    <X size={22} color={c.foregroundMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ backgroundColor: c.background }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: modalScrollBottomPad(insets) }}
                >
                  <View style={[styles.detailTotalCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                    <Text style={[styles.detailTotalLbl, { color: c.foregroundMuted }]}>Total cobrado</Text>
                    <Text style={[styles.detailTotalVal, { color: c.foreground }]}>
                      {formatQ(montoVenta(detalleVenta))}
                    </Text>
                    <Text style={[styles.detailPago, { color: c.foregroundMuted }]}>
                      Pago: {formatMetodoPago(detalleVenta.metodo_pago)}
                    </Text>
                    {Number(detalleVenta.descuento) > 0 ? (
                      <Text style={[styles.detailPago, { color: c.primary }]}>
                        Descuento: {formatQ(detalleVenta.descuento)}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.detailInfoCard, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                    {[
                      ['Cliente', detalleVenta.cliente?.nombre || detalleVenta.cliente_nombre],
                      ['Vendedor', profesionalLabel(detalleVenta)],
                    ].map(([lbl, val]) => (
                      <View key={lbl} style={[styles.detailInfoRow, { borderBottomColor: c.cardBorder }]}>
                        <Text style={[styles.detailInfoLbl, { color: c.foregroundMuted }]}>{lbl}</Text>
                        <Text style={[styles.detailInfoVal, { color: c.foreground }]} numberOfLines={2}>
                          {val?.trim() ? String(val) : '—'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.detailSectionTitle, { color: c.foreground }]}>Productos y servicios</Text>
                  {detalleItems.length === 0 ? (
                    <Text style={[styles.detailEmptyItems, { color: c.foregroundMuted }]}>
                      Sin líneas de detalle guardadas.
                    </Text>
                  ) : (
                    <View style={[styles.itemsTable, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                      <View style={[styles.itemsHeadRow, { borderBottomColor: c.cardBorder, backgroundColor: c.surfaceMuted }]}>
                        <Text style={[styles.itemsHeadTxt, styles.itemsColName, { color: c.foregroundMuted }]}>
                          Artículo
                        </Text>
                        <Text style={[styles.itemsHeadTxt, styles.itemsColQty, { color: c.foregroundMuted }]}>Cant.</Text>
                        <Text style={[styles.itemsHeadTxt, styles.itemsColMoney, { color: c.foregroundMuted }]}>P. unit.</Text>
                        <Text style={[styles.itemsHeadTxt, styles.itemsColMoney, { color: c.foregroundMuted }]}>Subtotal</Text>
                      </View>
                      {detalleItems.map((it) => (
                        <View key={it.key} style={[styles.itemsRow, { borderBottomColor: c.cardBorder }]}>
                          <Text style={[styles.itemsName, styles.itemsColName, { color: c.foreground }]} numberOfLines={2}>
                            {it.nombre}
                          </Text>
                          <Text style={[styles.itemsQty, styles.itemsColQty, { color: c.foreground }]}>{it.cantidad}</Text>
                          <Text style={[styles.itemsMoney, styles.itemsColMoney, { color: c.foregroundMuted }]}>
                            {formatQ(it.precio_unitario)}
                          </Text>
                          <Text style={[styles.itemsMoney, styles.itemsColMoney, { color: c.primary }]}>
                            {formatQ(it.subtotal)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {detalleNotasDisplay ? (
                    <>
                      <Text style={[styles.detailSectionTitle, { color: c.foreground }]}>Notas</Text>
                      <View style={[styles.detailNotas, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
                        <Text style={[styles.detailNotasTxt, { color: c.foregroundMuted }]}>{detalleNotasDisplay}</Text>
                      </View>
                    </>
                  ) : null}
                </ScrollView>

                <SalonButton
                  title="Cerrar"
                  variant="outlineGray"
                  fullWidth
                  onPress={() => setDetalleVenta(null)}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.filterBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
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
    body: {
      flex: 1,
      paddingHorizontal: spacing.sm,
      backgroundColor: c.background,
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
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    toolbarMeta: { fontFamily: typography.fontSansMedium, fontSize: 12 },
    toolbarLink: { fontFamily: typography.fontSansMedium, fontSize: 12 },
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.xs,
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    folio: {
      flex: 1,
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
    },
    monto: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
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
    check: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.xs,
    },
    emptyTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
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
    detailBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    detailSheet: {
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      maxHeight: '92%',
    },
    detailHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    detailTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      marginBottom: spacing.xs,
    },
    detailFolio: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
    },
    detailFecha: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      marginTop: 4,
    },
    detailTotalCard: {
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    detailTotalLbl: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    detailTotalVal: {
      fontFamily: typography.fontDisplay,
      fontSize: 28,
      marginTop: spacing.xs,
    },
    detailPago: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginTop: spacing.xs,
    },
    detailInfoCard: {
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    detailInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    detailInfoLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 12,
      width: 72,
    },
    detailInfoVal: {
      flex: 1,
      fontFamily: typography.fontSans,
      fontSize: 14,
      textAlign: 'right',
    },
    detailSectionTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    detailEmptyItems: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      marginBottom: spacing.md,
      fontStyle: 'italic',
    },
    itemsTable: {
      borderWidth: 1,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    itemsHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemsHeadTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    itemsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    itemsColName: { flex: 1, minWidth: 0 },
    itemsColQty: { width: 36, textAlign: 'center' },
    itemsColMoney: { width: 64, textAlign: 'right' },
    itemsName: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    itemsQty: { fontFamily: typography.fontSans, fontSize: 13 },
    itemsMoney: { fontFamily: typography.fontSans, fontSize: 12 },
    detailNotas: {
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    detailNotasTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
