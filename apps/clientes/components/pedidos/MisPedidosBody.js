import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Package } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db, needsPickupQr, isHomeDeliveryOrder, isCardPayment, isPedidoTarjetaDomicilioCapturado } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { useSubStyles } from '../luxury/SubScreenChrome';
import { SalonButton } from '../luxury/SalonButton';
import { PickupQrDisplay } from '../tienda/PickupQrDisplay';

const GREEN = '#2E7D32';
const GOLD = '#D4AF37';
const CANCEL_RED = '#B00020';

const CANCEL_REASONS = [
  'Cambié de opinión',
  'Elegí un producto equivocado',
  'Prefiero otro método de pago',
  'Ya no lo necesito',
  'Demora en la entrega o retiro',
  'Otro motivo',
];

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function statusLabel(order) {
  const s = String(order?.status || '');
  if (isPedidoTarjetaDomicilioCapturado(order)) {
    if (s === 'confirmed') return 'Pago confirmado · preparando envío';
    if (s === 'prepared') return 'Listo · en camino';
  }
  if (s === 'pending') return 'Pendiente · pago en salón';
  if (s === 'delivered') return 'Completado';
  if (s === 'cancelled') return 'Cancelado';
  if (s === 'confirmed') return 'Confirmado';
  if (s === 'prepared') return 'Listo para retirar';
  return s || '—';
}

function isPendingCash(order) {
  const pay = String(order?.payment_method || '').toLowerCase();
  return String(order?.status) === 'pending' && ['efectivo', 'cash', 'efectivo_al_retirar'].includes(pay);
}

function canClienteCancel(order) {
  const st = String(order?.status || '');
  return st === 'pending' || st === 'confirmed' || st === 'prepared';
}

