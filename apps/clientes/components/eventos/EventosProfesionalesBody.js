import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import { spacing, typography } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { EVENTOS_PROFESIONALES_POSTS } from '../../data/eventosProfesionalesPosts';
import {
  formatServicioDuracion,
  formatServicioPrecio,
} from '../../services/salonServiciosTienda';
import {
  formatCategoriaLabel,
  resolveServicioImageUris,
} from '../../data/servicioCategoryArt';

const IMAGE_ASPECT = 16 / 9;
const STAR_GOLD = '#FFB800';
/** Zona inferior con scrim (misma idea que Servicios / Tendencias). */
const OVERLAY_HEIGHT_RATIO = 0.56;

function RatingStars({ rating }) {
  const full = Math.floor(Math.min(5, Math.max(0, Number(rating) || 0)));
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={11}
          color={s <= full ? STAR_GOLD : 'rgba(255,255,255,0.35)'}
          fill={s <= full ? STAR_GOLD : 'transparent'}
          strokeWidth={0}
        />
      ))}
    </View>
  );
}

function EventoPostRow({ post, cardWidth, cardHeight, styles }) {
  const imageUris = resolveServicioImageUris(post);
  const catLabel = formatCategoriaLabel(post.categoria);
  const rating = Number(post.rating) || 0;
  const reviewCount = Math.max(0, Math.floor(Number(post.reviewCount) || 0));
  const desc = String(post.descripcion || '').trim();
  const hint = String(post.stockHint || '').trim();
  const badge = String(post.badge || '').trim();
  const compareAt = String(post.compareAtLabel || '').trim();
  const scrimH = Math.round(cardHeight * OVERLAY_HEIGHT_RATIO);

  return (
    <View style={[styles.stackRow, { width: cardWidth }]}>
      <View style={[styles.mediaBox, { width: cardWidth, height: cardHeight }]}>
        {imageUris.length > 1 ? (
          <FlatList
            data={imageUris}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, i) => `${i}-${uri}`}
            style={styles.mediaList}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={{ width: cardWidth, height: cardHeight }}
                resizeMode="cover"
              />
            )}
            getItemLayout={(_, index) => ({
              length: cardWidth,
              offset: cardWidth * index,
              index,
            })}
          />
        ) : (
          <Image
            source={{ uri: imageUris[0] }}
            style={{ width: cardWidth, height: cardHeight }}
            resizeMode="cover"
          />
        )}

        {badge ? (
          <View style={styles.stackBadge} pointerEvents="none">
            <Text style={styles.stackBadgeTxt} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ) : null}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.9)']}
          locations={[0.08, 0.45, 1]}
          style={[styles.scrim, { height: scrimH }]}
          pointerEvents="none"
        />

        <View style={[styles.stackOverlay, { minHeight: scrimH }]} pointerEvents="none">
          <Text style={styles.stackCat}>{catLabel}</Text>
          <Text style={styles.stackTitle} numberOfLines={2}>
            {post.nombre}
          </Text>
          <View style={styles.stackRatingRow}>
            <RatingStars rating={rating} />
            <Text style={styles.stackRatingTxt}>
              {rating.toFixed(1)} ({reviewCount})
            </Text>
          </View>
          <View style={styles.stackPriceRow}>
            {compareAt && !post.precioVariable ? (
              <Text style={styles.stackPriceWas} numberOfLines={1}>
                {compareAt}
              </Text>
            ) : null}
            <Text style={styles.stackPriceNow} numberOfLines={1}>
              {formatServicioPrecio(post)}
            </Text>
            <Text style={styles.stackMetaDot}> · </Text>
            <Text style={styles.stackMeta} numberOfLines={1}>
              {formatServicioDuracion(post)}
            </Text>
          </View>
          {hint ? (
            <Text style={styles.stackHint} numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
          {desc ? (
            <Text style={styles.stackDesc} numberOfLines={2}>
              {desc}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    stackList: { marginTop: spacing.xs, gap: 0 },
    stackRow: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: c.surfaceMuted,
    },
    mediaBox: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#1a1a1a',
    },
    mediaList: {
      flexGrow: 0,
    },
    stackBadge: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.md,
      zIndex: 4,
      backgroundColor: 'rgba(20,20,20,0.85)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      maxWidth: '70%',
    },
    stackBadgeTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      color: '#FFF',
      letterSpacing: 0.3,
    },
    scrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2,
    },
    stackOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 3,
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      paddingTop: spacing.sm,
    },
    stackCat: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 4,
    },
    stackTitle: {
      fontFamily: typography.fontDisplay,
      fontSize: 22,
      lineHeight: 26,
      color: '#FFFFFF',
    },
    stackRatingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    stackRatingTxt: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: 'rgba(255,255,255,0.82)',
    },
    stackPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 4,
    },
    stackPriceWas: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: 'rgba(255,255,255,0.55)',
      textDecorationLine: 'line-through',
      marginRight: 6,
    },
    stackPriceNow: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: '#FFFFFF',
    },
    stackMetaDot: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
    },
    stackMeta: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: 'rgba(255,255,255,0.88)',
      flexShrink: 1,
    },
    stackHint: {
      marginTop: 4,
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: 'rgba(255,255,255,0.75)',
    },
    stackDesc: {
      marginTop: 4,
      fontFamily: typography.fontSans,
      fontSize: 12,
      lineHeight: 17,
      color: 'rgba(255,255,255,0.88)',
    },
  });
}

export function EventosProfesionalesBody() {
  const { colors: c } = useTheme();
  const { width: winW } = useWindowDimensions();
  const bleed = spacing.lg;
  const cardWidth = winW;
  const cardHeight = Math.round(cardWidth / IMAGE_ASPECT);
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <View style={[styles.stackList, { marginHorizontal: -bleed, width: cardWidth }]}>
      {EVENTOS_PROFESIONALES_POSTS.map((post) => (
        <EventoPostRow
          key={post.id}
          post={post}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          styles={styles}
        />
      ))}
    </View>
  );
}
