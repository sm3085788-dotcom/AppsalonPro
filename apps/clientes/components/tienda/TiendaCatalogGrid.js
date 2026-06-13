import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import {
  db,
  mapInventarioToTiendaProduct,
  getArticuloTipo,
} from '@appsalon/shared-config';
import { ProductCardPlaceholder } from './ProductCardPlaceholder';

const GAP = 10;

/** Solo productos de inventario con `visible_en_tienda` (App Salón). Sin marketing ni servicios. */
function isTiendaProductRow(row) {
  if (!row?.id) return false;
  if (getArticuloTipo(row) === 'servicio') return false;
  if (getArticuloTipo(row) === 'nuevo_stock') return false;
  return true;
}

export function TiendaCatalogGrid({ onProductPress, onAddToCart, products: productsProp, sucursalId }) {
  const { colors: c } = useTheme();
  const { width: winW } = useWindowDimensions();
  const outerPad = spacing.lg * 2;
  const innerW = winW - outerPad;
  const cardW = (innerW - GAP) / 2;

  const [liveProducts, setLiveProducts] = useState([]);
  const [loading, setLoading] = useState(!productsProp);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('nombre_asc');
  const [panelOpen, setPanelOpen] = useState(false);

  const loadRemote = useCallback(async () => {
    setLoading(true);
    try {
      const invRes = await db.inventario.getVisiblesEnTienda({ sucursalId });
      const rows = !invRes.error && Array.isArray(invRes.data) ? invRes.data : [];
      const productRows = rows.filter(isTiendaProductRow);
      const mapped = productRows.map(mapInventarioToTiendaProduct).filter(Boolean);
      setLiveProducts(mapped.map((p) => ({ ...p, catalogKind: 'producto' })));
    } finally {
      setLoading(false);
    }
  }, [sucursalId]);

  useEffect(() => {
    if (productsProp) return undefined;
    let cancelled = false;
    void (async () => {
      await loadRemote();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [productsProp, loadRemote]);

  const catalog = productsProp?.length ? productsProp : liveProducts;

  const filteredSorted = useMemo(() => {
    let list = [...catalog];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const t = String(p.title || '').toLowerCase();
        const b = String(p.brandLine || '').toLowerCase();
        return t.includes(q) || b.includes(q);
      });
    }
    const priceNum = (p) => Number(p.priceAmount ?? 0) || 0;
    const name = (p) => String(p.title || '').toLowerCase();
    if (sortKey === 'nombre_desc') list.sort((a, b) => name(b).localeCompare(name(a), 'es'));
    else if (sortKey === 'nombre_asc') list.sort((a, b) => name(a).localeCompare(name(b), 'es'));
    else if (sortKey === 'precio_desc') list.sort((a, b) => priceNum(b) - priceNum(a));
    else if (sortKey === 'precio_asc') list.sort((a, b) => priceNum(a) - priceNum(b));
    return list;
  }, [catalog, search, sortKey]);

  const slots = useMemo(
    () =>
      filteredSorted.map((product, i) => ({
        id: `live-${product.id}`,
        index: i + 1,
        product,
      })),
    [filteredSorted],
  );

  const sortLabel =
    sortKey === 'nombre_desc'
      ? 'Nombre Z → A'
      : sortKey === 'precio_asc'
        ? 'Precio menor'
        : sortKey === 'precio_desc'
          ? 'Precio mayor'
          : 'Nombre A → Z';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          paddingBottom: spacing.xl,
        },
        searchBar: {
          backgroundColor: c.card,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          paddingVertical: 10,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foreground,
        },
        toolbar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        resultMeta: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.foregroundMuted,
          flex: 1,
          marginRight: spacing.sm,
        },
        sortLink: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.primary,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        },
        modalCard: {
          backgroundColor: c.background,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          padding: spacing.lg,
          paddingBottom: spacing.xl,
          maxHeight: '72%',
        },
        modalScroll: {
          backgroundColor: c.background,
        },
        modalTitle: {
          fontFamily: typography.fontSansMedium,
          fontSize: 17,
          color: c.foreground,
          marginBottom: spacing.sm,
        },
        modalSection: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.foregroundMuted,
          marginTop: spacing.md,
          marginBottom: spacing.xs,
        },
        chip: {
          paddingVertical: 10,
          paddingHorizontal: spacing.md,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: c.cardBorder,
          marginBottom: spacing.sm,
          backgroundColor: c.card,
        },
        chipOn: {
          borderColor: c.primary,
          backgroundColor: c.surfaceMuted,
        },
        chipTxt: {
          fontFamily: typography.fontSans,
          fontSize: 14,
          color: c.foreground,
        },
        emptyWrap: {
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.md,
          alignItems: 'center',
        },
        emptyTitle: {
          fontFamily: typography.fontSansMedium,
          fontSize: 16,
          color: c.foreground,
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        emptyTxt: {
          fontFamily: typography.fontSans,
          fontSize: 14,
          lineHeight: 21,
          color: c.foregroundMuted,
          textAlign: 'center',
        },
      }),
    [c],
  );

  const chip = (active) => [styles.chip, active && styles.chipOn];

  return (
    <View style={styles.page}>
      <TextInput
        style={styles.searchBar}
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar productos…"
        placeholderTextColor={c.foregroundSubtle}
        returnKeyType="search"
        accessibilityLabel="Buscar productos en tienda"
      />

      <View style={styles.toolbar}>
        <Text style={styles.resultMeta} numberOfLines={2}>
          {loading ? 'Cargando…' : `${slots.filter((s) => s.product).length} productos · ${sortLabel}`}
        </Text>
        <TouchableOpacity hitSlop={12} accessibilityRole="button" onPress={() => setPanelOpen(true)}>
          <Text style={styles.sortLink}>Ordenar</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={panelOpen} transparent animationType="slide" onRequestClose={() => setPanelOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPanelOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Ordenar productos</Text>
            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {[
                { id: 'nombre_asc', label: 'Nombre A → Z' },
                { id: 'nombre_desc', label: 'Nombre Z → A' },
                { id: 'precio_asc', label: 'Precio menor primero' },
                { id: 'precio_desc', label: 'Precio mayor primero' },
              ].map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={chip(sortKey === o.id)}
                  onPress={() => setSortKey(o.id)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.chipTxt}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={{ marginTop: spacing.md }} onPress={() => setPanelOpen(false)} hitSlop={12}>
              <Text style={[styles.sortLink, { textAlign: 'center' }]}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {loading ? <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.lg }} /> : null}

      {!loading && slots.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>
            {search.trim() ? 'Sin resultados' : 'Sin productos en tienda'}
          </Text>
          <Text style={styles.emptyTxt}>
            {search.trim()
              ? 'Probá otro término de búsqueda.'
              : 'El salón debe marcar productos como «visible en tienda» en Inventario (App Salón).'}
          </Text>
        </View>
      ) : null}

      {!loading && slots.length > 0 ? (
        <View style={styles.grid}>
          {slots.map((slot) => (
            <ProductCardPlaceholder
              key={slot.id}
              slotIndex={slot.index}
              width={cardW}
              product={slot.product}
              onPress={onProductPress ? () => onProductPress(slot.product) : undefined}
              onAddPress={
                onAddToCart && !slot.product.precioVariable
                  ? () => onAddToCart(slot.product)
                  : undefined
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
