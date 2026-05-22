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
import { ChevronRight, Megaphone, MessageCircle, Package, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, confirmarCobroPedidoSalon } from '@appsalon/shared-config';
import { SubScreenChrome, SalonButton, modalSheetBottomPad } from '../components/luxury';
import { useTheme } from '../theme/ThemeProvider';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'compra', label: 'Compras' },
  { id: 'tendencias', label: 'Tendencias' },
  { id: 'carrusel', label: 'Carrusel' },
];

function isTrendsPost(post) {
  if (!post || typeof post !== 'object') return false;
  if (String(post.audience || '') === 'home_carousel') return false;
  const url = post.media_url;
  if (!url || typeof url !== 'string') return false;
  const ct = String(post.content_type || '').toLowerCase();
  if (ct === 'video' || ct === 'image') return true;
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function interestField(content, label) {
  const re = new RegExp(`${label}:\\s*(.+)`, 'i');
  const m = String(content || '').match(re);
  return m?.[1]?.trim() || '';
}

function interestPreview(msg) {
  const content = msg?.content || '';
  const titular = interestField(content, 'Titular');
  const boton = interestField(content, 'Botón tocado').replace(/^«|»$/g, '');
  const desc = interestField(content, 'Descripción');
  const parts = [titular, boton && `Botón: ${boton}`, desc].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  return content.split('\n').slice(0, 2).join(' · ') || '—';
}

function interestRowTitle(msg) {
  return msg?.client_name || interestField(msg?.content, 'Cliente') || 'Cliente';
}

export function PedidosScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(c), [c]);

  const [tab, setTab] = useState('todos');
  const [sortMode, setSortMode] = useState('fecha_desc');
  const [query, setQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [comments, setComments] = useState([]);
  const [interests, setInterests] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [oRes, cRes, iRes] = await Promise.all([
        db.orders.getAll(),
        db.marketingComments.listForPedidosInbox(400),
        db.marketingDirectMessages.listPedidosInterest(400),
      ]);
      if (oRes.error) throw oRes.error;
      setOrders(Array.isArray(oRes.data) ? oRes.data : []);
      if (!cRes.error && Array.isArray(cRes.data)) {
        setComments(cRes.data.filter((row) => isTrendsPost(row.marketing_posts)));
      } else {
        setComments([]);
      }
      if (!iRes.error && Array.isArray(iRes.data)) setInterests(iRes.data);
      else setInterests([]);
    } catch (e) {
      Alert.alert('Pedidos', e?.message || 'No se pudo cargar la bandeja.');
      setOrders([]);
      setComments([]);
      setInterests([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const filtroResumen = useMemo(() => {
    const t = TABS.find((x) => x.id === tab)?.label || 'Todos';
    const orden = sortMode === 'fecha_asc' ? 'Más antiguos' : 'Más recientes';
    return `${orden} · ${t}`;
  }, [tab, sortMode]);

  const isTendenciasRow = (kind) => kind === 'tendencias_comentario' || kind === 'tendencias_solicitud';

  const merged = useMemo(() => {
    const rows = [];
    for (const o of orders) {
      rows.push({
        key: `order-${o.id}`,
        kind: 'compra',
        sortAt: o.created_at || o.updated_at,
        data: o,
      });
    }
    for (const cm of comments) {
      rows.push({
        key: `comment-${cm.id}`,
        kind: 'tendencias_comentario',
        sortAt: cm.created_at,
        data: cm,
      });
    }
    for (const msg of interests) {
      const ct = String(msg.content_type || '');
      if (ct === 'carousel_interest') {
        rows.push({
          key: `interest-carousel-${msg.id}`,
          kind: 'carrusel',
          sortAt: msg.created_at,
          data: msg,
        });
      } else if (ct === 'tendencias_interest') {
        rows.push({
          key: `interest-tendencias-${msg.id}`,
          kind: 'tendencias_solicitud',
          sortAt: msg.created_at,
          data: msg,
        });
      }
    }
    rows.sort((a, b) => {
      const cmp = new Date(b.sortAt || 0) - new Date(a.sortAt || 0);
      return sortMode === 'fecha_asc' ? -cmp : cmp;
    });
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'compra' && r.kind !== 'compra') return false;
      if (tab === 'tendencias' && !isTendenciasRow(r.kind)) return false;
      if (tab === 'carrusel' && r.kind !== 'carrusel') return false;
      if (!q) return true;
      if (r.kind === 'compra') {
        const o = r.data;
        const blob = [o.customer_name, o.customer_phone, o.tracking_code, o.notes, o.status].join(' ').toLowerCase();
        return blob.includes(q);
      }
      if (r.kind === 'tendencias_comentario') {
        const cm = r.data;
        const blob = [cm.content, cm.author_name, cm.marketing_posts?.title].join(' ').toLowerCase();
        return blob.includes(q);
      }
      if (r.kind === 'tendencias_solicitud' || r.kind === 'carrusel') {
        const msg = r.data;
        const blob = [msg.content, msg.client_name, msg.client_phone, msg.content_type].join(' ').toLowerCase();
        return blob.includes(q);
      }
      return true;
    });
  }, [orders, comments, interests, tab, query, sortMode]);

  const openDetail = useCallback(async (row) => {
    setDetail(row);
    setDetailItems([]);
    if (row.kind !== 'compra') return;
    setDetailLoading(true);
    const { data } = await db.ecommerceOrderItems.getByOrder(row.data.id);
    setDetailItems(Array.isArray(data) ? data : []);
    setDetailLoading(false);
  }, []);

  const confirmarPagoEfectivo = useCallback(async () => {
    if (!detail || detail.kind !== 'compra') return;
    const o = detail.data;
    if (String(o.status) !== 'pending') {
      Alert.alert('Pedido', 'Este pedido ya no está pendiente.');
      return;
    }
    Alert.alert(
      'Confirmar pago en efectivo',
      `¿El cliente pagó Q${Number(o.total_amount || 0).toFixed(2)}?\n\nSe registrará la venta, descontará stock y sumará a la meta global.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar cobro',
          onPress: async () => {
            setConfirmBusy(true);
            const res = await confirmarCobroPedidoSalon(o.id);
            setConfirmBusy(false);
            if (!res.ok) {
              Alert.alert('Error', res.error?.message || 'No se pudo confirmar.');
              return;
            }
            Alert.alert('Listo', `Cobro registrado · folio ${res.noFactura}`);
            setDetail(null);
            load(true);
          },
        },
      ],
    );
  }, [detail, load]);

  const renderItem = ({ item }) => {
    if (item.kind === 'compra') {
      const o = item.data;
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openDetail(item)}
          style={[styles.row, { borderBottomColor: c.cardBorder }]}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
            <Package size={16} color={c.foregroundMuted} strokeWidth={2} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
                {o.customer_name || 'Cliente'}
              </Text>
              <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
                Compra
              </Text>
            </View>
            <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={1}>
              {o.tracking_code} · Q{Number(o.total_amount || 0).toFixed(2)} · {o.payment_method || '—'}
            </Text>
            <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
              {formatWhen(o.created_at)} · {String(o.status || '—')}
            </Text>
          </View>
          <ChevronRight size={16} color={c.foregroundSubtle} />
        </TouchableOpacity>
      );
    }
    if (item.kind === 'tendencias_comentario') {
      const cm = item.data;
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openDetail(item)}
          style={[styles.row, { borderBottomColor: c.cardBorder }]}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
            <MessageCircle size={16} color={c.foregroundMuted} strokeWidth={2} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
                {cm.author_name || 'Cliente'}
              </Text>
              <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
                Comentario
              </Text>
            </View>
            <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={2}>
              {cm.content || '—'}
            </Text>
            <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
              {cm.marketing_posts?.title || `Post #${cm.post_id}`} · {formatWhen(cm.created_at)}
            </Text>
          </View>
          <ChevronRight size={16} color={c.foregroundSubtle} />
        </TouchableOpacity>
      );
    }
    if (item.kind === 'tendencias_solicitud') {
      const msg = item.data;
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openDetail(item)}
          style={[styles.row, { borderBottomColor: c.cardBorder }]}
          accessibilityRole="button"
        >
          <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
            <MessageCircle size={16} color={c.foregroundMuted} strokeWidth={2} />
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
                {interestRowTitle(msg)}
              </Text>
              <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
                Tendencias
              </Text>
            </View>
            <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={2}>
              {interestPreview(msg)}
            </Text>
            <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
              {formatWhen(msg.created_at)}
            </Text>
          </View>
          <ChevronRight size={16} color={c.foregroundSubtle} />
        </TouchableOpacity>
      );
    }
    const msg = item.data;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => openDetail(item)}
        style={[styles.row, { borderBottomColor: c.cardBorder }]}
        accessibilityRole="button"
      >
        <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
          <Megaphone size={16} color={c.foregroundMuted} strokeWidth={2} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
              {interestRowTitle(msg)}
            </Text>
            <Text style={[styles.rowMeta, { color: c.primary }]} numberOfLines={1}>
              Carrusel
            </Text>
          </View>
          <Text style={[styles.rowSub, { color: c.foregroundMuted }]} numberOfLines={2}>
            {interestPreview(msg)}
          </Text>
          <Text style={[styles.rowSub, { color: c.foregroundSubtle }]} numberOfLines={1}>
            {formatWhen(msg.created_at)}
          </Text>
        </View>
        <ChevronRight size={16} color={c.foregroundSubtle} />
      </TouchableOpacity>
    );
  };

  const detailBody = () => {
    if (!detail) return '';
    if (detail.kind === 'compra') {
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
    }
    if (detail.kind === 'tendencias_comentario') {
      const cm = detail.data;
      return [
        'Tipo: Comentario en Tendencias',
        `Comentario del cliente:\n${cm.content || '—'}`,
        `\nAutor: ${cm.author_name || '—'}`,
        `Post: ${cm.marketing_posts?.title || cm.post_id}`,
        `Moderación: ${cm.moderation_status || '—'}`,
        `Fecha: ${formatWhen(cm.created_at)}`,
      ].join('\n');
    }
    if (detail.kind === 'tendencias_solicitud' || detail.kind === 'carrusel') {
      const msg = detail.data;
      const tipo = detail.kind === 'carrusel' ? 'Botón carrusel inicio' : 'Solicitud Tendencias';
      return [
        `Tipo: ${tipo}`,
        '',
        msg.content || '—',
        msg.media_url ? `\nImagen publicación:\n${msg.media_url}` : '',
      ].join('\n');
    }
    return '';
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Pedidos"
        subtitle="Bandeja del salón: compras de tienda, consultas en Tendencias y piezas del carrusel, todas enviadas desde App Clientes."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
        edgeToEdge
      >
        <View style={styles.body}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar cliente, tracking, comentario…"
            placeholderTextColor={c.foregroundSubtle}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            accessibilityLabel="Buscar pedidos"
          />

          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading ? 'Cargando…' : `${merged.length} ítem${merged.length === 1 ? '' : 's'}`}
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
            {filtroResumen}
          </Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
          ) : (
            <View style={[styles.listShell, { borderColor: c.cardBorder, backgroundColor: c.card }]}>
              <FlatList
                data={merged}
                keyExtractor={(it) => it.key}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
                contentContainerStyle={{ paddingBottom: padBottom, flexGrow: 1 }}
                ListEmptyComponent={
                  <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
                    Sin entradas. Las compras llegan del checkout en App Clientes; las consultas, desde Tendencias; el
                    carrusel se publica en Marketing.
                  </Text>
                }
              />
            </View>
          )}
        </View>
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
            <Text style={[styles.sectionLbl, { color: c.foreground }]}>Tipo</Text>
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
            <Text style={[styles.helpTxt, { color: c.foregroundMuted }]}>
              Entradas desde App Clientes:{'\n'}
              · Compras: pedidos de la tienda.{'\n'}
              · Tendencias: comentarios y solicitudes «Me interesa» con titular y publicación.{'\n'}
              · Carrusel: cada toque en un botón del carrusel (hasta 15 piezas distintas) con titular, botón, precio y publicación #.
            </Text>
            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalFiltros(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={detail != null} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.filterModalCard, { backgroundColor: c.background, paddingBottom: modalSheetBottomPad(insets) }]}>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Detalle</Text>
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
            {detail?.kind === 'compra' &&
            String(detail.data.status) === 'pending' &&
            ['efectivo', 'cash', 'efectivo_al_retirar'].includes(String(detail.data.payment_method || '').toLowerCase()) ? (
              <SalonButton
                title={confirmBusy ? 'Confirmando…' : 'Confirmar pago en efectivo recibido'}
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
    helpTxt: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
  });
}