function LegendChip({ color, label, textColor }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function orderCardAccent(order, isDark) {
  const st = String(order?.status || '');
  if (st === 'delivered') {
    return {
      backgroundColor: isDark ? 'rgba(46,125,50,0.18)' : '#E8F5E9',
      borderLeftWidth: 3,
      borderLeftColor: GREEN,
    };
  }
  if (st === 'cancelled') {
    return {
      backgroundColor: isDark ? 'rgba(176,0,32,0.12)' : '#FFF5F5',
      borderLeftWidth: 3,
      borderLeftColor: CANCEL_RED,
      opacity: 0.92,
    };
  }
  if (isPendingCash(order)) {
    return {
      borderLeftWidth: 3,
      borderLeftColor: GOLD,
    };
  }
  return {};
}

export function MisPedidosBody({ sessionUser, onOpenTienda, onPedidosChanged }) {
  const { colors: c, isDark } = useTheme();
  const subStyles = useSubStyles();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(
    async (isRefresh) => {
      if (!sessionUser?.id) {
        setOrders([]);
        setLoadError('');
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setLoadError('');
      const { data, error } = await db.orders.getByCliente(sessionUser.id);
      if (error) {
        const msg = String(error.message || '');
        const low = msg.toLowerCase();
        setOrders([]);
        setLoadError(
          low.includes('permission denied') || low.includes('row-level security')
            ? 'Faltan permisos en Supabase. Ejecutá supabase-ecommerce-orders-clientes.sql y supabase-sucursales-client-pedidos.sql.'
            : msg || 'No se pudieron cargar tus pedidos.',
        );
      } else {
        setOrders(Array.isArray(data) ? data : []);
      }
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    },
    [sessionUser?.id],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const runCancel = useCallback(
    async (order, reason) => {
      setCancellingId(order.id);
      const { data, error } = await db.orders.cancelarPorCliente(order.id, reason);
      setCancellingId(null);
      if (error) {
        const msg = String(error.message || '');
        Alert.alert(
          'No se pudo cancelar',
          msg.includes('client_cancel_pedido') || msg.includes('Could not find the function')
            ? 'Falta configurar Supabase. Ejecutá supabase-ecommerce-orders-client-cancel.sql en el SQL Editor.'
            : msg || 'Intentá de nuevo.',
        );
        return;
      }
      if (data) {
        setOrders((prev) => prev.map((o) => (o.id === data.id ? { ...o, ...data } : o)));
      }
      setExpandedId(null);
      await load(true);
      onPedidosChanged?.();
      Alert.alert('Pedido cancelado', 'El salón verá el pedido como cancelado en su bandeja.');
    },
    [load, onPedidosChanged],
  );

  const promptCancel = useCallback(
    (order) => {
      Alert.alert(
        'Cancelar pedido',
        '¿Por qué deseas cancelar? El salón verá el motivo en Pedidos.',
        [
          ...CANCEL_REASONS.map((label) => ({
            text: label,
            onPress: () => runCancel(order, label),
          })),
          { text: 'Volver', style: 'cancel' },
        ],
        { cancelable: true },
      );
    },
    [runCancel],
  );

  const renderItem = ({ item: o }) => {
    const pendingCash = isPendingCash(o);
    const showQr = needsPickupQr(o);
    const expanded = expandedId === o.id;
    const st = String(o.status || '');
    const cancelled = st === 'cancelled';
    const delivered = st === 'delivered';
    const showCancelBtn = canClienteCancel(o);
    const busy = cancellingId === o.id;

    return (
      <View
        style={[
          styles.card,
          { borderColor: c.cardBorder, backgroundColor: c.card },
          orderCardAccent(o, isDark),
        ]}
      >
        {cancelled ? (
          <View style={styles.cancelBanner} pointerEvents="none">
            <Text style={styles.cancelBannerTitle}>Cancelado</Text>
            {o.cancelled_reason ? (
              <Text style={styles.cancelBannerReason} numberOfLines={3}>
                {o.cancelled_reason}
              </Text>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setExpandedId(expanded ? null : o.id)}
          disabled={busy}
        >
          <View style={styles.rowTop}>
            <Text style={[styles.code, { color: delivered ? GREEN : c.primary }]}>
              {o.tracking_code || '—'}
            </Text>
            <Text style={[styles.amount, { color: c.foreground }]}>
              Q{Number(o.total_amount || 0).toFixed(2)}
            </Text>
          </View>
          <Text
            style={[
              styles.meta,
              { color: delivered ? GREEN : cancelled ? CANCEL_RED : c.foregroundMuted },
            ]}
          >
            {statusLabel(o)}
          </Text>
          <Text style={[styles.meta, { color: c.foregroundSubtle }]}>
            {formatWhen(o.created_at)} ·{' '}
            {isHomeDeliveryOrder(o) ? 'Envío a domicilio' : 'Retiro en salón'}
            {isPedidoTarjetaDomicilioCapturado(o) && isCardPayment(o) ? ' · tarjeta confirmada' : ''}
          </Text>
          {isHomeDeliveryOrder(o) && o.delivery_address ? (
            <Text style={[styles.notes, { color: c.foregroundMuted }]} numberOfLines={expanded ? 8 : 2}>
              {o.delivery_address}
            </Text>
          ) : null}
          {!isHomeDeliveryOrder(o) && o.notes ? (
            <Text style={[styles.notes, { color: c.foregroundMuted }]} numberOfLines={expanded ? 6 : 2}>
              {o.notes}
            </Text>
          ) : null}
        </TouchableOpacity>

        {expanded && showQr ? (
          <PickupQrDisplay
            trackingCode={o.tracking_code}
            hint="Mostrá este QR en recepción. El salón lo escaneará al confirmar tu pago en efectivo."
          />
        ) : null}
        {expanded && pendingCash && !showQr ? (
          <Text style={[styles.warn, { color: c.foregroundMuted }]}>
            Pedido pendiente sin código QR. Si acabas de comprar, tirá hacia abajo para actualizar.
          </Text>
        ) : null}

        {expanded && showCancelBtn ? (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: CANCEL_RED }]}
            onPress={() => promptCancel(o)}
            disabled={busy}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Cancelar pedido"
          >
            {busy ? (
              <ActivityIndicator size="small" color={CANCEL_RED} />
            ) : (
              <Text style={styles.cancelBtnTxt}>Cancelar pedido</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  if (!sessionUser?.id) {
    return (
      <>
        <View style={subStyles.card}>
          <Text style={subStyles.rowLabel}>Iniciá sesión</Text>
          <Text style={subStyles.bullets}>Necesitás una cuenta para ver tus pedidos de tienda.</Text>
        </View>
      </>
    );
  }

  const listHeader = (
    <>
      {loadError ? (
        <TouchableOpacity
          style={[styles.errorBar, { borderColor: c.cardBorder, backgroundColor: c.card }]}
          onPress={() => void load(true)}
          activeOpacity={0.85}
        >
          <Text style={[styles.errorTxt, { color: c.foregroundMuted }]}>{loadError}</Text>
          <Text style={[styles.errorRetry, { color: c.primary }]}>Tocá para reintentar</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );

  const listEmpty = (
    <View style={[subStyles.card, { marginTop: spacing.sm }]}>
      <Text style={subStyles.rowLabel}>Sin pedidos todavía</Text>
      <Text style={subStyles.bullets}>
        Cuando compres en la tienda, aparecerán aquí con su código de seguimiento. Envío con tarjeta no usa QR.
      </Text>
      {onOpenTienda ? (
        <SalonButton
          title="Ir a la tienda"
          variant="heroGold"
          fullWidth
          style={{ marginTop: spacing.md }}
          onPress={onOpenTienda}
        />
      ) : null}
    </View>
  );

  return (
    <View style={[styles.shell, { backgroundColor: c.background }]}>
      {loading ? (
        <>
          {listHeader}
          <ActivityIndicator style={{ marginVertical: spacing.lg }} color={c.primary} />
        </>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => String(o.id)}
          renderItem={renderItem}
          style={[styles.list, { backgroundColor: c.background }]}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={c.primary}
              colors={[c.primary]}
              progressBackgroundColor={c.card}
            />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  list: { flex: 1 },
  listContent: {
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  errorBar: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorTxt: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    lineHeight: 19,
  },
  errorRetry: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  introCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  introAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  introKicker: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingLeft: spacing.sm,
  },
  introHeadline: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
  },
  introBody: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  introIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  introIconCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
  },
  introIconTxt: {
    fontFamily: typography.fontSans,
    fontSize: 11,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingLeft: spacing.sm,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: typography.fontSans,
    fontSize: 11,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  cancelBanner: {
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(176, 0, 32, 0.12)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(176, 0, 32, 0.25)',
  },
  cancelBannerTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: CANCEL_RED,
    letterSpacing: 0.3,
  },
  cancelBannerReason: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: CANCEL_RED,
    marginTop: 4,
    lineHeight: 17,
    opacity: 0.95,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  code: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    letterSpacing: 1,
  },
  amount: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
  },
  meta: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    marginTop: 4,
  },
  notes: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  warn: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    marginTop: spacing.sm,
    lineHeight: 17,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  cancelBtnTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: CANCEL_RED,
  },
});
