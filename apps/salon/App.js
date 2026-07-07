import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  useColorScheme,
  Alert,
} from 'react-native';
import { clearPendingBranchAdminSetup } from './services/branchAdminSetup';

const hasSupabaseEnv = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim(),
);
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { Moon, Sun, Store, LogOut } from 'lucide-react-native';

import { ScreenHeader } from './components/luxury';
import { AdminModuleTile } from './components/AdminModuleTile';
import { GlobalSearchResults } from './components/GlobalSearchResults';
import { runSalonGlobalSearch, SALON_SEARCH_MIN_LEN } from './services/salonGlobalSearch';
import { spacing, typography } from '@appsalon/design-tokens';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { OtaLauncher } from '../../shared/components/OtaLauncher';
import { OtaStatusPanel } from '../../shared/components/OtaStatusPanel';
import {
  SALON_MODULES,
  getModuleById,
  filterModulesBySearch,
} from './navigation/salonRoutes';
import {
  filterSalonModulesForProfile,
  canOpenSalonModule,
} from './navigation/salonModuleAccess';
import { VenderScreen } from './screens/VenderScreen';
import { AppointmentsScreen } from './screens/AppointmentsScreen';
import { CajaScreen } from './screens/CajaScreen';
import { ClientesScreen } from './screens/ClientesScreen';
import { EmpleadosScreen } from './screens/EmpleadosScreen';
import { MetasScreen } from './screens/MetasScreen';
import { ReportesScreen } from './screens/ReportesScreen';
import { MarketingScreen } from './screens/MarketingScreen';
import { MensajesScreen } from './screens/MensajesScreen';
import { isSalonInboundClientMessage } from './utils/salonMensajesInbound';
import {
  promptSalonPushPermissions,
  showLocalSalonNotification,
  configureSalonPushHandler,
} from './utils/salonPush';
import { IncidentesScreen } from './screens/IncidentesScreen';
import { InventarioScreen } from './screens/InventarioScreen';
import { EventosProfesionalesScreen } from './screens/EventosProfesionalesScreen';
import { PapeleriaScreen } from './screens/PapeleriaScreen';
import { ProveedoresScreen } from './screens/ProveedoresScreen';
import { PedidosScreen } from './screens/PedidosScreen';
import { TarjetasRegaloScreen } from './screens/TarjetasRegaloScreen';
import { SalonModulePlaceholder } from './screens/SalonModulePlaceholder';
import { ControlPanelScreen } from './screens/ControlPanelScreen';
import { SucursalesScreen } from './screens/SucursalesScreen';
import { SalonAdminSignInScreen } from './screens/SalonAdminSignInScreen';
import {
  db,
  supabase,
  canAccessSalonApp,
  isSalonSucursalAdmin,
  isSalonGlobalAdmin,
  setSalonSessionProfile,
  clearSalonSessionProfile,
  isInvalidRefreshTokenError,
  fetchMarketingEngagementSince,
  enrichSalonSessionProfile,
  getSalonBranchDisplayName,
} from '@appsalon/shared-config';

const MAX_CONTENT_WIDTH = 1120;
/** Ancho máximo de cada tarjeta del grid (evita cuadros gigantes en horizontal / BlueStacks). */
const MAX_MODULE_TILE_WIDTH = 156;
const MIN_MODULE_COLS = 3;
const MAX_MODULE_COLS = 8;

function computeModuleGridLayout(windowWidth) {
  const horizontalPad = spacing.lg;
  const gap = spacing.sm;
  const effectiveW = Math.min(windowWidth, MAX_CONTENT_WIDTH);
  const innerWidth = Math.max(0, effectiveW - horizontalPad * 2);
  let cols = Math.floor((innerWidth + gap) / (MAX_MODULE_TILE_WIDTH + gap));
  cols = Math.max(MIN_MODULE_COLS, Math.min(MAX_MODULE_COLS, cols));
  const tileWidth = (innerWidth - gap * (cols - 1)) / cols;
  return { cols, tileWidth, gap };
}
const ROW_ACCENTS = [
  { border: '#2E7D32', bg: '#EAF6EC', icon: '#2E7D32' }, // verde
  { border: '#C5A12C', bg: '#FCF6E2', icon: '#A88512' }, // amarillo
  { border: '#2E6FD8', bg: '#E8F0FF', icon: '#2E6FD8' }, // azul
  { border: '#7A1F3D', bg: '#F7EAF0', icon: '#7A1F3D' }, // corinto
  { border: '#6A2BA0', bg: '#EFE7FA', icon: '#6A2BA0' }, // morado
];
const BROWN_ACCENT = { border: '#7B4B2A', bg: '#F5EADF', icon: '#7B4B2A' };
const BROWN_MODULE_IDS = new Set(['incidentes', 'inventory']);
/** Solo título visible (sin subtítulo); icono centrado arriba. */
const TITLE_ONLY_MODULE_IDS = new Set(['panel']);

