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
import { SubScreenChrome, SalonButton, useSubStyles } from '../components/luxury';
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

export function PedidosScreen({ onBack }) {
  const { colors: c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [tab, setTab] = useState('todos');
  const [query, setQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [comments, setComments] = useState([]);
  const [carousel, setCarousel] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailItems, setDetailItems] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.xl);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [oRes, cRes, pRes] = await Promise.all([
        db.orders.getAll(),
        db.marketingComments.listForPedidosInbox(400),
        db.marketingPosts.getPublishedHomeCarousel(30),
      ]);
      if (oRes.error) throw oRes.error;
      setOrders(Array.isArray(oRes.data) ? oRes.data : []);
      if (!cRes.error && Array.isArray(cRes.data)) {
        setComments(cRes.data.filter((row) => isTrendsPost(row.marketing_posts)));
      } else {
        setComments([]);
      }
      if (!pRes.error && Array.isArray(pRes.data)) setCarousel(pRes.data);
      else setCarousel([]);
    } catch (e) {
      Alert.alert('Pedidos', e?.message || 'No se pudo cargar la bandeja.');
      setOrders([]);
      setComments([]);
      setCarousel([]);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

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
        kind: 'tendencias',
        sortAt: cm.created_at,
        data: cm,
      });
    }
    for (const p of carousel) {
      rows.push({
        key: `carousel-${p.id}`,
        kind: 'carrusel',
        sortAt: p.published_at || p.created_at,
        data: p,
      });
    }
    rows.sort((a, b) => new Date(b.sortAt || 0) - new Date(a.sortAt || 0));
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === 'compra' && r.kind !== 'compra') return false;
      if (tab === 'tendencias' && r.kind !== 'tendencias') return false;
      if (tab === 'carrusel' && r.kind !== 'carrusel') return false;
      if (!q) return true;
      if (r.kind === 'compra') {
        const o = r.data;
        const blob = [o.customer_name, o.customer_phone, o.tracking_code, o.notes, o.status].join(' ').toLowerCase();
        return blob.includes(q);
      }
      if (r.kind === 'tendencias') {
        const cm = r.data;
        const blob = [cm.content, cm.author_name, cm.marketing_posts?.title].join(' ').toLowerCase();
        return blob.includes(q);
      }
      const p = r.data;
      const blob = [p.title, p.body, p.cta_text].join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [orders, comments, carousel, tab, query]);

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
          style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}
          onPress={() => openDetail(item)}
          activeOpacity={0.88}
        >
          <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
            <Package size={20} color={c.foregroundMuted} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.badge, { color: c.primary }]}>Compra · tienda</Text>
            <Text style={[styles.title, { color: c.foreground }]} numberOfLines={1}>
              {o.customer_name || 'Cliente'}
            </Text>
            <Text style={[subStyles.muted, styles.meta]} numberOfLines={2}>
              {o.tracking_code} · {formatWhen(o.created_at)} · {String(o.status || '—')}
            </Text>
            <Text style={[subStyles.muted, styles.meta]} numberOfLines={1}>
              Q{Number(o.total_amount || 0).toFixed(2)} · {o.payment_method || '—'} · {o.customer_phone || '—'}
            </Text>
          </View>
          <ChevronRight size={18} color={c.foregroundMuted} />
        </TouchableOpacity>
      );
    }
    if (item.kind === 'tendencias') {
      const cm = item.data;
      return (
        <TouchableOpacity
          style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}
          onPress={() => openDetail(item)}
          activeOpacity={0.88}
        >
          <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
            <MessageCircle size={20} color={c.foregroundMuted} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.badge, { color: c.primary }]}>Tendencias · consulta</Text>
            <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>
              {cm.content || '—'}
            </Text>
            <Text style={[subStyles.muted, styles.meta]} numberOfLines={1}>
              {cm.author_name || 'Cliente'} · {formatWhen(cm.created_at)} · {cm.moderation_status || '—'}
            </Text>
            <Text style={[subStyles.muted, styles.meta]} numberOfLines={1}>
              Post: {cm.marketing_posts?.title || `#${cm.post_id}`}
            </Text>
          </View>
          <ChevronRight size={18} color={c.foregroundMuted} />
        </TouchableOpacity>
      );
    }
    const p = item.data;
    let carPreview = (p.body || '').trim();
    if (String(p.audience || '') === 'home_carousel' && carPreview.startsWith('{')) {
      try {
        const o = JSON.parse(carPreview);
        carPreview = [o.headline, o.body].filter(Boolean).join(' · ') || carPreview;
      } catch {
        /* mantener */
      }
    }
    const carPreviewShort =
      carPreview.length > 120 ? `${carPreview.slice(0, 120)}…` : carPreview;
    return (
      <TouchableOpacity
        style={[styles.card, { borderColor: c.cardBorder, backgroundColor: c.card }]}
        onPress={() => openDetail(item)}
        activeOpacity={0.88}
      >
        <View style={[styles.iconWrap, { backgroundColor: c.surfaceMuted }]}>
          <Megaphone size={20} color={c.foregroundMuted} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.badge, { color: c.primary }]}>Publicidad · carrusel inicio</Text>
          <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>
            {p.title || 'Diapositiva'}
          </Text>
          <Text style={[subStyles.muted, styles.meta]} numberOfLines={2}>
            {carPreviewShort}
          </Text>
          <Text style={[subStyles.muted, styles.meta]} numberOfLines={1}>
            {formatWhen(p.published_at || p.created_at)} · {p.status || '—'}
          </Text>
        </View>
        <ChevronRight size={18} color={c.foregroundMuted} />
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
    if (detail.kind === 'tendencias') {
      const cm = detail.data;
      return [
        `Comentario:\n${cm.content}`,
        `\nAutor: ${cm.author_name || '—'}`,
        `Moderación: ${cm.moderation_status || '—'}`,
        `Post: ${cm.marketing_posts?.title || cm.post_id}`,
        `Fecha: ${formatWhen(cm.created_at)}`,
      ].join('\n');
    }
    const p = detail.data;
    let bodyShow = (p.body || '—').trim();
    if (String(p.audience || '') === 'home_carousel' && bodyShow.startsWith('{')) {
      try {
        const o = JSON.parse(bodyShow);
        const lines = [
          o.headline && `Titular: ${o.headline}`,
          o.body != null && String(o.body).trim() && `Texto: ${o.body}`,
          o.priceLabel && `Precio: ${o.priceLabel}`,
          o.buttonTitle && `Botón: ${o.buttonTitle}`,
          o.kicker && `Etiqueta: ${o.kicker}`,
        ].filter(Boolean);
        if (lines.length) bodyShow = lines.join('\n');
      } catch {
        /* mantener texto crudo */
      }
    }
    return [
      `Título: ${p.title}`,
      `Cuerpo / overlay:\n${bodyShow}`,
      `CTA (columna legacy): ${p.cta_text || '—'}`,
      `Estado: ${p.status}`,
      `Publicado: ${formatWhen(p.published_at || p.created_at)}`,
      `Media: ${p.media_url || '—'}`,
    ].join('\n');
  };

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SubScreenChrome
        title="Pedidos"
        subtitle="Compras de la tienda (ecommerce), consultas en Tendencias y piezas del carrusel Publicidad en App Clientes."
        onBack={onBack}
        disableBodyScroll
        bottomPadding={0}
      >
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <TextInput
            style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
            placeholder="Buscar en la bandeja…"
            placeholderTextColor={c.foregroundSubtle}
            value={query}
            onChangeText={setQuery}
          />
          <View style={styles.tabRow}>
            {TABS.map((t) => {
              const on = tab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.tabChip,
                    { borderColor: on ? c.primary : c.cardBorder, backgroundColor: on ? c.surfaceMuted : c.card },
                  ]}
                  onPress={() => setTab(t.id)}
                >
                  <Text style={[styles.tabChipTxt, { color: on ? c.primary : c.foreground }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.toolbar}>
            <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
              {loading ? '…' : `${merged.length} ítem${merged.length === 1 ? '' : 's'}`}
            </Text>
            <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)}>
              <Text style={[styles.toolbarLink, { color: c.primary }]}>Ayuda</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
          ) : (
            <FlatList
              data={merged}
              keyExtractor={(it) => it.key}
              renderItem={renderItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
              contentContainerStyle={{ paddingBottom: padBottom, flexGrow: 1 }}
              ListEmptyComponent={
                <Text style={subStyles.muted}>
                  No hay registros con los filtros actuales. Las compras llegan desde App Clientes (checkout); los
                  comentarios, desde Tendencias; el carrusel se publica en Marketing · Carrusel inicio.
                </Text>
              }
            />
          )}
        </View>
      </SubScreenChrome>

      <Modal visible={modalFiltros} animationType="fade" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.helpBackdrop}>
          <View style={[styles.helpCard, { backgroundColor: c.background }]}>
            <View style={styles.helpHead}>
              <Text style={[styles.helpTitle, { color: c.foreground }]}>Bandeja Pedidos</Text>
              <TouchableOpacity onPress={() => setModalFiltros(false)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[subStyles.muted, { lineHeight: 20 }]}>
              · Compras: filas de `ecommerce_orders` generadas por clientes.{'\n'}
              · Tendencias: comentarios en posts de marketing con multimedia (no carrusel inicio).{'\n'}
              · Carrusel: contenidos con audiencia «inicio» creados en Marketing.{'\n'}
              Moderá comentarios pendientes desde aquí o en la base (`marketing_comments`).
            </Text>
            <SalonButton title="Listo" variant="heroGold" fullWidth onPress={() => setModalFiltros(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={detail != null} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.helpBackdrop}>
          <View style={[styles.helpCard, { backgroundColor: c.background }]}>
            <View style={styles.helpHead}>
              <Text style={[styles.helpTitle, { color: c.foreground }]}>Detalle</Text>
              <TouchableOpacity onPress={() => setDetail(null)} hitSlop={12}>
                <X size={22} color={c.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: c.foreground, fontFamily: typography.fontSans, fontSize: 14, lineHeight: 22 }} selectable>
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
            <SalonButton title="Cerrar" variant="outlineGray" fullWidth onPress={() => setDetail(null)} style={{ marginTop: spacing.md }} />
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
      minHeight: 46,
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    tabRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    tabChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    tabChipTxt: { fontFamily: typography.fontSansMedium, fontSize: 12 },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    toolbarMeta: { fontFamily: typography.fontSansMedium, fontSize: 13 },
    toolbarLink: { fontFamily: typography.fontSansMedium, fontSize: 13 },
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
    badge: { fontFamily: typography.fontSansMedium, fontSize: 11, marginBottom: 4 },
    title: { fontFamily: typography.fontSansMedium, fontSize: 15 },
    meta: { fontSize: 12, marginTop: 4 },
    helpBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    helpCard: {
      borderRadius: radii.lg,
      padding: spacing.lg,
      maxHeight: '88%',
    },
    helpHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    helpTitle: { fontFamily: typography.fontDisplay, fontSize: 20 },
  });
}
