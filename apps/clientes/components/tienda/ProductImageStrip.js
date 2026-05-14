import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Image,
  FlatList,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { typography } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Galería horizontal manual (sin auto-carrusel). Imágenes en cover dentro de cuadrado 1:1.
 */
export function ProductImageStrip({ uris, badgeText, style }) {
  const { colors: c, isDark } = useTheme();
  const [stripW, setStripW] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const stripStyles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: '100%',
          aspectRatio: 1,
          backgroundColor: isDark ? c.iconCircleBg : '#F4F4F4',
          overflow: 'hidden',
        },
        slide: {
          width: '100%',
          aspectRatio: 1,
          overflow: 'hidden',
        },
        imageFill: {
          ...StyleSheet.absoluteFillObject,
        },
        dotsRow: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 8,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 5,
          zIndex: 3,
        },
        dot: {
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: 'rgba(255,255,255,0.45)',
        },
        dotActive: {
          backgroundColor: c.primary,
          width: 6,
          height: 6,
          borderRadius: 3,
        },
      }),
    [c, isDark],
  );

  const urisKey = useMemo(
    () => (Array.isArray(uris) ? uris.filter(Boolean).join('|') : ''),
    [uris],
  );
  const data = useMemo(() => {
    if (!Array.isArray(uris)) return [];
    return uris.filter(Boolean);
  }, [urisKey, uris]);

  const dataLen = data.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [urisKey]);

  useEffect(() => {
    const list = Array.isArray(uris) ? uris.filter(Boolean) : [];
    list.forEach((uri) => {
      if (typeof uri === 'string' && uri.length > 0) {
        Image.prefetch(uri).catch(() => {});
      }
    });
  }, [urisKey, uris]);

  const onScroll = useCallback(
    (e) => {
      if (stripW <= 0 || dataLen <= 1) return;
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.min(dataLen - 1, Math.max(0, Math.round(x / stripW)));
      setActiveIndex((prev) => (prev !== idx ? idx : prev));
    },
    [stripW, dataLen],
  );

  const onLayout = useCallback((e) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setStripW((prev) => (prev === w ? prev : w));
  }, []);

  const getItemLayout = useCallback(
    (_, index) => ({
      length: stripW,
      offset: stripW * index,
      index,
    }),
    [stripW],
  );

  const snapOffsets = useMemo(
    () =>
      stripW > 0 && dataLen > 0
        ? Array.from({ length: dataLen }, (_, i) => i * stripW)
        : [],
    [stripW, dataLen],
  );

  if (!data.length) {
    return null;
  }

  const showPager = data.length > 1;

  const renderImage = (uri) => (
    <View style={stripStyles.slide}>
      <Image
        source={{ uri }}
        style={stripStyles.imageFill}
        resizeMode="cover"
        accessibilityLabel="Imagen del producto"
      />
    </View>
  );

  return (
    <View style={[stripStyles.wrap, style]} onLayout={onLayout}>
      {!showPager ? renderImage(data[0]) : null}

      {showPager && stripW > 0 ? (
        <>
          <FlatList
            data={data}
            horizontal
            bounces={false}
            keyExtractor={(item, index) => `${index}-${item}`}
            renderItem={({ item }) => (
              <View style={{ width: stripW, aspectRatio: 1, overflow: 'hidden' }}>
                <Image source={{ uri: item }} style={stripStyles.imageFill} resizeMode="cover" />
              </View>
            )}
            getItemLayout={getItemLayout}
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            removeClippedSubviews={false}
            decelerationRate="fast"
            keyboardShouldPersistTaps="handled"
            initialNumToRender={data.length}
            maxToRenderPerBatch={data.length}
            windowSize={Math.min(7, data.length + 2)}
            scrollEventThrottle={1}
            onScroll={onScroll}
            snapToOffsets={snapOffsets}
            snapToAlignment="start"
            disableIntervalMomentum
            overScrollMode="never"
            accessibilityLabel={`Galería, ${data.length} fotos. Desliza horizontalmente.`}
          />
          <View style={stripStyles.dotsRow} pointerEvents="none">
            {data.map((_, i) => (
              <View
                key={i}
                style={[stripStyles.dot, i === activeIndex && stripStyles.dotActive]}
              />
            ))}
          </View>
        </>
      ) : null}

      {badgeText ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeTxt} numberOfLines={1}>
            {badgeText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: Platform.select({ ios: 10, default: 8 }),
    left: 8,
    zIndex: 4,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '88%',
  },
  badgeTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    color: '#FFF',
    letterSpacing: 0.3,
  },
});
