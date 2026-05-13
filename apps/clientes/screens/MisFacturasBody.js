import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { FileText, X } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { db } from '@appsalon/shared-config';
import { SalonButton } from '../components/luxury/SalonButton';
import { useSubStyles } from '../components/luxury/SubScreenChrome';
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

/**
 * Facturas de compras/servicios completados asociados a la ficha `clientes` del usuario.
 * Misma tabla `ventas` que ve el salón en Papelería; aquí filtrado por `cliente_id`.
 */
export function MisFacturasBody({ clienteId, onClose }) {
  const { colors: c } = useTheme();
  const subStyles = useSubStyles();
  const styles = useMemo(() => createStyles(c), [c]);

  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);
  const [sortMode, setSortMode] = useState('fecha_desc');
  const [filterFactura, setFilterFactura] = useState('todas');

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
        const { data, error } = await db.ventas.getByCliente(clienteId);
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
        const blob = [facturaLabel(v), v?.metodo_pago, v?.vendedor?.nombre, v?.notas].join(' ').toLowerCase();
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

  const verDetalle = (v) => {
    const lines = [
      `Factura / folio: ${facturaLabel(v)}`,
      `Fecha: ${v?.fecha ? new Date(v.fecha).toLocaleString('es-GT') : '—'}`,
      `Vendedor: ${v?.vendedor?.nombre || '—'}`,
      `Total: ${formatQ(montoVenta(v))}`,
      `Pago: ${v?.metodo_pago || '—'}`,
    ].join('\n');
    let items = '';
    try {
      items = v?.items != null ? `\n\nDetalle (JSON):\n${JSON.stringify(v.items, null, 2)}` : '';
    } catch {
      items = '';
    }
    Alert.alert('Tu factura', `${lines}${items}`.slice(0, 8000), [{ text: 'Cerrar' }], { cancelable: true });
  };

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
    <>
      <TextInput
        style={[styles.search, { borderColor: c.cardBorder, backgroundColor: c.card, color: c.foreground }]}
        placeholder="Buscar por folio, método, notas…"
        placeholderTextColor={c.foregroundSubtle}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <View style={styles.toolbar}>
        <Text style={[styles.toolbarMeta, { color: c.foregroundMuted }]}>
          {loading ? '…' : `${filtered.length} factura${filtered.length === 1 ? '' : 's'}`}
        </Text>
        <TouchableOpacity hitSlop={12} onPress={() => setModalFiltros(true)} accessibilityRole="button">
          <Text style={[styles.toolbarLink, { color: c.primary }]}>Ordenar · filtros</Text>
        </TouchableOpacity>
      </View>
      <Text style={[subStyles.muted, { fontSize: 12, lineHeight: 17, marginBottom: spacing.md }]} numberOfLines={2}>
        {filtroResumen}
      </Text>

      <TouchableOpacity
        onPress={() => onRefresh()}
        disabled={refreshing || loading}
        style={{ marginBottom: spacing.sm }}
        accessibilityRole="button"
        accessibilityLabel="Actualizar lista de facturas"
      >
        <Text style={[styles.toolbarLink, { color: c.primary }]}>
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={c.primary} />
      ) : filtered.length === 0 ? (
        <Text style={subStyles.muted}>
          {ventas.length === 0
            ? 'Aún no hay ventas registradas a tu nombre. Después de pagar en salón, el folio aparecerá aquí.'
            : 'Ningún resultado con los filtros actuales.'}
        </Text>
      ) : (
        filtered.map((v) => (
          <TouchableOpacity
            key={String(v.id)}
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
                {formatQ(montoVenta(v))} · {v?.vendedor?.nombre || 'Salón'}
              </Text>
              <Text style={[subStyles.muted, styles.meta]} numberOfLines={1}>
                {v?.fecha ? new Date(v.fecha).toLocaleString('es-GT') : '—'} · {v?.metodo_pago || '—'}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} style={{ marginTop: spacing.md }} />

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
    </>
  );
}

function createStyles(c) {
  return StyleSheet.create({
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
    },
    chipTxt: { fontFamily: typography.fontSansMedium, fontSize: 13 },
  });
}
