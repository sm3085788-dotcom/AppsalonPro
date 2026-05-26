import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';
import { useSubStyles } from '../luxury/SubScreenChrome';
import { SalonButton } from '../luxury/SalonButton';
import { PickupQrDisplay } from '../tienda/PickupQrDisplay';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function statusLabel(status) {
  const s = String(status || '');
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

export function MisPedidosBody({ sessionUser, onOpenTienda }) {
  const { colors: c } = useTheme();
  const subStyles = useSubStyles();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(
    async (isRefresh) => {
      if (!sessionUser?.id) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data, error } = await db.orders.getByCliente(sessionUser.id);
      if (!error && Array.isArray(data)) setOrders(data);
      else setOrders([]);
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    },
    [sessionUser?.id],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const renderItem = ({ item: o }) => {
    const pendingCash = isPendingCash(o);
    const showQr = pendingCash && o.tracking_code;
    const expanded = expandedId === o.id;

    return (
      <View
        style={[
          styles.card,
          { borderColor: c.cardBorder, backgroundColor: c.card },
          pendingCash && { borderLeftWidth: 3, borderLeftColor: '#D4AF37' },
          String(o.status) === 'delivered' && { opacity: 0.9 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setExpandedId(expanded ? null : o.id)}
        >
          <View style={styles.rowTop}>
            <Text style={[styles.code, { color: c.primary }]}>{o.tracking_code || '—'}</Text>
            <Text style={[styles.amount, { color: c.foreground }]}>
              Q{Number(o.total_amount || 0).toFixed(2)}
            </Text>
          </View>
          <Text style={[styles.meta, { color: c.foregroundMuted }]}>{statusLabel(o.status)}</Text>
          <Text style={[styles.meta, { color: c.foregroundSubtle }]}>
            {formatWhen(o.created_at)} · {o.fulfillment_type === 'domicilio' ? 'Envío a domicilio' : 'Retiro en salón'}
          </Text>
          {o.notes ? (
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
    <Text style={[styles.lead, { color: c.foregroundMuted }]}>
      Pedidos de la tienda (efectivo, retiro o envío). Los pendientes en efectivo incluyen tu código QR para el salón.
    </Text>
  );

  const listEmpty = (
    <View style={[subStyles.card, { marginTop: spacing.sm }]}>
      <Text style={subStyles.rowLabel}>Sin pedidos todavía</Text>
      <Text style={subStyles.bullets}>
        Cuando compres en la tienda con efectivo o tarjeta, aparecerán aquí con su código de seguimiento.
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
    <View style={styles.shell}>
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
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
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
  lead: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
});
