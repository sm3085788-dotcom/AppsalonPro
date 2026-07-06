import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { SalonButton } from '../components/luxury/SalonButton';
import { AppTourSlidePreview } from './AppTourSlidePreview';

const SLIDES = [
  {
    id: 'inicio',
    title: 'Inicio',
    body: 'Mensajes, tienda, tendencias, premios, pedidos y servicios. El acceso rápido a todo desde una sola pantalla.',
  },
  {
    id: 'tienda',
    title: 'Tienda, pedidos y reseñas',
    body: 'Comprá con stock de tu sucursal, seguí tus pedidos y leé opiniones con nombre de cliente para mayor confianza.',
  },
  {
    id: 'pagos',
    title: 'Pagos con tarjeta',
    body: 'Pagá en la tienda con tarjeta de crédito o débito. El cobro es seguro con QPayPro; también podés guardar tarjetas en Perfil → Métodos de pago (próximamente). Efectivo al retirar sigue disponible.',
  },
  {
    id: 'citas',
    title: 'Servicios y citas',
    body: 'Elegí sucursal, servicios y horario. Tus solicitudes llegan al local que elijas; revisá citas activas e historial.',
  },
  {
    id: 'eventos',
    title: 'Eventos profesionales',
    body: 'Bodas, fiestas y sesiones especiales. Mirá paquetes del salón y enviá tu solicitud de participación.',
  },
  {
    id: 'contacto',
    title: 'Servicio al cliente',
    body: 'WhatsApp, llamada, ubicación GPS e Instagram y Facebook con logos oficiales. Perfil → Servicio al cliente.',
  },
  {
    id: 'perfil',
    title: 'Perfil y configuración',
    body: 'Completá tus datos, membresías y tarjetas guardadas. En Configuración elegí español o inglés y modo claro u oscuro.',
  },
];

/**
 * Recorrido breve tras el login (sin video).
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
          paddingTop: insets.top + spacing.sm,
        },
        slide: {
          width,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
        },
        slideScroll: {
          flexGrow: 1,
          alignItems: 'center',
          paddingBottom: spacing.sm,
        },
        previewWrap: {
          width: '100%',
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        slideTitle: {
          fontFamily: typography.fontDisplay,
          fontSize: 22,
          color: c.foreground,
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        slideBody: {
          fontFamily: typography.fontSans,
          fontSize: 14,
          color: c.foregroundMuted,
          textAlign: 'center',
          lineHeight: 20,
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
        tourList: {
          flex: 1,
          backgroundColor: c.background,
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

  const onMomentumEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i >= 0 && i < SLIDES.length) setIndex(i);
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        style={styles.tourList}
        horizontal
        pagingEnabled
        scrollEnabled={false}
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
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <ScrollView
              contentContainerStyle={styles.slideScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.previewWrap}>
                <AppTourSlidePreview slideId={item.id} />
              </View>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideBody}>{item.body}</Text>
            </ScrollView>
          </View>
        )}
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
