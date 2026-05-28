import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Package, X, Check } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, supabase, confirmarCobroPedidoSalon } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, modalSheetBottomPad } from '../components/luxury';
import { ListSelectionToolbarLink, ListSelectionActionBar } from '../components/ListSelectionBar';
import { useListSelection } from '../hooks/useListSelection';
import { deleteRowWithBasurero } from '../services/salonDeleteFlow';
import { useTheme } from '../theme/ThemeProvider';
import { PickupQrDisplay } from '../components/PickupQrDisplay';
import { PedidoQrScannerModal } from '../components/PedidoQrScannerModal';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'delivered', label: 'Entregados' },
  { id: 'cancelled', label: 'Cancelados' },
];

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function isCashOrder(o) {
  const pay = String(o?.payment_method || '').toLowerCase();
  return ['efectivo', 'cash', 'efectivo_al_retirar'].includes(pay);
}

function orderCardStyle(o, c, isDark) {
  const st = String(o?.status || '');
  if (st === 'delivered') {
    return {
      backgroundColor: isDark ? 'rgba(46,125,50,0.18)' : '#E8F5E9',
      borderLeftWidth: 3,
      borderLeftColor: '#2E7D32',
    };
  }
  if (st === 'pending' && isCashOrder(o)) {
    return {
      backgroundColor: isDark ? 'rgba(212,175,55,0.14)' : '#FFF8E1',
      borderLeftWidth: 3,
      borderLeftColor: '#D4AF37',
    };
  }
  if (st === 'cancelled') {
    return { opacity: 0.55 };
  }
  return { backgroundColor: c.card };
}

function matchesTab(o, tab) {
  if (tab === 'todos') return true;
  return String(o?.status || '').toLowerCase() === tab;
}