/** Modulos con badge de notificaciones (contador rojo). Sustituir por API cuando exista. */
const BADGE_MODULE_IDS = ['agenda', 'cajas', 'clients', 'mensajes', 'inventory'];
const SALON_MESSAGES_LAST_SEEN_KEY = '@appsalon/salon/mensajes_last_seen_at';
const SALON_PEDIDOS_LAST_SEEN_KEY = '@appsalon/salon/pedidos_last_seen_at';
const SALON_GIFT_CARDS_LAST_SEEN_KEY = '@appsalon/salon/gift_cards_last_seen_at';
const SALON_MARKETING_ENGAGEMENT_LAST_SEEN_KEY = '@appsalon/salon/marketing_engagement_last_seen_at';

function isPendingCashOrder(order) {
  const pay = String(order?.payment_method || '').toLowerCase();
  return (
    String(order?.status || '') === 'pending' &&
    ['efectivo', 'cash', 'efectivo_al_retirar'].includes(pay)
  );
}

function isWebCardOrder(order) {
  const source = String(order?.source || '').toLowerCase();
  const pay = String(order?.payment_method || '').toLowerCase();
  const isWeb = source === 'web' || String(order?.notes || '').includes('Pedido web');
  const isCard = pay === 'tarjeta' || pay === 'card';
  return isWeb && isCard;
}

function webCardOrderNotificationBody(order) {
  const code = order?.tracking_code || `#${String(order?.id || '').slice(0, 8)}`;
  const domicilio =
    String(order?.fulfillment_type || '').includes('domicilio') ||
    Boolean(String(order?.delivery_address || '').trim());
  const modalidad = domicilio ? 'domicilio' : 'retiro en salón';
  const total = Number(order?.total_amount || 0);
  const totalLabel = Number.isFinite(total) && total > 0 ? ` · Q${total.toFixed(2)}` : '';
  return `Pedido web ${code} · tarjeta · ${modalidad}${totalLabel}`;
}

