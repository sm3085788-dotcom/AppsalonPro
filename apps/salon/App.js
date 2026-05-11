import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { Moon, Sun } from 'lucide-react-native';

import { ScreenHeader } from './components/luxury';
import { AdminModuleTile } from './components/AdminModuleTile';
import { spacing, typography } from '@appsalon/design-tokens';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import {
  SALON_MODULES,
  getModuleById,
  filterModulesBySearch,
} from './navigation/salonRoutes';
import { SalonModulePlaceholder } from './screens/SalonModulePlaceholder';
import { AppointmentsScreen } from './screens/AppointmentsScreen';

const MAX_CONTENT_WIDTH = 1120;
const ROW_ACCENTS = [
  { border: '#2E7D32', bg: '#EAF6EC', icon: '#2E7D32' }, // verde
  { border: '#C5A12C', bg: '#FCF6E2', icon: '#A88512' }, // amarillo
  { border: '#2E6FD8', bg: '#E8F0FF', icon: '#2E6FD8' }, // azul
  { border: '#7A1F3D', bg: '#F7EAF0', icon: '#7A1F3D' }, // corinto
  { border: '#6A2BA0', bg: '#EFE7FA', icon: '#6A2BA0' }, // morado
];
const BROWN_ACCENT = { border: '#7B4B2A', bg: '#F5EADF', icon: '#7B4B2A' };
const BROWN_MODULE_IDS = new Set(['incidentes', 'inventory', 'basurero']);

/** Modulos con badge de notificaciones (contador rojo). Sustituir por API cuando exista. */
const BADGE_MODULE_IDS = ['agenda', 'cajas', 'clients', 'mensajes', 'inventory'];
const INITIAL_BADGE_COUNTS = {
  agenda: 3,
  cajas: 2,
  clients: 2,
  mensajes: 5,
  inventory: 1,
};

function SalonAdminShell() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [openedModuleId, setOpenedModuleId] = useState(null);
  const [search, setSearch] = useState('');
  const [badgeCounts, setBadgeCounts] = useState(INITIAL_BADGE_COUNTS);
  const { colors: c, isDark, setScheme } = useTheme();

  const cols = 3;
  const horizontalPad = spacing.lg;
  const gap = spacing.sm;
  const effectiveW = Math.min(winW, MAX_CONTENT_WIDTH);
  const innerWidth = effectiveW - horizontalPad * 2;
  const tileWidth = (innerWidth - gap * (cols - 1)) / cols;

  const modules = useMemo(
    () => filterModulesBySearch(SALON_MODULES, search),
    [search],
  );

  const styles = useMemo(() => buildStyles(c), [c]);

  const openedModule = openedModuleId ? getModuleById(openedModuleId) : null;

  const openModule = useCallback((id) => setOpenedModuleId(id), []);
  const closeModule = useCallback(() => setOpenedModuleId(null), []);
  const toggleTheme = useCallback(() => {
    setScheme(isDark ? 'light' : 'dark');
  }, [isDark, setScheme]);

  /** Demo: sube el contador cada 30s en uno de los modulos con badge (quitar o sustituir por datos reales). */
  useEffect(() => {
    const t = setInterval(() => {
      setBadgeCounts((prev) => {
        const pick =
          BADGE_MODULE_IDS[Math.floor(Math.random() * BADGE_MODULE_IDS.length)];
        const cur = prev[pick] ?? 0;
        return { ...prev, [pick]: Math.min(cur + 1, 99) };
      });
    }, 30000);
    return () => clearInterval(t);
  }, []);

  if (openedModuleId === 'agenda') {
    return <AppointmentsScreen onBack={closeModule} />;
  }

  if (openedModule) {
    return (
      <SalonModulePlaceholder module={openedModule} onBack={closeModule} />
    );
  }

  const scrollBottom = Math.max(insets.bottom, spacing.md) + spacing.lg;

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: scrollBottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          <View style={[styles.headerTop, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.titleBlock}>
              <Text style={styles.brand}>App Andrea Control</Text>
              <Text style={styles.brandLead}>Administracion</Text>
            </View>
            <TouchableOpacity
              style={styles.themeToggle}
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {isDark ? (
                <Sun size={22} color={c.primary} strokeWidth={2} />
              ) : (
                <Moon size={22} color={c.foreground} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          <ScreenHeader
            showHomeBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Buscar en el panel..."
            wrapStyle={styles.searchWrap}
          />

          <Text style={styles.sectionLabel}>Modulos</Text>

          <View style={styles.grid}>
            {modules.map((m, i) => {
              const row = Math.floor(i / cols);
              const accent = BROWN_MODULE_IDS.has(m.id)
                ? BROWN_ACCENT
                : ROW_ACCENTS[row % ROW_ACCENTS.length];
              return (
                <AdminModuleTile
                  key={m.id}
                  title={m.title}
                  subtitle={m.subtitle}
                  icon={m.Icon}
                  width={tileWidth}
                  accent={accent}
                  badgeCount={BADGE_MODULE_IDS.includes(m.id) ? badgeCounts[m.id] ?? 0 : 0}
                  onPress={() => openModule(m.id)}
                />
              );
            })}
          </View>

          {modules.length === 0 ? (
            <Text style={styles.noResults}>No hay resultados para tu busqueda.</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function buildStyles(c) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    contentWrap: {
      maxWidth: MAX_CONTENT_WIDTH,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: spacing.lg,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    titleBlock: {
      flex: 1,
      paddingRight: spacing.md,
    },
    brand: {
      fontFamily: typography.fontDisplay,
      fontSize: 28,
      color: c.foreground,
      letterSpacing: -0.5,
    },
    brandLead: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: c.primary,
      marginTop: 6,
    },
    themeToggle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    searchWrap: {
      marginBottom: spacing.md,
    },
    sectionLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      letterSpacing: 2,
      color: c.foregroundSubtle,
      marginBottom: spacing.md,
      textTransform: 'uppercase',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      columnGap: spacing.sm,
      rowGap: spacing.sm,
    },
    noResults: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
  });
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#121212',
        }}
      >
        <ActivityIndicator color="#C9A961" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SalonAdminShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
