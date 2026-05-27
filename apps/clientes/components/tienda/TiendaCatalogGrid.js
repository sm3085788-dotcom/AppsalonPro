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
import { TIENDA_PRODUCT_SLOTS } from '../../data/tiendaPlaceholders';
import { ProductCardPlaceholder } from './ProductCardPlaceholder';

const GAP = 10;

function mapPostToPromoProduct(post) {
  const id = post?.id != null ? String(post.id) : '';
  const title = String(post?.title || 'Promoción').trim() || 'Promoción';
  const uri = post?.media_url && String(post.media_url).trim() ? String(post.media_url).trim() : null;
  return {
    id: `promo-${id}`,
    catalogKind: 'promo',
    promoPostId: id,
    title,
    brandLine: 'PROMOCIÓN',
    priceLabel: 'Ver promoción',
    priceAmount: 0,
    precioVariable: true,
    imageUri: uri,
    imageUris: uri ? [uri] : [],
    rating: 5,
    reviewCount: 0,
    shippingLabel: 'Salon Andreas · consultá en recepción',
    badge: 'Promo',
    promoBody: String(post?.body || '').trim(),
  };
}

export function TiendaCatalogGrid({ onProductPress, onAddToCart, products: productsProp }) {
  const { colors: c } = useTheme();
  const { width: winW } = useWindowDimensions();
  const outerPad = spacing.lg * 2;
  const innerW = winW - outerPad;
  const cardW = (innerW - GAP) / 2;

  const [liveProducts, setLiveProducts] = useState([]);
  const [promoProducts, setPromoProducts] = useState([]);
  const [loading, setLoading] = useState(!productsProp);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('nombre_asc');
  const [filterKind, setFilterKind] = useState('todos');
  const [panelOpen, setPanelOpen] = useState(false);

  const loadRemote = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, promoRes] = await Promise.all([
        db.inventario.getVisiblesEnTienda(),
        db.marketingPosts.getPublishedHomeCarousel(24),
      ]);
      const rows = !invRes.error && Array.isArray(invRes.data) ? invRes.data : [];
      const productRows = rows.filter((r) => getArticuloTipo(r) !== 'servicio');
      const mapped = productRows.map(mapInventarioToTiendaProduct).filter(Boolean);
      const withKind = mapped.map((p) => ({ ...p, catalogKind: 'producto' }));
      setLiveProducts(withKind);
      const posts = !promoRes.error && Array.isArray(promoRes.data) ? promoRes.data : [];
      setPromoProducts(posts.map(mapPostToPromoProduct).filter((x) => x.imageUri));
    } finally {
      setLoading(false);
    }
  }, []);

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

  const baseCatalog = productsProp?.length ? productsProp : liveProducts;

  const merged = useMemo(() => {
    if (productsProp?.length) return baseCatalog;
    const promos = filterKind === 'productos' ? [] : promoProducts;
    return [...baseCatalog, ...promos];
  }, [baseCatalog, promoProducts, productsProp, filterKind]);

  const filteredSorted = useMemo(() => {
    let list = [...merged];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const t = String(p.title || '').toLowerCase();
        const b = String(p.brandLine || '').toLowerCase();
        return t.includes(q) || b.includes(q);
      });
    }
    if (filterKind === 'productos') list = list.filter((p) => p.catalogKind !== 'promo');
    if (filterKind === 'promos') list = list.filter((p) => p.catalogKind === 'promo');

    const priceNum = (p) => Number(p.priceAmount ?? 0) || 0;
    const name = (p) => String(p.title || '').toLowerCase();
    if (sortKey === 'nombre_desc') list.sort((a, b) => name(b).localeCompare(name(a), 'es'));
    else if (sortKey === 'nombre_asc') list.sort((a, b) => name(a).localeCompare(name(b), 'es'));
    else if (sortKey === 'precio_desc') list.sort((a, b) => priceNum(b) - priceNum(a));
    else if (sortKey === 'precio_asc') list.sort((a, b) => priceNum(a) - priceNum(b));
    return list;
  }, [merged, search, sortKey, filterKind]);

  const slots = useMemo(() => {
    if (filteredSorted.length) {
      return filteredSorted.map((product, i) => ({
        id: `live-${product.id}`,
        index: i + 1,
        product,
      }));
    }
    return TIENDA_PRODUCT_SLOTS;
  }, [filteredSorted]);

  const sortLabel =
    sortKey === 'nombre_desc'
      ? 'Nombre Z → A'
      : sortKey === 'precio_asc'
        ? 'Precio menor'
        : sortKey === 'precio_desc'
          ? 'Precio mayor'
          : 'Nombre A → Z';
  const filterLabel =
    filterKind === 'productos'
      ? 'Solo productos'
      : filterKind === 'promos'
        ? 'Solo promociones'
        : 'Todo';

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
          marginBottom: spacing.md,
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
        placeholder="Buscar en tienda…"
        placeholderTextColor={c.foregroundSubtle}
        returnKeyType="search"
        accessibilityLabel="Buscar en tienda"
      />

      <View style={styles.toolbar}>
        <Text style={styles.resultMeta} numberOfLines={2}>
          {loading ? 'Cargando…' : `${slots.filter((s) => s.product).length} resultados · ${filterLabel} · ${sortLabel}`}
        </Text>
        <TouchableOpacity hitSlop={12} accessibilityRole="button" onPress={() => setPanelOpen(true)}>
          <Text style={styles.sortLink}>Ordenar · filtros</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={panelOpen} transparent animationType="slide" onRequestClose={() => setPanelOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPanelOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Ordenar y filtrar</Text>
            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSection}>Ordenar por</Text>
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
              <Text style={styles.modalSection}>Mostrar</Text>
              {[
                { id: 'todos', label: 'Todo (productos y promos)' },
                { id: 'productos', label: 'Solo productos' },
                { id: 'promos', label: 'Solo promociones' },
              ].map((o) => (
                <TouchableOpacity
                  key={o.id}
                  style={chip(filterKind === o.id)}
                  onPress={() => setFilterKind(o.id)}
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

      <View style={styles.grid}>
        {slots.map((slot) => (
          <ProductCardPlaceholder
            key={slot.id}
            slotIndex={slot.index}
            width={cardW}
            product={slot.product}
            onPress={
              slot.product && onProductPress ? () => onProductPress(slot.product) : undefined
            }
            onAddPress={
              slot.product && onAddToCart && !slot.product.precioVariable
                ? () => onAddToCart(slot.product)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}