function SalonAdminShell({ onSignOut, profile }) {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const [openedModuleId, setOpenedModuleId] = useState(null);
  const [search, setSearch] = useState('');
  const [searchHits, setSearchHits] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasNewMensajes, setHasNewMensajes] = useState(false);
  const [mensajesAlertReady, setMensajesAlertReady] = useState(false);
  const [hasNewPedidos, setHasNewPedidos] = useState(false);
  const [hasNewGiftCards, setHasNewGiftCards] = useState(false);
  const [hasNewMarketing, setHasNewMarketing] = useState(false);
  const [agendaPendientes, setAgendaPendientes] = useState(0);
  const [homeRefreshing, setHomeRefreshing] = useState(false);
  const searchTimerRef = useRef(null);
  const searchGenRef = useRef(0);
  const badgeCounts = useMemo(
    () => ({
      ...BADGE_MODULE_IDS.reduce((acc, id) => {
        acc[id] = 0;
        return acc;
      }, {}),
      agenda: agendaPendientes,
    }),
    [agendaPendientes],
  );
  const { colors: c, isDark, setScheme } = useTheme();

  const { cols, tileWidth, gap } = useMemo(() => computeModuleGridLayout(winW), [winW]);

  const modules = useMemo(() => {
    const scoped = filterSalonModulesForProfile(SALON_MODULES, profile);
    return filterModulesBySearch(scoped, search);
  }, [search, profile]);

  const styles = useMemo(() => buildStyles(c), [c]);

  const openedModule = openedModuleId ? getModuleById(openedModuleId) : null;

  const refreshMensajesAlert = useCallback(async () => {
    try {
      const [{ data: authData }, { data: recentRes, error }, lastSeenAt] = await Promise.all([
        supabase.auth.getUser(),
        db.marketingDirectMessages.getRecentForInbox(500),
        AsyncStorage.getItem(SALON_MESSAGES_LAST_SEEN_KEY),
      ]);
      const uid = authData?.user?.id ? String(authData.user.id) : '';
      if (!uid || error) {
        setHasNewMensajes(false);
        return;
      }
      const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
      const hasNew = (recentRes || []).some((m) => {
        if (!isSalonInboundClientMessage(m, uid)) return false;
        const createdMs = new Date(m.created_at).getTime();
        return Number.isFinite(createdMs) && createdMs > lastSeenMs;
      });
      setHasNewMensajes((prev) => (prev === hasNew ? prev : hasNew));
    } catch {
      setHasNewMensajes(false);
    } finally {
      setMensajesAlertReady(true);
    }
  }, []);

  const refreshMarketingAlert = useCallback(async () => {
    try {
      const lastSeenAt =
        (await AsyncStorage.getItem(SALON_MARKETING_ENGAGEMENT_LAST_SEEN_KEY)) || '';
      const since = lastSeenAt || new Date(0).toISOString();
      const { data, error } = await fetchMarketingEngagementSince(since);
      if (error) return;
      setHasNewMarketing((data || []).length > 0);
    } catch {
      // noop
    }
  }, []);

  const refreshPedidosAlert = useCallback(async () => {
    try {
      const [{ data: orders, error }, lastSeenAt] = await Promise.all([
        db.orders.getAll(),
        AsyncStorage.getItem(SALON_PEDIDOS_LAST_SEEN_KEY),
      ]);
      if (error) return;
      const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
      const hasNew = (orders || []).filter(
        (o) => isPendingCashOrder(o) || isWebCardOrder(o),
      ).some((o) => {
        const createdMs = new Date(o.created_at).getTime();
        return Number.isFinite(createdMs) && createdMs > lastSeenMs;
      });
      setHasNewPedidos(hasNew);
    } catch {
      // noop
    }
  }, []);

  const refreshGiftCardsAlert = useCallback(async () => {
    try {
      const lastSeenAt = await AsyncStorage.getItem(SALON_GIFT_CARDS_LAST_SEEN_KEY);
      const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
      const { data, error } = await supabase
        .from('gift_cards')
        .select('id, emitida_en')
        .order('emitida_en', { ascending: false })
        .limit(20);
      if (error) return;
      const hasNew = (data || []).some((row) => {
        const ms = new Date(row.emitida_en).getTime();
        return Number.isFinite(ms) && ms > lastSeenMs;
      });
      setHasNewGiftCards(hasNew);
    } catch {
      setHasNewGiftCards(false);
    }
  }, []);

  const refreshAgendaAlert = useCallback(async () => {
    try {
      const { data, error } = await db.citas.getByEstado('pendiente');
      if (error) return;
      setAgendaPendientes(Array.isArray(data) ? data.length : 0);
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    refreshMensajesAlert();
    refreshPedidosAlert();
    refreshGiftCardsAlert();
    refreshAgendaAlert();
    refreshMarketingAlert();
  }, [refreshMensajesAlert, refreshPedidosAlert, refreshGiftCardsAlert, refreshAgendaAlert, refreshMarketingAlert]);

  useEffect(() => {
    configureSalonPushHandler();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (uid) void promptSalonPushPermissions(uid);
    })();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('salon-home-citas-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'citas' },
        (payload) => {
          const row = payload?.new;
          if (String(row?.estado || '').toLowerCase() === 'pendiente') {
            void showLocalSalonNotification({
              title: 'Nueva cita',
              body: 'Hay una reserva pendiente en la agenda',
              data: { module: 'agenda' },
            });
          }
          void refreshAgendaAlert();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'citas' },
        () => {
          void refreshAgendaAlert();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAgendaAlert]);

  useEffect(() => {
    const channel = supabase
      .channel('salon-home-mensajes-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketing_direct_messages' },
        (payload) => {
          void (async () => {
            const row = payload?.new;
            const { data: authData } = await supabase.auth.getUser();
            const uid = authData?.user?.id ? String(authData.user.id) : '';
            if (row && uid && isSalonInboundClientMessage(row, uid)) {
              void showLocalSalonNotification({
                title: row.client_name || 'Cliente',
                body: 'Nuevo mensaje en Andreas Pro',
                data: { module: 'mensajes' },
              });
            }
            void refreshMensajesAlert();
          })();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshMensajesAlert]);

  useEffect(() => {
    const channel = supabase
      .channel('salon-home-marketing-engagement')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketing_comments' },
        () => void refreshMarketingAlert(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'marketing_post_likes' },
        () => void refreshMarketingAlert(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'birthday_club_reactions' },
        () => void refreshMarketingAlert(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'birthday_club_reactions' },
        () => void refreshMarketingAlert(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshMarketingAlert]);

  useEffect(() => {
    const channel = supabase
      .channel('salon-home-pedidos-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ecommerce_orders' },
        (payload) => {
          const row = payload?.new;
          if (row && isPendingCashOrder(row)) {
            void showLocalSalonNotification({
              title: 'Nuevo pedido',
              body: `Pedido ${row.tracking_code || '#' + row.id} · efectivo`,
              data: { module: 'pedidos' },
            });
          } else if (row && isWebCardOrder(row)) {
            void showLocalSalonNotification({
              title: 'Nuevo pedido web',
              body: webCardOrderNotificationBody(row),
              data: { module: 'pedidos' },
            });
          }
          void refreshPedidosAlert();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ecommerce_orders' },
        () => {
          void refreshPedidosAlert();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshPedidosAlert]);

  useEffect(() => {
    const channel = supabase
      .channel('salon-home-gift-cards-alert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gift_cards' },
        (payload) => {
          const row = payload?.new;
          void showLocalSalonNotification({
            title: 'Nueva tarjeta regalo',
            body: `${row?.codigo || 'VIP'} · Q${row?.monto_inicial || ''} para ${row?.para_nombre || 'cliente'}`,
            data: { module: 'tarjetas_regalo' },
          });
          void refreshGiftCardsAlert();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshGiftCardsAlert]);

  const openModule = useCallback(async (id) => {
    if (!canOpenSalonModule(id, profile)) {
      Alert.alert('Sin acceso', 'Tu sucursal no tiene permiso para abrir este módulo.');
      return;
    }
    setOpenedModuleId(id);
    if (id === 'mensajes') {
      setHasNewMensajes(false);
      void AsyncStorage.setItem(SALON_MESSAGES_LAST_SEEN_KEY, new Date().toISOString());
    }
    if (id === 'pedidos') {
      setHasNewPedidos(false);
      void AsyncStorage.setItem(SALON_PEDIDOS_LAST_SEEN_KEY, new Date().toISOString());
    }
    if (id === 'tarjetas_regalo') {
      setHasNewGiftCards(false);
      void AsyncStorage.setItem(SALON_GIFT_CARDS_LAST_SEEN_KEY, new Date().toISOString());
    }
  }, [profile]);
  const onHomeRefresh = useCallback(async () => {
    setHomeRefreshing(true);
    try {
      const q = search.trim();
      await Promise.all([
        refreshMensajesAlert(),
        refreshPedidosAlert(),
        refreshGiftCardsAlert(),
        refreshAgendaAlert(),
        refreshMarketingAlert(),
      ]);
      if (q.length >= SALON_SEARCH_MIN_LEN) {
        const gen = searchGenRef.current + 1;
        searchGenRef.current = gen;
        const hits = await runSalonGlobalSearch(q);
        if (searchGenRef.current === gen) setSearchHits(hits);
      }
    } finally {
      setHomeRefreshing(false);
    }
  }, [search, refreshMensajesAlert, refreshPedidosAlert, refreshGiftCardsAlert, refreshAgendaAlert]);

  const closeModule = useCallback(() => {
    setOpenedModuleId(null);
    setSearch('');
    setSearchHits([]);
    setSearchLoading(false);
    void refreshPedidosAlert();
  }, [refreshPedidosAlert]);

  useEffect(() => {
    const q = search.trim();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (q.length < SALON_SEARCH_MIN_LEN) {
      setSearchHits([]);
      setSearchLoading(false);
      return undefined;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(() => {
      const gen = searchGenRef.current + 1;
      searchGenRef.current = gen;
      runSalonGlobalSearch(q).then(({ hits }) => {
        if (searchGenRef.current === gen) {
          setSearchHits(hits);
          setSearchLoading(false);
        }
      });
    }, 320);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);
  const toggleTheme = useCallback(() => {
    setScheme(isDark ? 'light' : 'dark');
  }, [isDark, setScheme]);

  if (openedModuleId === 'vender') {
    return <VenderScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'agenda') {
    return <AppointmentsScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'cajas') {
    return <CajaScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'clients') {
    return <ClientesScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'empleados') {
    return <EmpleadosScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'goals') {
    return <MetasScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'reportes') {
    return <ReportesScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'marketing') {
    return (
      <MarketingScreen onBack={closeModule} onEngagementSeen={() => void refreshMarketingAlert()} />
    );
  }

  if (openedModuleId === 'eventos') {
    return <EventosProfesionalesScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'mensajes') {
    return <MensajesScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'incidentes') {
    return <IncidentesScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'inventory') {
    return <InventarioScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'papeleria') {
    return <PapeleriaScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'proveedores') {
    return <ProveedoresScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'pedidos') {
    return <PedidosScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'tarjetas_regalo') {
    return <TarjetasRegaloScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'panel') {
    return <ControlPanelScreen onBack={closeModule} />;
  }

  if (openedModuleId === 'sucursales') {
    return <SucursalesScreen onBack={closeModule} onRequestSignOut={onSignOut} />;
  }

  if (openedModule) {
    return (
      <SalonModulePlaceholder module={openedModule} onBack={closeModule} />
    );
  }

  const scrollBottom = Math.max(insets.bottom, spacing.md) + spacing.lg;

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: scrollBottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={homeRefreshing}
            onRefresh={onHomeRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
            progressBackgroundColor={c.card}
          />
        }
      >
        <View style={styles.contentWrap}>
          <View style={[styles.headerTop, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.titleBlock}>
              <Text style={styles.brand}>App Andrea</Text>
              <Text style={styles.brandLead}>
                {isSalonSucursalAdmin(profile?.role)
                  ? getSalonBranchDisplayName(profile) || 'Mi sucursal'
                  : isSalonGlobalAdmin(profile?.role)
                    ? 'Matriz · admin global'
                    : 'Administracion'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.themeToggle}
                onPress={() => openModule('vender')}
                accessibilityRole="button"
                accessibilityLabel="Vender"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Store size={22} color={c.foreground} strokeWidth={2} />
              </TouchableOpacity>
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
              {typeof onSignOut === 'function' ? (
                <TouchableOpacity
                  style={styles.themeToggle}
                  onPress={onSignOut}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <LogOut size={22} color={c.foreground} strokeWidth={2} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <ScreenHeader
            showHomeBar
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Buscar clientes, inventario, servicios, facturas, folios…"
            wrapStyle={styles.searchWrap}
          />

          {search.trim().length >= SALON_SEARCH_MIN_LEN ? (
            <GlobalSearchResults
              query={search}
              hits={searchHits}
              loading={searchLoading}
              onOpenModule={openModule}
            />
          ) : null}

          <Text style={styles.sectionLabel}>
            {search.trim().length >= SALON_SEARCH_MIN_LEN ? 'Modulos relacionados' : 'Modulos'}
          </Text>

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
                  titleOnly={TITLE_ONLY_MODULE_IDS.has(m.id)}
                  badgeCount={BADGE_MODULE_IDS.includes(m.id) ? badgeCounts[m.id] ?? 0 : 0}
                  showAlertBell={
                    (m.id === 'mensajes' && mensajesAlertReady && hasNewMensajes) ||
                    (m.id === 'pedidos' && hasNewPedidos) ||
                    (m.id === 'tarjetas_regalo' && hasNewGiftCards) ||
                    (m.id === 'marketing' && hasNewMarketing)
                  }
                  onPress={() => openModule(m.id)}
                />
              );
            })}
          </View>

          {modules.length === 0 ? (
            <Text style={styles.noResults}>No hay resultados para tu busqueda.</Text>
          ) : null}

          <OtaStatusPanel theme={{ colors: c, isDark }} appLabel="App Salón" />
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
      backgroundColor: c.background,
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: 2,
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

async function resolveSalonAuthPhase() {
  if (!hasSupabaseEnv) return { phase: 'signin', message: 'Supabase no configurado en este build.' };
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr && isInvalidRefreshTokenError(sessionErr)) {
    await supabase.auth.signOut({ scope: 'local' });
    clearSalonSessionProfile();
    return { phase: 'signin' };
  }
  if (!session?.user?.id) {
    clearSalonSessionProfile();
    return { phase: 'signin' };
  }
  const { data: profile, error } = await db.profiles.getById(session.user.id);
  if (error || !profile) {
    await db.auth.signOut();
    clearSalonSessionProfile();
    return {
      phase: 'signin',
      message: `No hay perfil con id = ${session.user.id}. Creá o enlazá la fila en profiles con ese UUID (Authentication → Users).`,
    };
  }
  if (!canAccessSalonApp(profile.role)) {
    await db.auth.signOut();
    clearSalonSessionProfile();
    return {
      phase: 'signin',
      message:
        'Tu cuenta no tiene permiso para App Salón. Debe ser admin (global), admin_global o admin_sucursal en profiles.',
    };
  }
  if (isSalonSucursalAdmin(profile.role) && !profile.sucursal_id) {
    await db.auth.signOut();
    clearSalonSessionProfile();
    return {
      phase: 'signin',
      message: 'Tu perfil admin_sucursal debe tener sucursal_id asignado en profiles.',
    };
  }
  const enriched = await enrichSalonSessionProfile(profile, () => db.sucursales.listActivas());
  setSalonSessionProfile(enriched);
  return { phase: 'ready', profile: enriched };
}

function SalonAppWithAuth() {
  const { colors: c } = useTheme();
  const [phase, setPhase] = useState('checking');
  const [signInError, setSignInError] = useState(null);
  const [sessionProfile, setSessionProfile] = useState(null);

  const refreshPhase = useCallback(async () => {
    setPhase('checking');
    try {
      const result = await resolveSalonAuthPhase();
      setSignInError(result.message ?? null);
      setSessionProfile(result.profile ?? null);
      setPhase(result.phase);
    } catch {
      setSignInError(null);
      setPhase('signin');
    }
  }, []);

  useEffect(() => {
    refreshPhase();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        clearSalonSessionProfile();
        setSessionProfile(null);
        setPhase('signin');
        return;
      }
      resolveSalonAuthPhase()
        .then((result) => {
          setSignInError(result.message ?? null);
          setSessionProfile(result.profile ?? null);
          setPhase(result.phase);
        })
        .catch(() => setPhase('signin'));
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshPhase]);

  const handleSignOut = useCallback(async () => {
    await clearPendingBranchAdminSetup();
    await db.auth.signOut();
    clearSalonSessionProfile();
    setSessionProfile(null);
    setSignInError(null);
    setPhase('signin');
  }, []);

  if (phase === 'checking') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  if (phase === 'signin') {
    return (
      <SalonAdminSignInScreen
        initialError={signInError}
        onSignedIn={async () => {
          setSignInError(null);
          const result = await resolveSalonAuthPhase();
          setSessionProfile(result.profile ?? null);
          setPhase(result.phase);
        }}
      />
    );
  }

  return <SalonAdminShell onSignOut={handleSignOut} profile={sessionProfile} />;
}

function MissingConfigScreen() {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const bg = isDark ? '#121212' : '#FDFBF7';
  const fg = isDark ? '#F5F5F5' : '#1a1a1a';
  const muted = isDark ? '#C8C8C8' : '#444';
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        backgroundColor: bg,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '600', color: fg, marginBottom: 12 }}>
        App no configurada
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: muted }}>
        Este APK se generó sin las claves de Supabase (EXPO_PUBLIC_SUPABASE_URL y
        EXPO_PUBLIC_SUPABASE_ANON_KEY). Hay que volver a compilar con eas env en Expo y
        reinstalar el APK nuevo.
      </Text>
    </View>
  );
}

export default function App() {
  if (!hasSupabaseEnv) {
    return <MissingConfigScreen />;
  }

  const systemScheme = useColorScheme();
  const bootBg = systemScheme === 'dark' ? '#121212' : '#FDFBF7';
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
          backgroundColor: bootBg,
        }}
      >
        <ActivityIndicator color="#C9A961" size="large" />
      </View>
    );
  }

  return (
    <OtaLauncher>
      <ThemeProvider>
        <SafeAreaProvider>
          <SalonThemedRoot />
        </SafeAreaProvider>
      </ThemeProvider>
    </OtaLauncher>
  );
}

/** Evita franjas blancas (área segura / ventana) fuera del contenido en modo oscuro. */
function SalonThemedRoot() {
  const { colors: c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <SalonAppWithAuth />
    </View>
  );
}
