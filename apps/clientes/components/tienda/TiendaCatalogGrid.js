import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { db, mapInventarioToTiendaProduct } from '@appsalon/shared-config';
import { TIENDA_PRODUCT_SLOTS } from '../../data/tiendaPlaceholders';
import { ProductCardPlaceholder } from './ProductCardPlaceholder';

const GAP = 10;

/**
 * Catálogo en rejilla. Si hay productos en inventario con `visible_en_tienda`, los muestra; si no, placeholders.
 */
export function TiendaCatalogGrid({ onProductPress, products: productsProp }) {
  const { colors: c } = useTheme();
  const { width: winW } = useWindowDimensions();
  const outerPad = spacing.lg * 2;
  const innerW = winW - outerPad;
  const cardW = (innerW - GAP) / 2;
  const [liveProducts, setLiveProducts] = useState([]);
  const [loading, setLoading] = useState(!productsProp);

  useEffect(() => {
    if (productsProp) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await db.inventario.getVisiblesEnTienda();
      if (cancelled) return;
      if (!error && Array.isArray(data) && data.length) {
        setLiveProducts(data.map(mapInventarioToTiendaProduct).filter(Boolean));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [productsProp]);

  const catalogProducts = productsProp?.length ? productsProp : liveProducts;

  const slots = useMemo(() => {
    if (catalogProducts.length) {
      return catalogProducts.map((product, i) => ({
        id: `live-${product.id}`,
        index: i + 1,
        product,
      }));
    }
    return TIENDA_PRODUCT_SLOTS;
  }, [catalogProducts]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        page: {
          paddingBottom: spacing.xl,
        },
        searchFake: {
          backgroundColor: c.card,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          paddingVertical: 12,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        },
        searchFakeTxt: {
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foregroundSubtle,
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
        footnote: {
          marginTop: spacing.md,
          fontFamily: typography.fontSans,
          fontSize: 11,
          color: c.foregroundSubtle,
          lineHeight: 16,
        },
      }),
    [c],
  );

  return (
    <View style={styles.page}>
      <View style={styles.searchFake}>
        <Text style={styles.searchFakeTxt}>Buscar en tienda…</Text>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.resultMeta}>
          {loading ? 'Cargando…' : `${slots.filter((s) => s.product).length} productos`}
        </Text>
        <TouchableOpacity hitSlop={12} accessibilityRole="button">
          <Text style={styles.sortLink}>Ordenar · filtros</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.lg }} /> : null}

      <View style={styles.grid}>
        {slots.map((slot) => (
          <ProductCardPlaceholder
            key={slot.id}
            slotIndex={slot.index}
            width={cardW}
            product={slot.product}
            onPress={
              slot.product && onProductPress
                ? () => onProductPress(slot.product)
                : undefined
            }
          />
        ))}
      </View>

      <Text style={styles.footnote}>
        {catalogProducts.length
          ? 'Productos con stock del inventario del salón (visible en tienda).'
          : 'Sin productos en tienda todavía: el salón debe marcar artículos como visibles en inventario.'}
      </Text>
    </View>
  );
}