export function PedidosScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);
  const sel = useListSelection();

  const [tab, setTab] = useState('todos');
  const [sortMode, setSortMode] = useState('fecha_desc');
  const [query, setQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loadHint, setLoadHint] = useState('');

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);
  const padList = sel.count > 0 ? 100 : padBottom;

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const oRes = await db.orders.getAll();
      if (oRes.error) throw oRes.error;
      const orderRows = Array.isArray(oRes.data) ? oRes.data : [];
      setOrders(orderRows);
      setLoadHint(
        orderRows.length
          ? ''
          : 'Si hay pedidos en App Clientes y no aparecen aquí, ejecutá supabase-ecommerce-orders-salon.sql en Supabase (permisos del salón).',
      );
    } catch (e) {
      const msg = String(e?.message || '');
      Alert.alert(
        'Pedidos',
        msg.includes('permission denied') || msg.includes('row-level security')
          ? `${msg}\n\nEjecutá supabase-ecommerce-orders-salon.sql en Supabase SQL Editor.`
          : msg || 'No se pudo cargar la bandeja.',
      );
      setOrders([]);
      setLoadHint('');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('salon-pedidos-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ecommerce_orders' },
        () => {
          load(true);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const filtroResumen = useMemo(() => {
    const t = TABS.find((x) => x.id === tab)?.label || 'Todos';
    const orden = sortMode === 'fecha_asc' ? 'Más antiguos' : 'Más recientes';
    return `${orden} · ${t}`;
  }, [tab, sortMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = [...orders];
    rows.sort((a, b) => {
      const cmp = new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return sortMode === 'fecha_asc' ? -cmp : cmp;
    });
    return rows.filter((o) => {
      if (!matchesTab(o, tab)) return false;
      if (!q) return true;
      const blob = [o.customer_name, o.customer_phone, o.tracking_code, o.notes, o.status].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [orders, tab, query, sortMode]);

  const openDetail = useCallback(async (order) => {
    if (sel.active) return;
    const row = { kind: 'compra', data: order };
    setDetail(row);
    setDetailItems([]);
    setDetailLoading(true);
    const { data } = await db.ecommerceOrderItems.getByOrder(order.id);
    setDetailItems(Array.isArray(data) ? data : []);
    setDetailLoading(false);
  }, [sel.active]);

  const confirmDeleteSelected = () => {
    if (!sel.count) return;
    Alert.alert(
      'Eliminar pedidos',
      `¿Eliminar ${sel.count} pedido(s)? Se guardará copia en Basurero.`,
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
              const row = orders.find((x) => String(x.id) === String(id));
              if (!row) continue;
              const r = await deleteRowWithBasurero('pedidos', row, () => db.orders.delete(row.id));
              if (r.ok) ok += 1;
              else errs.push(r.error);
            }
            sel.exitSelectMode();
            await load(true);
            setDeleteBusy(false);
            if (errs.length) Alert.alert('Parcial', `Eliminados: ${ok}. Fallos: ${errs.length}.`);
            else Alert.alert('Listo', ok === 1 ? 'Pedido eliminado.' : `Se eliminaron ${ok} pedidos.`);
          },
        },
      ],
    );
  };

  const ejecutarCobro = useCallback(async () => {
    if (!detail || detail.kind !== 'compra') return;
    const o = detail.data;
    setConfirmBusy(true);
    const res = await confirmarCobroPedidoSalon(o.id, { order: o });
    setConfirmBusy(false);
    if (!res.ok) {
      Alert.alert('Error', res.error?.message || 'No se pudo confirmar.');
      return;
    }
    Alert.alert('Listo', `Cobro registrado · folio ${res.noFactura}. La venta ya aparece en Caja.`);
    setDetail(null);
    setScannerOpen(false);
    load(true);
  }, [detail, load]);

  const confirmarPagoEfectivo = useCallback(() => {
    if (!detail || detail.kind !== 'compra') return;
    const o = detail.data;
    if (String(o.status) !== 'pending') {
      Alert.alert('Pedido', 'Este pedido ya no está pendiente.');
      return;
    }
    if (!o.tracking_code) {
      Alert.alert('Pedido', 'Este pedido no tiene código de seguimiento para validar el QR.');
      return;
    }
    setScannerOpen(true);
  }, [detail]);

  const onQrVerified = useCallback(() => {
    if (!detail || detail.kind !== 'compra') return;
    const o = detail.data;
    setScannerOpen(false);
    Alert.alert(
      'Confirmar pago en efectivo',
      `QR correcto · Q${Number(o.total_amount || 0).toFixed(2)}\n\nSe registrará la venta en la caja abierta, descontará stock y sumará a la meta.`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => setScannerOpen(false) },
        { text: 'Confirmar cobro', onPress: ejecutarCobro },
      ],
    );
  }, [detail, ejecutarCobro]);

  const renderItem = ({ item: o }) => {
    const picked = sel.isSelected(o.id);
    const cardBg = orderCardStyle(o, c, isDark);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (sel.active) sel.toggleId(o.id);
          else openDetail(o);
        }}
        onLongPress={() => {
          if (!sel.active) sel.setActive(true);
          sel.toggleId(o.id);
        }}
        style={[
          styles.row,
          { borderBottomColor: c.cardBorder },
          cardBg,
          picked && { backgroundColor: c.surfaceMuted },
        ]}
        accessibilityRole="button"
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
        <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
          <Package size={16} color={c.foregroundMuted} strokeWidth={2} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
              {o.customer_name || 'Cliente'}
            </Text>
            <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
              Compra tienda
            </Text>
          </View>
          <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
            {o.tracking_code} · Q{Number(o.total_amount || 0).toFixed(2)} · {o.payment_method || '—'}
          </Text>
          <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
            {formatWhen(o.created_at)} · {String(o.status || '—')}
          </Text>
        </View>
        {!sel.active ? <ChevronRight size={16} color={c.foregroundSubtle} /> : null}
      </TouchableOpacity>
    );
  };

  const detailBody = () => {
    if (!detail?.data) return '';
    const o = detail.data;
    return [
      `Cliente: ${o.customer_name}`,
      `Tel: ${o.customer_phone || '—'}`,
      `Tracking: ${o.tracking_code}`,
      `Estado: ${o.status}`,
      `Pago: ${o.payment_method || '—'}`,
      `Total: Q${Number(o.total_amount || 0).toFixed(2)}`,
      `Entrega: ${o.fulfillment_type || '—'}`,
      `Notas: ${o.notes || '—'}`,
      `Creado: ${formatWhen(o.created_at)}`,
      detailItems.length
        ? `\nProductos:\n${detailItems.map((l) => `· ${l.product_name} x${l.qty} · Q${Number(l.line_total || 0).toFixed(2)}`).join('\n')}`
        : detailLoading
          ? '\nCargando productos…'
          : '',
    ].join('\n');
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Pedidos"
        subtitle="Compras de la tienda enviadas desde App Clientes. Tendencias y carrusel se gestionan en Marketing."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        edgeToEdge
      >
        <View style={styles.body}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar cliente, tracking, estado…"
            placeholderTextColor={c.foregroundSubtle}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            accessibilityLabel="Buscar pedidos"
          />

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading ? 'Cargando…' : `${filtered.length} pedido${filtered.length === 1 ? '' : 's'}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ListSelectionToolbarLink active={sel.active} onPress={sel.toggleSelectMode} color={c.primary} />
              <Text style={{ color: c.foregroundSubtle, fontSize: 13 }}> · </Text>
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
          <Text style={[styles.filtroResumen, { color: c.foregroundMuted }]} numberOfLines={2}>
            {filtroResumen}
          </Text>
          {loadHint ? (
            <Text style={[styles.loadHint, { color: c.foregroundMuted }]}>{loadHint}</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={filtered}
                keyExtractor={(o) => String(o.id)}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => load(true)}
                    tintColor={c.primary}
                    colors={[c.primary]}
                    progressBackgroundColor={c.card}
                  />
                }
                contentContainerStyle={{ paddingBottom: padList, flexGrow: 1 }}
                ListEmptyComponent={
                  <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
                    Sin pedidos de tienda. Las compras aparecen cuando un cliente finaliza el checkout en App
                    Clientes.
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

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.filterModalCard, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Ordenar y filtrar</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Orden</Text>
            <View style={styles.typeGrid}>
              {[
                { id: 'fecha_desc', label: 'Más recientes' },
                { id: 'fecha_asc', label: 'Más antiguos' },
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
            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Estado</Text>
            <View style={styles.typeGrid}>
              {TABS.map((t) => {
                const on = tab === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeChip,
                      { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                    ]}
                    onPress={() => setTab(t.id)}
                  >
                    <Text style={[styles.typeChipTxt, { color: on ? c.primary : c.foreground }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalFiltros(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={detail != null} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.filterModalCard, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Detalle del pedido</Text>
              <TouchableOpacity onPress={() => setDetail(null)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text
              style={{ color: c.foreground, fontFamily: typography.fontSans, fontSize: 14, lineHeight: 22 }}
              selectable
            >
              {detail ? detailBody() : ''}
            </Text>
            {detail?.data?.tracking_code ? (
              <PickupQrDisplay
                trackingCode={detail.data.tracking_code}
                hint={
                  String(detail.data.status) === 'delivered'
                    ? 'Pedido cobrado y cerrado.'
                    : 'El cliente muestra este QR en App Clientes. Escanealo al cobrar.'
                }
              />
            ) : null}
            {detail?.data &&
            String(detail.data.status) === 'pending' &&
            isCashOrder(detail.data) ? (
              <SalonButton
                title={confirmBusy ? 'Confirmando…' : 'Escanear QR y confirmar cobro'}
                variant="heroGold"
                fullWidth
                disabled={confirmBusy}
                onPress={confirmarPagoEfectivo}
                style={{ marginTop: spacing.md }}
              />
            ) : null}
            <SalonButton
              title="Cerrar"
              variant="outlineGray"
              fullWidth
              onPress={() => setDetail(null)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      <PedidoQrScannerModal
        visible={scannerOpen}
        expectedTracking={detail?.data?.tracking_code || ''}
        onClose={() => setScannerOpen(false)}
        onVerified={onQrVerified}
      />
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
      fontSize: 15,
      minHeight: 48,
      borderRadius: radii.md,
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
    filtroResumen: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    loadHint: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 18,
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
    iconWrap: {
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
    modalHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    modalTitle: { fontFamily: typography.fontDisplay, fontSize: 20 },
    sectionLbl: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      marginBottom: spacing.sm,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
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
