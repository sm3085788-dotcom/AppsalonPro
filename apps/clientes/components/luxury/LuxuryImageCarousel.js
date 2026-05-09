import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  Text,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SalonButton } from './SalonButton';
import { colors, spacing, typography, radii } from '@appsalon/design-tokens';

const AUTO_MS = 4500;

/**
 * Carrusel automático con gradiente y CTA — base compartida por Hero (Inicio) y servicios destacados.
 *
 * @param {Array<{ id: string, uri: string, caption?: string }>} slides
 * @param {string} [priceLabel] — opcional, esquina superior derecha sobre la imagen
 * @param {'heroGold'|'solidGold'|'outlineGray'|'outlineGold'|'mutedFill'} [buttonVariant]
 * @param {boolean} [fullWidthButton]
 */
export function LuxuryImageCarousel({
  slides,
  overlayKicker,
  headline,
  body,
  buttonTitle,
  onButtonPress,
  height = 280,
  priceLabel,
  buttonVariant = 'heroGold',
  containerStyle,
  fullWidthButton = false,
}) {
  const { width: winW } = useWindowDimensions();
  const sidePad = spacing.lg * 2;
  const slideW = Math.max(280, winW - sidePad);

  const listRef = useRef(null);
  const [active, setActive] = useState(0);

  const onMomentumScrollEnd = useCallback(
    (e) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / slideW);
      if (i >= 0 && i < slides.length) setActive(i);
    },
    [slideW, slides.length],
  );

  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick = (tick + 1) % slides.length;
      listRef.current?.scrollToIndex({
        index: tick,
        animated: true,
      });
      setActive(tick);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const getItemLayout = useCallback(
    (_, index) => ({
      length: slideW,
      offset: slideW * index,
      index,
    }),
    [slideW],
  );

  const onScrollToIndexFailed = useCallback((info) => {
    const wait = new Promise((r) => setTimeout(r, 400));
    wait.then(() => {
      listRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
      });
    });
  }, []);

  return (
    <View style={[styles.shell, { width: slideW }, containerStyle]}>
      <View style={[styles.carouselBox, { height }]}>
        <FlatList
          ref={listRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollToIndexFailed={onScrollToIndexFailed}
          renderItem={({ item }) => (
            <View style={{ width: slideW, height }}>
              <Image
                source={{ uri: item.uri }}
                style={[styles.img, { width: slideW, height }]}
                resizeMode="cover"
                accessibilityLabel={item.caption ?? headline}
              />
            </View>
          )}
        />

        <LinearGradient
          colors={['transparent', 'rgba(15,15,15,0.55)', 'rgba(15,15,15,0.92)']}
          locations={[0, 0.45, 1]}
          style={styles.gradient}
          pointerEvents="none"
        />

        {priceLabel ? (
          <View style={styles.priceCorner} pointerEvents="none">
            <Text style={styles.priceCornerTxt}>{priceLabel}</Text>
          </View>
        ) : null}

        <View style={styles.overlayContent} pointerEvents="box-none">
          <Text style={styles.kicker}>{overlayKicker}</Text>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.body}>{body}</Text>
          <SalonButton
            title={buttonTitle}
            variant={buttonVariant}
            onPress={onButtonPress}
            fullWidth={fullWidthButton}
          />
        </View>

        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === active && styles.dotActive]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  carouselBox: {
    position: 'relative',
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  img: {
    borderRadius: radii.xl,
    backgroundColor: '#222',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.xl,
  },
  priceCorner: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 2,
    maxWidth: '42%',
  },
  priceCornerTxt: {
    fontFamily: typography.fontDisplayRegular,
    fontSize: 22,
    color: '#FAFAFA',
    textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  overlayContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    zIndex: 1,
  },
  kicker: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  headline: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    color: '#FAFAFA',
    lineHeight: 31,
    marginBottom: spacing.xs,
  },
  body: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: 'rgba(245,245,245,0.9)',
    lineHeight: 20,
    marginBottom: spacing.md,
    maxWidth: '98%',
  },
  dots: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    zIndex: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
});
