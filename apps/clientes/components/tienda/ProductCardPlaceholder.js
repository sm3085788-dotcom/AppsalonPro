import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Image as ImageIcon, Star, Truck } from 'lucide-react-native';
import { colors, spacing, typography, radii } from '@appsalon/design-tokens';
import { ProductImageStrip } from './ProductImageStrip';

const STAR_GOLD = '#FFB800';
const STAR_EMPTY = '#E3E3E3';

function RatingStars({ rating }) {
  const full = Math.floor(Math.min(5, Math.max(0, rating)));
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          color={s <= full ? STAR_GOLD : STAR_EMPTY}
          fill={s <= full ? STAR_GOLD : STAR_EMPTY}
          strokeWidth={0}
        />
      ))}
    </View>
  );
}

export function ProductCardPlaceholder({ width, slotIndex, product, onPress }) {
  const hasProduct = product != null;

  const galleryUris = hasProduct
    ? product.imageUris?.length
      ? product.imageUris
      : product.imageUri
        ? [product.imageUri]
        : []
    : [];

  const a11yLabel = hasProduct
    ? `${product.title}, ${product.priceLabel}. ${product.rating} estrellas, ${product.reviewCount} opiniones. ${product.shippingLabel}`
    : `Producto ${slotIndex}, pendiente de datos`;

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.imageZone}>
        {hasProduct && galleryUris.length > 0 ? (
          <ProductImageStrip uris={galleryUris} badgeText={product.badge} />
        ) : hasProduct ? null : (
          <>
            <ImageIcon size={36} color={colors.foregroundSubtle} strokeWidth={1.4} />
            <Text style={styles.imageHint}>Imagen</Text>
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.body}
        onPress={onPress ?? (() => {})}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
      >
        {hasProduct ? (
          <>
            {product.brandLine ? (
              <Text style={styles.brandLine} numberOfLines={1}>
                {product.brandLine}
              </Text>
            ) : null}
            <Text style={styles.productTitle} numberOfLines={2}>
              {product.title}
            </Text>

            <View style={styles.priceRow}>
              {product.compareAtLabel ? (
                <Text style={styles.compareAt}>{product.compareAtLabel}</Text>
              ) : null}
              <Text style={styles.priceLive}>{product.priceLabel}</Text>
            </View>

            <View style={styles.ratingRow}>
              <RatingStars rating={product.rating} />
              <Text style={styles.ratingNum}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.ratingTxt}>({product.reviewCount})</Text>
            </View>

            <View style={styles.shipRow}>
              <Truck size={12} color={colors.foregroundMuted} strokeWidth={2} />
              <Text style={styles.shipTxt} numberOfLines={2}>
                {product.shippingLabel}
              </Text>
            </View>

            {product.stockHint ? (
              <Text style={styles.stockHint} numberOfLines={1}>
                {product.stockHint}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <View style={styles.titleSkeleton}>
              <View style={[styles.skLine, { width: '92%' }]} />
              <View style={[styles.skLine, { width: '65%', marginTop: 6 }]} />
            </View>

            <Text style={styles.priceSlot}>Q —.——</Text>

            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    color="#E3E3E3"
                    fill="#E3E3E3"
                    strokeWidth={0}
                  />
                ))}
              </View>
              <Text style={styles.ratingTxt}>—</Text>
            </View>

            <View style={styles.shipRow}>
              <Truck size={12} color={colors.foregroundMuted} strokeWidth={2} />
              <Text style={styles.shipTxt}>Envío / retiro · datos después</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  imageZone: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    overflow: 'hidden',
  },
  imageHint: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: colors.foregroundSubtle,
  },
  body: {
    padding: spacing.sm,
  },
  brandLine: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    color: colors.foregroundMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  productTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    lineHeight: 17,
    color: colors.foreground,
    marginBottom: spacing.sm,
    minHeight: 34,
  },
  titleSkeleton: {
    marginBottom: spacing.sm,
  },
  skLine: {
    height: 10,
    borderRadius: 4,
    backgroundColor: '#EDEDED',
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  compareAt: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: colors.foregroundMuted,
    textDecorationLine: 'line-through',
  },
  priceLive: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: colors.foreground,
  },
  priceSlot: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingNum: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    color: colors.foreground,
  },
  ratingTxt: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: colors.foregroundMuted,
  },
  shipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  shipTxt: {
    flex: 1,
    fontFamily: typography.fontSans,
    fontSize: 10,
    color: colors.foregroundMuted,
    lineHeight: 14,
  },
  stockHint: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 10,
    color: colors.primary,
  },
});
