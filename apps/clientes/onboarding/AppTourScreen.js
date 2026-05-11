import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Store, Flame, User } from 'lucide-react-native';
import { spacing, typography } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury/SalonButton';

const SLIDES = [
  {
    id: 'citas',
    title: 'Agenda y recordatorios',
    body: 'Mirá tus próximas citas, reprogramá o confirmá. Cuando conectemos el salón, todo vendrá en tiempo real.',
    Icon: Calendar,
  },
  {
    id: 'tienda',
    title: 'Tienda del salón',
    body: 'Explorá productos y promos como en una tienda en línea. El checkout de ejemplo es solo navegación.',
    Icon: Store,
  },
  {
    id: 'tendencias',
    title: 'Tendencias y premios',
    body: 'Videos inspiración, puntos Aura y canjes cuando el programa esté activo.',
    Icon: Flame,
  },
  {
    id: 'perfil',
    title: 'Tu perfil',
    body: 'Datos de contacto, membresías, notificaciones y configuración. Ahí también cerrarás sesión.',
    Icon: User,
  },
];

/**
 * Recorrido horizontal por las áreas de la app (sin video).
 */
export function AppTourScreen({ onDone }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.background,
        },
        topBar: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
        },
        skipTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 14,
          color: c.foregroundMuted,
        },
        slide: {
          width,
          paddingHorizontal: spacing.xl,
          justifyContent: 'center',
          alignItems: 'center',
        },
        iconCircle: {
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: c.surfaceMuted,
          borderWidth: 1,
          borderColor: c.cardBorder,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xl,
        },
        slideTitle: {
          fontFamily: typography.fontDisplay,
          fontSize: 24,
          color: c.foreground,
          textAlign: 'center',
          marginBottom: spacing.md,
        },
        slideBody: {
          fontFamily: typography.fontSans,
          fontSize: 15,
          color: c.foregroundMuted,
          textAlign: 'center',
          lineHeight: 22,
          maxWidth: 340,
        },
        dots: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          marginTop: spacing.lg,
          marginBottom: spacing.md,
        },
        dot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: c.cardBorder,
        },
        dotOn: {
          backgroundColor: c.primary,
          width: 22,
        },
        footer: {
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          gap: spacing.sm,
        },
      }),
    [c, insets.bottom, insets.top, width],
  );

  const last = index === SLIDES.length - 1;

  const goNext = () => {
    if (last) {
      onDone();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const skip = () => onDone();

  const onMomentumEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i >= 0 && i < SLIDES.length) setIndex(i);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={skip} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skipTxt}>Saltar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 350);
        }}
        renderItem={({ item }) => {
          const Icon = item.Icon;
          return (
            <View style={styles.slide}>
              <View style={styles.iconCircle}>
                <Icon size={40} color={c.primary} strokeWidth={1.6} />
              </View>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideBody}>{item.body}</Text>
            </View>
          );
        }}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
      />

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.id} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.footer}>
        <SalonButton
          title={last ? 'Empezar a explorar' : 'Siguiente'}
          variant="heroGold"
          fullWidth
          onPress={goNext}
        />
      </View>
    </View>
  );
}
