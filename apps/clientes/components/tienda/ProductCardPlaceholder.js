import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useMemo } from 'react';
import { Image as ImageIcon, Plus, Star, Truck } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { ProductImageStrip } from './ProductImageStrip';

const STAR_GOLD = '#FFB800';

function RatingStars({ rating }) {
  const { isDark } = useTheme();
  const starEmpty = isDark ? '#525252' : '#E3E3E3';
  const full = Math.floor(Math.min(5, Math.max(0, rating)));
  const styles = useMemo(
    () =>
      StyleSheet.create({
        stars: {
          flexDirection: 'row',
          gap: 2,
        },
      }),
    [],
  );

  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          color={s <= full ? STAR_GOLD : starEmpty}
          fill={s <= full ? STAR_GOLD : starEmpty}
          strokeWidth={0}
        />
      ))}
    </View>
  );
}

export function ProductCardPlaceholder({ width, slotIndex, product, onPress, onAddPress }) {
  const { colors: c, isDark } = useTheme();
  const hasProduct = product != null;
  const skelColor = isDark ? '#3A3A3A' : '#EDEDED';
  const imageZoneBg = isDark ? c.iconCircleBg : '#F4F4F4';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: c.card,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          marginBottom: 10,
          overflow: 'hidden',
          ...Platform.select({
            ios: {
              shadowColor: 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
            },
            android: { elevation: 0 },
            default: {},
          }),
        },
        imageZone: {
          aspectRatio: 1,
          width: '100%',
          backgroundColor: imageZoneBg,
          borderBottomWidth: 1,
          borderBottomColor: c.cardBorder,
          overflow: 'hidden',
        },
        imageHint: {
          marginTop: 6,
          fontFamily: typography.fontSans,
          fontSize: 11,
          color: c.foregroundSubtle,
        },
        body: {
          padding: spacing.sm,
        },
        brandLine: {
          fontFamily: typography.fontSans,
          fontSize: 10,
          color: c.foregroundMuted,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
        },
        productTitle: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          lineHeight: 17,
          color: c.foreground,
          marginBottom: spacing.sm,
          minHeight: 34,
        },
        titleSkeleton: {
          marginBottom: spacing.sm,
        },
        skLine: {
          height: 10,
          borderRadius: 4,
          backgroundColor: skelColor,
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
          color: c.foregroundMuted,
          textDecorationLine: 'line-through',
        },
        priceLive: {
          fontFamily: typography.fontSansMedium,
          fontSize: 16,
          color: c.foreground,
        },
        priceSlot: {
          fontFamily: typography.fontSansMedium,
          fontSize: 16,
          color: c.foreground,
          marginBottom: 6,
        },
        ratingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
          flexWrap: 'wrap',
        },
        starsRow: {
          flexDirection: 'row',
          gap: 2,
        },
        ratingNum: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
          color: c.foreground,
        },
        ratingTxt: {
          fontFamily: typography.fontSans,
          fontSize: 11,
          color: c.foregroundMuted,
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
          color: c.foregroundMuted,
          lineHeight: 14,
        },
        stockHint: {
          marginTop: 6,
          fontFamily: typography.fontSans,
          fontSize: 10,
          color: c.primary,
        },
        addBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginHorizontal: spacing.sm,
          marginBottom: spacing.sm,
          paddingVertical: 10,
          borderRadius: radii.sm,
          backgroundColor: c.primary,
        },
        addBtnTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: c.primaryForegroundOnGold,
        },
      }),
    [c, imageZoneBg, skelColor],
  );

  const canQuickAdd = hasProduct && onAddPress && !product.precioVariable;

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

  const emptyStar = isDark ? '#525252' : '#E3E3E3';

  const flatCard = Platform.select({
    ios: { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
    android: { elevation: 0 },
    default: {},
  });

  return (
    <View style={[styles.card, flatCard, { width }]}>
      <View style={styles.imageZone}>
        {hasProduct && galleryUris.length > 0 ? (
          <ProductImageStrip
            uris={galleryUris}
            badgeText={product.badge}
            badgePromo={!!product.promocionVigente}
            style={{ flex: 1 }}
          />
        ) : hasProduct ? null : (
          <>
            <ImageIcon size={36} color={c.foregroundSubtle} strokeWidth={1.4} />
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
              <Text
                style={[
                  styles.priceLive,
                  product.precioVariable && { fontSize: 13, fontFamily: typography.fontSansMedium },
                ]}
              >
                {product.priceLabel}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <RatingStars rating={product.rating} />
              <Text style={styles.ratingNum}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.ratingTxt}>({product.reviewCount})</Text>
            </View>

            <View style={styles.shipRow}>
              <Truck size={12} color={c.foregroundMuted} strokeWidth={2} />
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
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    color={emptyStar}
                    fill={emptyStar}
                    strokeWidth={0}
                  />
                ))}
              </View>
              <Text style={styles.ratingTxt}>—</Text>
            </View>

            <View style={styles.shipRow}>
              <Truck size={12} color={c.foregroundMuted} strokeWidth={2} />
              <Text style={styles.shipTxt}>Envío / retiro · datos después</Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {canQuickAdd ? (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onAddPress(product)}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Agregar ${product.title} al carrito`}
        >
          <Plus size={16} color={c.primaryForegroundOnGold} strokeWidth={2.2} />
          <Text style={styles.addBtnTxt}>Agregar</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
