import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, X, Gift } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { fetchClientMisFacturas } from '@appsalon/shared-config';
import {
  formatQ,
  montoVenta,
  facturaLabel,
  profesionalLabel,
  extractGiftCardFromVenta,
} from '../../../shared/utils/ventaFactura';
import { FacturaDetalleModal } from '../components/facturas/FacturaDetalleModal';
import { SalonButton } from '../components/luxury/SalonButton';
import { useSubStyles } from '../components/luxury/SubScreenChrome';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Facturas del cliente — misma presentación que Papelería (App Salón).
 */
export function MisFacturasBody({ clienteId, clienteNombre, onClose, initialVentaId = null }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(), []);

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortMode, setSortMode] = useState('fecha_desc');
  const [filterFactura, setFilterFactura] = useState('todas');
  const [detalleVenta, setDetalleVenta] = useState(null);

  const padBottom = Math.max(insets.bottom + spacing.md, spacing.lg);

  const load = useCallback(
    async (isRefresh) => {
      if (!clienteId) {
        setVentas([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const { data, error } = await fetchClientMisFacturas(300);
        if (error) throw error;
        setVentas(Array.isArray(data) ? data : []);
      } catch (e) {
        Alert.alert('Mis facturas', e?.message || 'No se pudieron cargar tus facturas.');
        setVentas([]);
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [clienteId],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useEffect(() => {
    if (!initialVentaId || loading) return;
    if (ventas.some((v) => String(v.id) === String(initialVentaId))) return;
    load(true);
  }, [initialVentaId, loading, ventas, load]);

  useEffect(() => {
    if (!initialVentaId || loading) return;
    const hit = ventas.find((v) => String(v.id) === String(initialVentaId));
    if (hit) setDetalleVenta(hit);
  }, [initialVentaId, loading, ventas]);

  const onRefresh = () => load(true);

  const filtroResumen = useMemo(() => {
    const orden =
      sortMode === 'fecha_asc'
        ? 'Más antiguas'
        : sortMode === 'monto_desc'
          ? 'Monto mayor'
          : sortMode === 'monto_asc'
            ? 'Monto menor'
            : 'Más recientes';
    const fac =
      filterFactura === 'con_numero' ? 'Con folio' : filterFactura === 'sin_numero' ? 'Sin folio' : 'Todas';
    return `${orden} · ${fac}`;
  }, [sortMode, filterFactura]);

  const filtered = useMemo(() => {
    let rows = [...ventas];
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((v) => {
        const gift = extractGiftCardFromVenta(v);
        const blob = [facturaLabel(v), v?.metodo_pago, profesionalLabel(v), v?.notas, gift?.codigo, v?.detalles_pago]
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
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
  }, [ventas, query, sortMode, filterFactura]);

  const renderItem = useCallback(
    ({ item: v }) => {
      const prof = profesionalLabel(v) || 'Salón';
      const fecha = v?.fecha
        ? new Date(v.fecha).toLocaleString('es-GT', {
            day: '2-digit',
            month: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—';
      const subParts = [prof, fecha, v?.metodo_pago].filter(Boolean);
      const gift = extractGiftCardFromVenta(v);

      return (
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: c.cardBorder }]}
          onPress={() => setDetalleVenta(v)}
          activeOpacity={0.7}
        >
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
            {gift?.codigo ? (
              <View style={[styles.giftBadge, { borderColor: c.primary, backgroundColor: c.surfaceMuted }]}>
                <Gift size={11} color={c.primary} strokeWidth={2} />
                <Text style={[styles.giftBadgeTxt, { color: c.primary }]} numberOfLines={1}>
                  Tarjeta regalo · {gift.codigo}
                </Text>
              </View>
            ) : null}
          </View>
          <ChevronRight size={16} color={c.foregroundSubtle} style={styles.rowChev} />
        </TouchableOpacity>
      );
    },
    [c, styles],
  );

  if (!clienteId) {
    return (
      <>
        <View style={[subStyles.card, { paddingTop: 2 }]}>
          <Text style={subStyles.rowLabel}>Facturas de tus compras y servicios</Text>
          <Text style={[subStyles.rowSub, { marginTop: spacing.sm }]}>
            Cuando tu cuenta de la app esté enlazada a una ficha de cliente en el salón, aquí verás las mismas
            ventas facturadas que el equipo registra en caja (App Salón · Papelería).
          </Text>
        </View>
        <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      </>
    );
  }

  return (
    <View style={styles.body}>
      <TextInput
        style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
        placeholder="Buscar folio, método, notas…"
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
          <Text style={[styles.toolbarLink, { color: c.primary }]}>Filtros</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.filtroResumen, { color: c.foregroundSubtle }]} numberOfLines={2}>
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
              paddingBottom: padBottom,
              flexGrow: filtered.length === 0 ? 1 : 0,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={[styles.emptyTxt, { color: c.foregroundMuted }]}>
                {ventas.length === 0
                  ? 'Aún no hay ventas registradas a tu nombre. Después de pagar en salón, el folio aparecerá aquí.'
                  : 'Ningún resultado con la búsqueda o filtros actuales.'}
              </Text>
            }
          />
        </View>
      )}

      <SalonButton
        variant="outlineGray"
        title="Cerrar"
        fullWidth
        onPress={onClose}
        style={{ marginTop: spacing.sm }}
      />

      <FacturaDetalleModal
        venta={detalleVenta}
        visible={!!detalleVenta}
        onClose={() => setDetalleVenta(null)}
        clienteNombre={clienteNombre}
      />

      <Modal visible={modalFiltros} animationType="slide" transparent onRequestClose={() => setModalFiltros(false)}>
        <View style={styles.filterBackdrop}>
          <View
            style={[
              styles.filterSheet,
              { backgroundColor: c.background, paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl) },
            ]}
          >
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
                { id: 'fecha_asc', label: 'Más antiguas' },
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

function createStyles() {
  return StyleSheet.create({
    body: {
      flex: 1,
      minHeight: 0,
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
      minHeight: 120,
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
    giftBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
      borderWidth: 1,
      maxWidth: '100%',
    },
    giftBadgeTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      flexShrink: 1,
    },
    rowChev: {
      flexShrink: 0,
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
  });
}
