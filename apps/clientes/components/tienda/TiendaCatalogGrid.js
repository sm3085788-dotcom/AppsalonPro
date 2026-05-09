import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { colors, spacing, typography, radii } from '@appsalon/design-tokens';
import { TIENDA_PRODUCT_SLOTS } from '../../data/tiendaPlaceholders';
import { ProductCardPlaceholder } from './ProductCardPlaceholder';

const GAP = 10;

/**
 * Catálogo tipo rejilla (referencia estilo Amazon): búsqueda fake, ordenar, tarjetas en 2 columnas.
 * Solo maquetación en cliente; App Salón puede reutilizar la misma interfaz.
 *
 * @param {(product: object) => void} [onProductPress] — Solo para huecos con `product` definido.
 */
export function TiendaCatalogGrid({ onProductPress }) {
  const { width: winW } = useWindowDimensions();
  const outerPad = spacing.lg * 2;
  const innerW = winW - outerPad;
  const cardW = (innerW - GAP) / 2;

  return (
    <View style={styles.page}>
      <View style={styles.searchFake}>
        <Text style={styles.searchFakeTxt}>Buscar en tienda…</Text>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.resultMeta}>Resultados del salón</Text>
        <TouchableOpacity hitSlop={12} accessibilityRole="button">
          <Text style={styles.sortLink}>Ordenar · filtros</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {TIENDA_PRODUCT_SLOTS.map((slot) => (
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
        Huecos listos para nombre, foto, precio (GTQ), stock y envío. Misma interfaz podrá usarse en
        App Salón para gestionar el catálogo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: spacing.xl,
  },
  searchFake: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchFakeTxt: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    color: colors.foregroundSubtle,
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
    color: colors.foregroundMuted,
  },
  sortLink: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: colors.primary,
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
    color: colors.foregroundSubtle,
    lineHeight: 16,
  },
});
