import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SalonButton } from './SalonButton';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

const AUTO_MS = 4500;

/**
 * Carrusel automático con gradiente y CTA — base compartida por Hero (Inicio) y servicios destacados.
 *
 * @param {Array<{ id: string, uri: string, caption?: string }>} slides
 * @param {string} [priceLabel] — opcional, esquina superior derecha sobre la imagen
 * @param {'heroGold'|'solidGold'|'outlineGray'|'outlineGold'|'mutedFill'} [buttonVariant]
 * @param {boolean} [fullWidthButton]
 * @param {boolean} [edgeToEdge] — ancho pantalla (sin márgenes laterales); Inicio hero.
 * @param {boolean} [dockTop] — junto al header: sin margen superior y sin redondeo arriba.
 * @param {boolean} [squareCorners] — sin redondeo en ninguna esquina (bloque rectangular).
 * @param {boolean} [showAdvanceArrow] — flecha derecha centrada para pasar a la siguiente diapositiva (varias publicidades).
 * @param {boolean} [perSlideOverlay] — si es true, kicker/título/texto/precio/botón salen de cada slide (p. ej. publicidad).
 * @param {boolean} [autoAdvance] — rotación automática (por defecto true); false solo cambio manual / swipe.
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
  edgeToEdge = false,
  dockTop = false,
  squareCorners = false,
  showAdvanceArrow = false,
  perSlideOverlay = false,
  autoAdvance = true,
}) {
  const { width: winW } = useWindowDimensions();
  const { colors: c } = useTheme();
  const kickerColor = useMemo(
    () => ({
      color: c.primary,
    }),
    [c.primary],
  );
  const sidePad = spacing.lg * 2;
  const slideW = edgeToEdge ? winW : Math.max(280, winW - sidePad);

  const cardRadii = squareCorners
    ? {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }
    : dockTop
      ? {
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomLeftRadius: radii.xl,
          borderBottomRightRadius: radii.xl,
        }
      : { borderRadius: radii.xl };

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
    if (!autoAdvance || slides.length <= 1) return undefined;
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
  }, [slides.length, autoAdvance]);

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

  const advanceSlide = useCallback(() => {
    setActive((prev) => {
      const next = (prev + 1) % slides.length;
      listRef.current?.scrollToIndex({
        index: next,
        animated: true,
      });
      return next;
    });
  }, [slides.length]);

  const showArrow =
    showAdvanceArrow && slides.length > 1;

  const current = slides[active] ?? {};
  const displayKicker = perSlideOverlay
    ? (current.kicker ?? overlayKicker)
    : overlayKicker;
  const displayHeadline = perSlideOverlay
    ? (current.headline ?? current.title ?? headline)
    : headline;
  const displayBody = perSlideOverlay ? (current.body ?? body) : body;
  const displayPrice = perSlideOverlay
    ? (current.priceLabel ?? priceLabel)
    : priceLabel;
  const displayButtonTitle = perSlideOverlay
    ? (current.buttonTitle ?? buttonTitle)
    : buttonTitle;

  return (
    <View
      style={[
        styles.shell,
        edgeToEdge && styles.shellEdge,
        { marginTop: dockTop ? 0 : spacing.sm },
        cardRadii,
        edgeToEdge ? { width: '100%' } : { width: slideW },
        containerStyle,
      ]}
    >
      <View style={[styles.carouselBox, { height }, cardRadii]}>
        <FlatList
          ref={listRef}
          data={slides}
          horizontal
          pagingEnabled
          snapToInterval={slideW}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollToIndexFailed={onScrollToIndexFailed}
          renderItem={({ item }) => (
            <View style={{ width: slideW, height }}>
              <Image
                source={{ uri: item.uri }}
                style={[
                  styles.img,
                  {
                    width: slideW,
                    height,
                    ...cardRadii,
                  },
                ]}
                resizeMode="cover"
                accessibilityLabel={item.caption ?? item.headline ?? headline}
              />
            </View>
          )}
        />

        <LinearGradient
          colors={['transparent', 'rgba(15,15,15,0.55)', 'rgba(15,15,15,0.92)']}
          locations={[0, 0.45, 1]}
          style={[styles.gradient, cardRadii]}
          pointerEvents="none"
        />

        {displayPrice ? (
          <View style={styles.priceCorner} pointerEvents="none">
            <Text style={styles.priceCornerTxt}>{displayPrice}</Text>
          </View>
        ) : null}

        {showArrow ? (
          <View style={styles.advanceArrowColumn} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.advanceArrowBtn}
              onPress={advanceSlide}
              accessibilityRole="button"
              accessibilityLabel="Siguiente publicidad"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <ChevronRight
                size={18}
                color="rgba(250,250,250,0.95)"
                strokeWidth={2.2}
              />
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={[
            styles.overlayContent,
            showArrow && styles.overlayContentWithArrow,
          ]}
          pointerEvents="box-none"
        >
          <Text style={[styles.kicker, kickerColor]}>{displayKicker}</Text>
          <Text style={styles.headline}>{displayHeadline}</Text>
          <Text style={styles.body}>{displayBody}</Text>
          <SalonButton
            title={displayButtonTitle}
            variant={buttonVariant}
            onPress={onButtonPress}
            fullWidth={fullWidthButton}
          />
        </View>

        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                i === active && { backgroundColor: c.primary, width: 16, borderRadius: 6 },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  shellEdge: {
    alignSelf: 'stretch',
  },
  carouselBox: {
    position: 'relative',
    overflow: 'hidden',
  },
  img: {
    backgroundColor: '#222',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
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
  advanceArrowColumn: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 4,
  },
  advanceArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
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
  overlayContentWithArrow: {
    paddingRight: spacing.xl + 44,
  },
  kicker: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
});
