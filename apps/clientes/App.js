import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { TiendaCartProvider, useTiendaCart } from './context/TiendaCartContext';
import { ServiciosCartProvider } from './context/ServiciosCartContext';
import { TiendaCartButton } from './components/tienda/TiendaCartButton';
import { countActivePedidos } from './utils/pedidosBadge';
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Bell,
  Phone,
  CreditCard,
  Settings,
  LogOut,
  Store,
  Flame,
  Award,
  Package,
  Gem,
  FileText,
  MessageCircle,
} from 'lucide-react-native';
import { useWindowDimensions } from 'react-native';
import {
  supabase,
  db,
  isInvalidRefreshTokenError,
  uploadClientePhotoFromUri,
  fetchClientAuraUnreadCount,
  fetchClientAuraMessages,
  isInboundAuraUnread,
  sendClientAuraChat,
  buildBroadcastActionMessage,
  BROADCAST_PROMO_ACTIONS,
  BROADCAST_LINK_TYPES,
  parseBroadcastContent,
  mapHomeHeroPostToClientSlide,
  enrichHomeCarouselSlidesWithInventario,
  getArticuloTipo,
  normalizeInventarioCarouselId,
  resolveCarouselArticuloTipo,
} from '@appsalon/shared-config';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';

import {
  SalonButton,
  BottomTabs,
  ProfileConnectionCard,
  ScreenHeader,
  QuickAccessRow,
  SubScreenChrome,
  HeroImageCarousel,
} from './components/luxury';
import { QuickPosterGrid } from './components/luxury/QuickPosterGrid';
import { MembresiaBadge } from './components/MembresiaBadge';
import { PremiosCelebrationModal } from './components/luxury/PremiosCelebrationModal';
import { CLIENT_SUB } from './navigation/clientSubScreens';
import {
  PREMIOS_PROGRESS_STORAGE_KEY,
  PREMIOS_CANJE_FLAGS_KEY,
  buildPremiosProgressSnapshot,
  buildPremiosCanjeFlags,
  premiosProgressIncreased,
  premiosCanjeNewlyUnlocked,
  pickPrimaryPremiosCanjeUnlock,
  anyPremiosCanjeReady,
  resolvePremiosMeta,
} from './utils/premiosPointsAlert';
import { getSubScreenTitles } from './navigation/clientSubScreensMeta';
import { ClientSubScreenBody } from './screens/ClientSubScreenBody';
import { MisCitasTab } from './components/citas/MisCitasTab';
import { HistorialCitasTab } from './components/citas/HistorialCitasTab';
import { warmClientAuraThreadCache } from './components/mensajes/AuraLineInbox';
import {
  loadClientNotifPrefs,
  saveClientNotifPrefs,
  DEFAULT_CLIENT_NOTIF_PREFS,
} from './services/clientNotifPrefs';
import {
  spacing,
  typography,
  radii,
  tabBarLayout,
} from '@appsalon/design-tokens';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import {
  setIntroDone,
  setTourDone,
  clearLegacyLocalSession,
  getIntroDone,
  getTourDone,
} from './onboarding/onboardingStorage';
import { ClientAuthScreen } from './onboarding/ClientAuthScreen';
import { SupabaseConfigScreen } from './onboarding/SupabaseConfigScreen';
import { completeAuthFromRedirectUrl } from './utils/clientAuthEmail';
import {
  tryShowCitaConfirmacionAlert,
  getCitaConfirmacionMsgAlertadas,
} from './utils/citaConfirmacionMensajeAlerts';
import {
  promptClientPushPermissions,
  addClientPushResponseListener,
  configureClientPushHandler,
  showLocalClientNotification,
} from './utils/clientPush';
import {
  markAllClientNotificationsRead,
  markClientNotificationsRead,
  notifyClientFromMdmId,
} from '@appsalon/shared-config';
import { partitionCitasCliente } from './utils/citasLabels';
import * as Linking from 'expo-linking';
import { PostLoginIntroScreen } from './onboarding/PostLoginIntroScreen';
import { AppTourScreen } from './onboarding/AppTourScreen';
import {
  DEFAULT_PROFILE,
  DEFAULT_GREETING_NAME,
  QUICK_ACCESS,
} from './data/luxuryUiMocks';
const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ??
  'https://appsalon-pro-web-catalogo.vercel.app/privacidad';

const hasSupabaseEnv = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim(),
);

const TABS = {
  INICIO: 'inicio',
  CITAS: 'citas',
  HISTORIAL: 'historial',
  PERFIL: 'perfil',
};

const TAB_ITEMS = [
  { id: TABS.INICIO, label: 'Inicio', icon: Sparkles },
  { id: TABS.CITAS, label: 'Servicios', icon: Calendar },
  { id: TABS.HISTORIAL, label: 'Citas', icon: Clock },
  { id: TABS.PERFIL, label: 'Perfil', icon: User },
];

/** Altura real del tab bar (sincronizado con BottomTabs.js). */
function tabBarOverlayHeight(insets) {
  const bottomPad = Math.max(insets.bottom, 8);
  const barCore = 8 + 4 + 40 + 4 + 14;
  return barCore + bottomPad;
}

function paddingForTabBar(insets) {
  return tabBarOverlayHeight(insets) + spacing.md;
}

function ProfileMenuRow({ icon: Icon, label, onPress }) {
  const { colors: c } = useTheme();
  const rowStyles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xs,
        },
        label: {
          flex: 1,
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: c.foreground,
        },
      }),
    [c],
  );

  return (
    <TouchableOpacity
      style={rowStyles.row}
      onPress={onPress ?? (() => {})}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      <Icon size={20} color={c.foreground} strokeWidth={1.75} />
      <Text style={rowStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatGtq(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return `Q ${x.toLocaleString('es-GT', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function labelEstadoCita(estado) {
  const s = String(estado || '').trim().toLowerCase();
  if (s === 'confirmado') return 'Confirmada';
  if (s === 'pendiente') return 'Pendiente';
  if (s === 'rechazado' || s === 'rechazada') return 'Rechazada';
  if (s === 'cancelado' || s === 'cancelada') return 'Cancelada';
  if (s === 'completado' || s === 'completada') return 'Completada';
  if (!s) return 'Sin estado';
  return String(estado);
}

function AppMain({ onLogout }) {
  const insets = useSafeAreaInsets();
  const { height: windowH, width: windowW } = useWindowDimensions();
  const scrollBottom = paddingForTabBar(insets);
  const inicioTabBarPad = tabBarOverlayHeight(insets);
  const inicioHeroHeight =
    insets.top +
    Math.min(
      Math.round(windowW / (626 / 500)),
      Math.round((windowH - inicioTabBarPad) * 0.6),
    );
  const [tab, setTab] = useState(TABS.INICIO);
  const [highlightInventarioId, setHighlightInventarioId] = useState(null);
  const [session, setSession] = useState(null);
  const [clienteRow, setClienteRow] = useState(null);
  const clienteRowRef = useRef(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilMeta, setPerfilMeta] = useState({ error: null });
  const fichaLoadSeqRef = useRef(0);

  useEffect(() => {
    clienteRowRef.current = clienteRow;
  }, [clienteRow]);

  const [headerSearch, setHeaderSearch] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [inicioHeroSlides, setInicioHeroSlides] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_CLIENT_NOTIF_PREFS);
  const [auraUnread, setAuraUnread] = useState(0);
  const [pedidosActivos, setPedidosActivos] = useState(0);
  const [premiosBadge, setPremiosBadge] = useState(false);
  const [premiosCanjeReady, setPremiosCanjeReady] = useState(false);
  const [premiosCelebrationVisible, setPremiosCelebrationVisible] = useState(false);
  const [premiosCelebrationRuleId, setPremiosCelebrationRuleId] = useState(null);
  const premiosSnapshotRef = useRef(null);
  const openedSubRef = useRef(null);
  const { cartCount } = useTiendaCart();
  const [openedSub, setOpenedSub] = useState(null);
  const [subPayload, setSubPayload] = useState(null);
  const openSub = useCallback((id, payload = null) => {
    setSubPayload(payload);
    setOpenedSub(id);
  }, []);

  useEffect(() => {
    openedSubRef.current = openedSub;
  }, [openedSub]);

  const refreshPremiosPointsAlert = useCallback(async () => {
    const userId = session?.user?.id;
    const row = clienteRowRef.current;
    if (!hasSupabaseEnv || !userId || !row?.id) return;
    const r = await db.premiosAndreas.getResumen({ clientUserId: userId, clienteRow: row });
    if (r.error) return;
    const next = buildPremiosProgressSnapshot(r);
    if (!next) return;
    premiosSnapshotRef.current = next;

    const meta = resolvePremiosMeta(row?.membresia_nivel);
    const canjeFlags = buildPremiosCanjeFlags(r, meta);
    setPremiosCanjeReady(anyPremiosCanjeReady(canjeFlags));

    let prev = null;
    let prevCanje = null;
    try {
      const raw = await AsyncStorage.getItem(PREMIOS_PROGRESS_STORAGE_KEY);
      if (raw) prev = JSON.parse(raw);
      const rawCanje = await AsyncStorage.getItem(PREMIOS_CANJE_FLAGS_KEY);
      if (rawCanje) prevCanje = JSON.parse(rawCanje);
    } catch {
      /* ignore */
    }

    if (!prev) {
      try {
        await AsyncStorage.setItem(PREMIOS_PROGRESS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    } else if (
      premiosProgressIncreased(prev, next) &&
      openedSubRef.current !== CLIENT_SUB.PREMIOS
    ) {
      setPremiosBadge(true);
    }

    if (canjeFlags) {
      if (!prevCanje) {
        try {
          await AsyncStorage.setItem(PREMIOS_CANJE_FLAGS_KEY, JSON.stringify(canjeFlags));
        } catch {
          /* ignore */
        }
      } else if (premiosCanjeNewlyUnlocked(prevCanje, canjeFlags)) {
        setPremiosCelebrationRuleId(pickPrimaryPremiosCanjeUnlock(prevCanje, canjeFlags));
        setPremiosCelebrationVisible(true);
        try {
          await AsyncStorage.setItem(PREMIOS_CANJE_FLAGS_KEY, JSON.stringify(canjeFlags));
        } catch {
          /* ignore */
        }
      }
    }
  }, [session?.user?.id, hasSupabaseEnv]);

  const refreshPremiosPointsAlertRef = useRef(refreshPremiosPointsAlert);
  useEffect(() => {
    refreshPremiosPointsAlertRef.current = refreshPremiosPointsAlert;
  }, [refreshPremiosPointsAlert]);

  const handlePrizeReady = useCallback((ready) => {
    setPremiosCanjeReady(Boolean(ready));
  }, []);

  const handlePremiosResumenLoaded = useCallback(
    async (r) => {
      const row = clienteRowRef.current;
      if (!r || !row?.id) return;
      const meta = resolvePremiosMeta(row?.membresia_nivel);
      const canjeFlags = buildPremiosCanjeFlags(r, meta);
      setPremiosCanjeReady(anyPremiosCanjeReady(canjeFlags));
      if (!canjeFlags) return;
      let prevCanje = null;
      try {
        const rawCanje = await AsyncStorage.getItem(PREMIOS_CANJE_FLAGS_KEY);
        if (rawCanje) prevCanje = JSON.parse(rawCanje);
      } catch {
        /* ignore */
      }
      if (!prevCanje) {
        try {
          await AsyncStorage.setItem(PREMIOS_CANJE_FLAGS_KEY, JSON.stringify(canjeFlags));
        } catch {
          /* ignore */
        }
        return;
      }
      if (premiosCanjeNewlyUnlocked(prevCanje, canjeFlags)) {
        setPremiosCelebrationRuleId(pickPrimaryPremiosCanjeUnlock(prevCanje, canjeFlags));
        setPremiosCelebrationVisible(true);
        try {
          await AsyncStorage.setItem(PREMIOS_CANJE_FLAGS_KEY, JSON.stringify(canjeFlags));
        } catch {
          /* ignore */
        }
      }
    },
    [],
  );

  const acknowledgePremiosProgress = useCallback(async () => {
    const userId = session?.user?.id;
    if (hasSupabaseEnv && userId && clienteRow?.id) {
      const r = await db.premiosAndreas.getResumen({ clientUserId: userId, clienteRow });
      if (!r.error) {
        const snap = buildPremiosProgressSnapshot(r);
        if (snap) {
          premiosSnapshotRef.current = snap;
          try {
            await AsyncStorage.setItem(PREMIOS_PROGRESS_STORAGE_KEY, JSON.stringify(snap));
          } catch {
            /* ignore */
          }
        }
        const meta = resolvePremiosMeta(clienteRow?.membresia_nivel);
        const flags = buildPremiosCanjeFlags(r, meta);
        if (flags) {
          try {
            await AsyncStorage.setItem(PREMIOS_CANJE_FLAGS_KEY, JSON.stringify(flags));
          } catch {
            /* ignore */
          }
        }
      }
    }
    setPremiosBadge(false);
  }, [session?.user?.id, clienteRow, hasSupabaseEnv]);

  const handlePremiosCanjeNavigate = useCallback(
    (target) => {
      setOpenedSub(null);
      setSubPayload(null);
      openedSubRef.current = null;
      if (target === 'tienda') {
        openSub(CLIENT_SUB.TIENDA);
      } else if (target === 'citas') {
        setTab(TABS.CITAS);
      }
    },
    [openSub],
  );

  const openAgendarServicio = useCallback(
    (nombre) => {
      openSub(CLIENT_SUB.AGENDAR_FLUJO, {
        agendarServicioNombre: nombre || null,
      });
    },
    [openSub],
  );

  const openServiciosCart = useCallback(() => {
    openSub(CLIENT_SUB.SERVICIOS_CARRITO);
  }, [openSub]);

  const openAgendarDesdeCarrito = useCallback(() => {
    openSub(CLIENT_SUB.AGENDAR_FLUJO, { agendarDesdeCarrito: true });
  }, [openSub]);

  const notifyPromoFollowUp = useCallback(
    async (action, promoItem, extra = '') => {
      const msg = buildBroadcastActionMessage(action, promoItem, extra);
      if (!msg || !clienteRow?.id) return;
      const { error } = await sendClientAuraChat(msg, {
        clientName: clienteRow.nombre || 'Cliente',
        clientPhone: clienteRow.telefono || null,
      });
      if (error) Alert.alert('Andreas Pro', error.message || 'No se pudo avisar al salón.');
    },
    [clienteRow],
  );

  const handlePromoAction = useCallback(
    (action, promoItem) => {
      const parsed = parseBroadcastContent(promoItem?.content);
      const payload = { promoItem, parsed };

      if (action === BROADCAST_PROMO_ACTIONS.CALL) {
        Alert.alert(
          '¿Pedir que te llamen?',
          'Solo si confirmás, el salón verá tu solicitud en Mensajes.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Sí, llamenme',
              onPress: async () => {
                await notifyPromoFollowUp(action, promoItem);
                openSub(CLIENT_SUB.CONTACTO);
              },
            },
          ],
        );
        return;
      }

      if (action === BROADCAST_PROMO_ACTIONS.BUY) {
        const productId =
          parsed.linkType === BROADCAST_LINK_TYPES.PRODUCT && parsed.linkId != null
            ? String(parsed.linkId).trim()
            : '';
        openSub(CLIENT_SUB.TIENDA, {
          ...payload,
          tiendaProductId: productId || null,
          tiendaPhase: productId ? 'detail' : 'catalog',
          tiendaAddToCart: false,
          tiendaOpenKey: productId ? Date.now() : 0,
        });
        return;
      }

      if (action === BROADCAST_PROMO_ACTIONS.BOOK) {
        openedSubRef.current = null;
        setOpenedSub(null);
        setSubPayload(null);
        setTab(TABS.CITAS);
        const linkId = parsed.linkId != null ? String(parsed.linkId).trim() : '';
        if (parsed.linkType === BROADCAST_LINK_TYPES.SERVICE && linkId) {
          setHighlightInventarioId(null);
          setTimeout(() => setHighlightInventarioId(linkId), 0);
        }
      }
    },
    [notifyPromoFollowUp, openSub],
  );

  const goTabFromSub = useCallback((slug) => {
    if (slug === 'inicio') setTab(TABS.INICIO);
    else if (slug === 'citas') setTab(TABS.CITAS);
    else if (slug === 'historial') setTab(TABS.HISTORIAL);
    else if (slug === 'perfil') setTab(TABS.PERFIL);
    const wasPremios = openedSubRef.current === CLIENT_SUB.PREMIOS;
    openedSubRef.current = null;
    setOpenedSub(null);
    setSubPayload(null);
    if (wasPremios) void refreshPremiosPointsAlert();
  }, [refreshPremiosPointsAlert]);

  const { colors: c, isDark } = useTheme();
  const styles = useMemo(() => buildAppStyles(c), [c]);

  const [citasRaw, setCitasRaw] = useState([]);
  const [citasLoading, setCitasLoading] = useState(false);
  const [citasNonce, setCitasNonce] = useState(0);
  const refreshCitas = useCallback(() => setCitasNonce((n) => n + 1), []);

  const pickAvatar = useCallback(async (source) => {
    const applyUri = async (uri) => {
      setAvatarUri(uri);
      if (!hasSupabaseEnv || !session?.user?.id) return;
      let row = clienteRow;
      if (!row?.id) {
        row = await ensureClienteFicha();
      }
      if (!row?.id) {
        Alert.alert(
          'Foto guardada en el dispositivo',
          'Tu cuenta aún no tiene ficha en el salón. Pedí en recepción que activen el vínculo, o registrate de nuevo con Supabase configurado.',
        );
        return;
      }
      const { publicUrl, error: upErr } = await uploadClientePhotoFromUri(uri, {
        extension: 'jpg',
        contentType: 'image/jpeg',
      });
      if (upErr) {
        Alert.alert('No se subió la foto', upErr.message || 'Revisá el bucket Storage "clientes".');
        return;
      }
      const { error: saveErr } = await db.clientes.update(row.id, { photo_url: publicUrl });
      if (saveErr) {
        Alert.alert('No se guardó la foto', saveErr.message || 'Intentá de nuevo.');
        return;
      }
      setAvatarUri(publicUrl);
      await refreshClienteFicha(session.user.id, { showPerfilSpinner: false });
    };

    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permiso de cámara',
            'Activa el permiso en ajustes del dispositivo para tomarte una foto.',
          );
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          await applyUri(res.assets[0].uri);
        }
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de galería',
          'Necesario para elegir una foto desde tu librería.',
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        await applyUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('No se pudo abrir la cámara o la galería');
    }
  }, [clienteRow, ensureClienteFicha, hasSupabaseEnv, refreshClienteFicha, session?.user?.id]);

  const onAvatarTap = useCallback(() => {
    Alert.alert('Foto de perfil', 'Elige cómo cargar tu imagen.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => pickAvatar('camera') },
      { text: 'Galería', onPress: () => pickAvatar('library') },
    ]);
  }, [pickAvatar]);

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    let alive = true;
    (async () => {
      const [heroRes, legacyCarouselRes] = await Promise.all([
        db.marketingPosts.getPublishedHomeHero(15),
        db.marketingPosts.getPublishedHomeCarousel(15),
      ]);
      if (!alive) return;
      if (heroRes.error && legacyCarouselRes.error) {
        if (__DEV__) {
          console.warn(
            '[Inicio] Hero Supabase:',
            heroRes.error?.message || legacyCarouselRes.error?.message,
          );
        }
        return;
      }
      const merged = [...(heroRes.data || []), ...(legacyCarouselRes.data || [])].sort(
        (a, b) =>
          new Date(b.published_at || b.created_at).getTime() -
          new Date(a.published_at || b.created_at).getTime(),
      );
      if (merged.length > 0) {
        const mapped = merged.map(mapHomeHeroPostToClientSlide);
        const enriched = await enrichHomeCarouselSlidesWithInventario(
          mapped,
          (id) => db.inventario.getById(id),
          getArticuloTipo,
        );
        if (alive) setInicioHeroSlides(enriched);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv) return undefined;

    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error && isInvalidRefreshTokenError(error)) {
        void supabase.auth.signOut({ scope: 'local' });
        setSession(null);
        return;
      }
      setSession(s ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshClienteFicha = useCallback(async (userId, opts = { showPerfilSpinner: true }) => {
    if (!hasSupabaseEnv || !userId) {
      setClienteRow(null);
      return null;
    }
    const seq = ++fichaLoadSeqRef.current;
    const showSpinner = opts.showPerfilSpinner && !clienteRowRef.current;
    if (showSpinner) setPerfilLoading(true);
    setPerfilMeta({ error: null });
    const { data, error } = await db.clientes.getByUserId(userId);
    if (seq !== fichaLoadSeqRef.current) return clienteRowRef.current;
    if (showSpinner) setPerfilLoading(false);
    if (error) {
      // No vaciar clienteRow en error — mantener estado anterior para no romper la UI
      setPerfilMeta({ error: error.message });
      return null;
    }
    if (data) {
      const { data: syncPayload } = await db.membresias.syncVigencia(data.id);
      if (syncPayload?.expired) {
        const { data: refreshed } = await db.clientes.getByUserId(userId);
        const row = refreshed || { ...data, membresia_nivel: null, membresia_vence_en: null };
        if (seq !== fichaLoadSeqRef.current) return clienteRowRef.current;
        setClienteRow(row);
        void refreshPremiosPointsAlertRef.current?.();
        Alert.alert('Membresía', syncPayload.message || 'Tu cuenta volvió a Estándar. Pedí un nuevo código en el salón.');
        return row;
      }
      if (seq !== fichaLoadSeqRef.current) return clienteRowRef.current;
      setClienteRow(data);
      setPerfilMeta({ error: null });
      if (data.photo_url) setAvatarUri(data.photo_url);
      void refreshPremiosPointsAlertRef.current?.();
      return data;
    }
    // Si no hay error pero tampoco datos, mantener clienteRow existente
    setPerfilMeta({ error: null });
    return null;
  }, [hasSupabaseEnv]);

  const ensureClienteFicha = useCallback(async () => {
    if (!hasSupabaseEnv || !session?.user?.id) return null;
    const u = session.user;
    const name =
      (u.user_metadata?.full_name && String(u.user_metadata.full_name).trim()) ||
      u.email?.split('@')[0] ||
      'Cliente';
    await db.clientes.ensureFromAuth({
      userId: u.id,
      nombre: name,
      email: u.email,
    });
    return refreshClienteFicha(u.id);
  }, [session?.user, refreshClienteFicha]);

  // Al abrir Premios, asegurar ficha cliente antes de que el dashboard cargue contadores.
  useEffect(() => {
    if (openedSub !== CLIENT_SUB.PREMIOS) return undefined;
    const userId = session?.user?.id;
    if (!hasSupabaseEnv || !userId) return undefined;
    let cancelled = false;
    void (async () => {
      if (!clienteRowRef.current?.id) {
        await ensureClienteFicha();
      } else {
        await refreshClienteFicha(userId, { showPerfilSpinner: false });
      }
      if (!cancelled && __DEV__) {
        console.log('[Premios] ficha lista:', Boolean(clienteRowRef.current?.id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openedSub, hasSupabaseEnv, session?.user?.id, ensureClienteFicha, refreshClienteFicha]);

  const auraAlertsEnabled = notifPrefs.mensajes || notifPrefs.cambiosAgenda;

  const refreshAuraUnread = useCallback(async () => {
    if (!hasSupabaseEnv || !clienteRow?.id) {
      setAuraUnread(0);
      return;
    }
    // Campanita Mensajes: solo hilos entrantes del salón (pending_sync), no eco de tus envíos.
    const { count, error } = await fetchClientAuraUnreadCount();
    setAuraUnread(error ? 0 : Math.max(0, Number(count) || 0));
  }, [clienteRow?.id]);

  const refreshPedidosActivos = useCallback(async () => {
    const userId = session?.user?.id;
    if (!hasSupabaseEnv || !userId) {
      setPedidosActivos(0);
      return;
    }
    const { data, error } = await db.orders.getByCliente(userId);
    if (error) return;
    setPedidosActivos(countActivePedidos(data));
    await refreshPremiosPointsAlert();
  }, [session?.user?.id, refreshPremiosPointsAlert]);

  const handlePedidosChanged = useCallback(async () => {
    await refreshPedidosActivos();
  }, [refreshPedidosActivos]);

  const handleNotifPrefChange = useCallback(
    async (key, value) => {
      setNotifPrefs((prev) => {
        const next = { ...prev, [key]: value };
        void saveClientNotifPrefs(session?.user?.id ?? null, next);
        return next;
      });
      if (key === 'mensajes') {
        setTimeout(() => refreshAuraUnread(), 0);
      }
    },
    [session?.user?.id, refreshAuraUnread],
  );

  useEffect(() => {
    void loadClientNotifPrefs(session?.user?.id ?? null).then(setNotifPrefs);
  }, [session?.user?.id]);

  const openMensajesSub = useCallback(() => {
    openSub(CLIENT_SUB.MENSAJES);
    void (async () => {
      if (hasSupabaseEnv && session?.user?.id && !clienteRow?.id) {
        await ensureClienteFicha();
      }
      if (clienteRow?.id) {
        void warmClientAuraThreadCache(clienteRow.id);
      }
      await markAllClientNotificationsRead();
      setAuraUnread(0);
      void refreshAuraUnread();
    })();
  }, [openSub, refreshAuraUnread, hasSupabaseEnv, session?.user?.id, clienteRow?.id, ensureClienteFicha]);

  const openMisPedidosSub = useCallback(() => {
    void (async () => {
      await markAllClientNotificationsRead();
      setAuraUnread(0);
      void refreshAuraUnread();
    })();
    openSub(CLIENT_SUB.MIS_PEDIDOS);
  }, [openSub, refreshAuraUnread]);

  const openMisFacturasSub = useCallback(
    (ventaId = null) => {
      openSub(
        CLIENT_SUB.MIS_FACTURAS,
        ventaId != null ? { ventaId: String(ventaId) } : null,
      );
    },
    [openSub],
  );

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return undefined;
    configureClientPushHandler();
    void promptClientPushPermissions(uid);
    return addClientPushResponseListener((data) => {
      const screen = String(data?.target_screen || '');
      if (screen === 'mis_pedidos') openMisPedidosSub();
      else if (screen === 'mis_facturas') openMisFacturasSub(data?.target_id);
      else if (screen === 'mensajes') openMensajesSub();
    });
  }, [session?.user?.id, openMensajesSub, openMisPedidosSub, openMisFacturasSub]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return undefined;

    const shouldShow = (row) => {
      const t = String(row?.tipo || '');
      if (t === 'pedido') return notifPrefs.pedidos;
      if (t === 'promo') return notifPrefs.promociones;
      if (t === 'cita') return notifPrefs.cambiosAgenda;
      return notifPrefs.mensajes;
    };

    const channel = supabase
      .channel(`client-notifications-${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_notifications',
          filter: `client_user_id=eq.${uid}`,
        },
        (payload) => {
          const row = payload?.new;
          if (!row || !shouldShow(row)) return;
          const target = String(row.target_screen || '');
          const onSub =
            target === 'mis_pedidos'
              ? CLIENT_SUB.MIS_PEDIDOS
              : target === 'mis_facturas'
                ? CLIENT_SUB.MIS_FACTURAS
                : target === 'mensajes'
                  ? CLIENT_SUB.MENSAJES
                  : null;
          const isInboxNotif = ['mensaje', 'cita', 'promo'].includes(String(row?.tipo || ''));
          if ((onSub && openedSub === onSub) || (openedSub === CLIENT_SUB.MENSAJES && isInboxNotif)) {
            if (row?.id != null) {
              void markClientNotificationsRead([row.id]).then(() => {
                void refreshAuraUnread();
              });
            }
            return;
          }
          if (target === 'mis_pedidos') void refreshPedidosActivos();
          if (target === 'mensajes' || row.tipo === 'cita') void refreshAuraUnread();
          void showLocalClientNotification({
            title: row.titulo,
            body: row.mensaje,
            data: {
              target_screen: row.target_screen,
              target_id: row.target_id,
              tipo: row.tipo,
            },
          });
          Alert.alert(row.titulo || 'Andreas Pro', row.mensaje || '', [
            {
              text: 'Ver',
              onPress: () => {
                if (target === 'mis_pedidos') openMisPedidosSub();
                else if (target === 'mis_facturas') openMisFacturasSub(row.target_id);
                else openMensajesSub();
              },
            },
            { text: 'OK', style: 'cancel' },
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    session?.user?.id,
    notifPrefs,
    openedSub,
    openMensajesSub,
    openMisPedidosSub,
    openMisFacturasSub,
    refreshAuraUnread,
    refreshPedidosActivos,
  ]);

  const handleCitaConfirmacionMessage = useCallback(
    async (row) => {
      const uid = session?.user?.id;
      if (!uid || String(row?.content_type || '') !== 'cita_confirmacion') return;
      const citaAlertsOn = notifPrefs.cambiosAgenda || notifPrefs.mensajes;
      if (citaAlertsOn) {
        void notifyClientFromMdmId(row?.id);
        await refreshAuraUnread();
        setAuraUnread((prev) => Math.max(prev, 1));
      }
      void showLocalClientNotification({
        title: 'Tu cita está confirmada',
        body: 'Revisá los detalles en Mensajes.',
        data: { target_screen: 'mensajes', target_id: String(row?.id || '') },
      });
      const skipPopup = openedSub === CLIENT_SUB.MENSAJES;
      await tryShowCitaConfirmacionAlert(row, uid, {
        skipPopup,
        onVerMensajes: openMensajesSub,
      });
      if (citaAlertsOn) void refreshAuraUnread();
    },
    [
      session?.user?.id,
      clienteRow?.id,
      notifPrefs.cambiosAgenda,
      notifPrefs.mensajes,
      openedSub,
      openMensajesSub,
      refreshAuraUnread,
    ],
  );

  const scanCitaConfirmacionAlerts = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid || !clienteRow?.id) return;
    const alertadas = await getCitaConfirmacionMsgAlertadas(uid);
    const { data } = await fetchClientAuraMessages(40);
    const pending = (data || [])
      .filter((m) => String(m.content_type || '') === 'cita_confirmacion')
      .filter((m) => !alertadas.includes(String(m.id)))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (pending[0]) await handleCitaConfirmacionMessage(pending[0]);
  }, [session?.user?.id, clienteRow?.id, handleCitaConfirmacionMessage]);

  useEffect(() => {
    if (session?.user?.id && clienteRow?.id) {
      void warmClientAuraThreadCache(clienteRow.id);
    }
  }, [session?.user?.id, clienteRow?.id]);

  useEffect(() => {
    refreshAuraUnread();
    if (!clienteRow?.id) return undefined;
    const onAuraInsert = async (row) => {
      if (!row) return;
      // Solo mensajes entrantes del salón (no los que envía el cliente).
      if (isInboundAuraUnread(row, session?.user?.id)) {
        setAuraUnread((prev) => Math.max(prev, 1));
      }
      if (row.content_type === 'cita_confirmacion') {
        await handleCitaConfirmacionMessage(row);
      }
    };

    const onAuraUpdate = (row) => {
      if (!row) return;
      // En UPDATE (ej: mensaje marcado delivered) sí sincronizar con DB
      void refreshAuraUnread();
    };

    const channel = supabase
      .channel(`aura-unread-${clienteRow.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketing_direct_messages',
          filter: `client_id=eq.${clienteRow.id}`,
        },
        (payload) => {
          void onAuraInsert(payload?.new);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'marketing_direct_messages',
          filter: `client_id=eq.${clienteRow.id}`,
        },
        (payload) => {
          onAuraUpdate(payload?.new);
        },
      )
      .subscribe();
    const iv = setInterval(() => {
      void refreshAuraUnread();
      void scanCitaConfirmacionAlerts();
    }, 45000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(iv);
    };
  }, [
    clienteRow?.id,
    refreshAuraUnread,
    handleCitaConfirmacionMessage,
    scanCitaConfirmacionAlerts,
  ]);

  useEffect(() => {
    refreshPedidosActivos();
    const userId = session?.user?.id;
    if (!hasSupabaseEnv || !userId) return undefined;
    const channel = supabase
      .channel(`client-pedidos-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ecommerce_orders',
          filter: `client_user_id=eq.${userId}`,
        },
        () => refreshPedidosActivos(),
      )
      .subscribe();
    const iv = setInterval(refreshPedidosActivos, 45000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(iv);
    };
  }, [session?.user?.id, refreshPedidosActivos]);

  const openTiendaCart = useCallback(() => {
    openSub(CLIENT_SUB.TIENDA, { tiendaPhase: 'cart', tiendaOpenKey: Date.now() });
  }, [openSub]);

  const closeSub = useCallback(() => {
    const wasPremios = openedSubRef.current === CLIENT_SUB.PREMIOS;
    openedSubRef.current = null;
    setOpenedSub(null);
    setSubPayload(null);
    void loadClientNotifPrefs(session?.user?.id ?? null).then(setNotifPrefs);
    void refreshAuraUnread();
    void refreshPedidosActivos();
    if (wasPremios) void refreshPremiosPointsAlert();
  }, [session?.user?.id, refreshAuraUnread, refreshPedidosActivos, refreshPremiosPointsAlert]);

  useEffect(() => {
    if (tab !== TABS.INICIO) return;
    void loadClientNotifPrefs(session?.user?.id ?? null).then(setNotifPrefs);
  }, [tab, session?.user?.id]);

  const openAuraLine = useCallback(() => {
    if (!session?.user) {
      Alert.alert('Andreas Pro', 'Iniciá sesión para ver mensajes del salón.');
      return;
    }
    openMensajesSub();
  }, [session?.user, openMensajesSub]);

  const handleHeroSlidePress = useCallback(
    async (slide) => {
      if (!slide) return;
      const invId = normalizeInventarioCarouselId(slide.inventarioId);
      let inventarioRow = null;

      if (invId && hasSupabaseEnv) {
        const { data } = await db.inventario.getById(invId);
        if (data) inventarioRow = data;
      }

      const tipo = resolveCarouselArticuloTipo(inventarioRow, slide.articuloTipo);

      if (tipo === 'producto') {
        openSub(CLIENT_SUB.TIENDA, {
          tiendaProductId: invId,
          tiendaPhase: invId ? 'detail' : 'catalog',
          tiendaAddToCart: false,
          tiendaOpenKey: Date.now(),
        });
        return;
      }

      if (tipo === 'servicio' && invId) {
        setTab(TABS.CITAS);
        setHighlightInventarioId(null);
        setTimeout(() => setHighlightInventarioId(invId), 0);
        return;
      }

      setTab(TABS.CITAS);
    },
    [openSub, hasSupabaseEnv],
  );

  useEffect(() => {
    if (!session?.user?.id) {
      setClienteRow(null);
      setPerfilMeta({ error: null });
      setPerfilLoading(false);
      return;
    }
    if (!hasSupabaseEnv) return;
    void (async () => {
      const row = await refreshClienteFicha(session.user.id, { showPerfilSpinner: true });
      if (!row) await ensureClienteFicha();
    })();
  }, [session?.user?.id, hasSupabaseEnv]);

  // Campanita en Premios cuando cambia el nivel de membresía
  const MEMBRESIA_SEEN_KEY = '@appsalon/clientes/membresia_nivel_seen';
  useEffect(() => {
    const nivel = clienteRow?.membresia_nivel;
    if (!nivel) return;
    void (async () => {
      const seen = await AsyncStorage.getItem(MEMBRESIA_SEEN_KEY);
      if (seen !== nivel) {
        setPremiosBadge(true);
      }
    })();
  }, [clienteRow?.membresia_nivel]);

  useEffect(() => {
    if (!hasSupabaseEnv || !clienteRow?.id) {
      setCitasRaw([]);
      return;
    }
    let alive = true;
    (async () => {
      setCitasLoading(true);
      try {
        await db.citas.syncVisitaQrCliente();
      } catch {
        /* RPC opcional hasta actualizar Supabase */
      }
      const { data, error } = await db.citas.getByCliente(clienteRow.id, { forClientApp: true });
      if (!alive) return;
      setCitasLoading(false);
      if (error || !Array.isArray(data)) {
        setCitasRaw([]);
        if (error) {
          console.warn('[clientes] citas.getByCliente', error.message);
        }
      } else {
        setCitasRaw(data);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hasSupabaseEnv, clienteRow?.id, citasNonce]);

  const citasPartition = useMemo(() => partitionCitasCliente(citasRaw), [citasRaw]);

  const { proximaCita, otrasProximas, pasadas, canceladasRechazadas } = citasPartition;

  useEffect(() => {
    if (tab !== TABS.CITAS) return;
    if (!hasSupabaseEnv || !clienteRow?.id) return;
    refreshCitas();
  }, [tab, hasSupabaseEnv, clienteRow?.id, refreshCitas]);

  useEffect(() => {
    if (tab !== TABS.HISTORIAL) return;
    if (!hasSupabaseEnv || !clienteRow?.id) return;
    refreshCitas();
  }, [tab, hasSupabaseEnv, clienteRow?.id, refreshCitas]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || !clienteRow?.id) return;
    void scanCitaConfirmacionAlerts();
  }, [session?.user?.id, clienteRow?.id, scanCitaConfirmacionAlerts]);

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    '—';

  const metaName =
    session?.user?.user_metadata?.full_name != null
      ? String(session.user.user_metadata.full_name).trim()
      : '';
  const profileFullName =
    clienteRow?.nombre || metaName || DEFAULT_PROFILE.fullName;
  const profileGreetingFirst =
    metaName ||
    clienteRow?.nombre?.trim()?.split(/\s+/)[0] ||
    DEFAULT_GREETING_NAME;
  const profileEmail =
    session?.user?.email || clienteRow?.email || DEFAULT_PROFILE.emailPlaceholder;

  const primaryHeader = (
    <ScreenHeader
      showHomeBar={tab === TABS.INICIO}
      searchValue={headerSearch}
      onSearchChange={setHeaderSearch}
      onCartPress={openTiendaCart}
      cartBadgeCount={cartCount}
      profileFirstName={
        tab === TABS.PERFIL ? profileGreetingFirst : undefined
      }
    />
  );

  const renderInicio = () => (
    <View style={styles.inicioShell}>
      <View style={[styles.inicioLayout, { paddingBottom: inicioTabBarPad }]}>
        <HeroImageCarousel
          slides={inicioHeroSlides}
          onSlideAction={handleHeroSlidePress}
          onAgendar={() => setTab(TABS.CITAS)}
          height={inicioHeroHeight}
        />

        <View style={styles.inicioBelowHero}>
          <QuickPosterGrid
            fillHeight
            items={[
                { id: 'mensajes',   label: 'Mensajes',   iconName: 'MessageCircle', sub: 'Andreas Pro · en vivo',         onPress: openAuraLine,                   bellBadge: auraUnread > 0 },
                { id: 'tienda',     label: 'Tienda',     iconName: 'ShoppingBag',   sub: 'Productos y kits profesionales', onPress: () => openSub(CLIENT_SUB.TIENDA) },
                { id: 'tendencias', label: 'Tendencias', iconName: 'Sparkles',      sub: 'Looks de temporada',             onPress: () => openSub(CLIENT_SUB.TENDENCIAS) },
                { id: 'premios',    label: 'Premios',    iconName: 'Award',         sub: 'Puntos, canjes y referidos',     onPress: () => { setPremiosBadge(false); setPremiosCanjeReady(false); void AsyncStorage.setItem(MEMBRESIA_SEEN_KEY, clienteRow?.membresia_nivel ?? ''); openSub(CLIENT_SUB.PREMIOS); void acknowledgePremiosProgress(); }, bellBadge: premiosBadge, prizeBadge: premiosCanjeReady },
                { id: 'pedidos',    label: 'Pedidos',    iconName: 'Package',       sub: 'Mis compras y estado',           onPress: openMisPedidosSub, badge: true, badgeCount: pedidosActivos },
                { id: 'citas',      label: 'Servicios',  iconName: 'Scissors',      sub: 'Elegí servicios y agendá',       onPress: () => setTab(TABS.CITAS) },
              ]}
          />
        </View>
      </View>
    </View>
  );

  const renderCitas = () => (
    <MisCitasTab
      hasSupabaseEnv={hasSupabaseEnv}
      scrollBottom={scrollBottom}
      contentPaddingTop={insets.top + spacing.sm}
      onOpenServiciosCart={openServiciosCart}
      onRefreshCitas={refreshCitas}
      highlightInventarioId={highlightInventarioId}
      onHighlightConsumed={() => setHighlightInventarioId(null)}
    />
  );

  const renderHistorial = () => (
    <HistorialCitasTab
      header={primaryHeader}
      proximaCita={proximaCita}
      otrasProximas={otrasProximas}
      pasadas={pasadas}
      canceladasRechazadas={canceladasRechazadas}
      citasLoading={citasLoading}
      hasSupabaseEnv={hasSupabaseEnv}
      clienteRow={clienteRow}
      scrollBottom={scrollBottom}
      contentPaddingTop={insets.top + spacing.sm}
      onRefreshCitas={refreshCitas}
      onGoTab={goTabFromSub}
    />
  );

  const renderPerfil = () => (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollInner,
        {
          paddingBottom: scrollBottom,
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {primaryHeader}

      <View style={styles.identityRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onAvatarTap}
          accessibilityRole="button"
          accessibilityLabel="Cambiar foto de perfil"
        >
          <View style={styles.avatarBig}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <User size={34} color={c.foregroundMuted} strokeWidth={1.7} />
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.identityText}>
          <Text style={styles.identityName}>{profileFullName}</Text>
          <Text style={styles.identityEmail}>{profileEmail}</Text>
          {clienteRow?.membresia_nivel ? (
            <View style={{ marginTop: spacing.xs }}>
              <MembresiaBadge nivel={clienteRow.membresia_nivel} />
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.profileMenuShell, styles.featureCard]}>
        <ProfileMenuRow
          icon={User}
          label="Editar perfil"
          onPress={() => openSub(CLIENT_SUB.EDITAR_PERFIL)}
        />
        <View style={styles.menuHairline} />
        <ProfileMenuRow
          icon={Bell}
          label="Eventos Profesionales"
          onPress={() => openSub(CLIENT_SUB.NOTIFICACIONES)}
        />
        <View style={styles.menuHairline} />
        <ProfileMenuRow
          icon={Gem}
          label="Membresías"
          onPress={() => openSub(CLIENT_SUB.MEMBRESIAS)}
        />
        <View style={styles.menuHairline} />
        <ProfileMenuRow
          icon={FileText}
          label="Mis facturas"
          onPress={() => openSub(CLIENT_SUB.MIS_FACTURAS)}
        />
        <View style={styles.menuHairline} />
        <ProfileMenuRow
          icon={Phone}
          label="Contacto"
          onPress={() => openSub(CLIENT_SUB.CONTACTO)}
        />
        <View style={styles.menuHairline} />
        <ProfileMenuRow
          icon={CreditCard}
          label="Métodos de pago"
          onPress={() => openSub(CLIENT_SUB.METODOS_PAGO)}
        />
        <View style={styles.menuHairline} />
        <ProfileMenuRow
          icon={Settings}
          label="Configuración"
          onPress={() => openSub(CLIENT_SUB.CONFIGURACION)}
        />
      </View>

      <TouchableOpacity
        style={styles.logoutPill}
        onPress={() => openSub(CLIENT_SUB.CERRAR_SESION)}
        activeOpacity={0.85}
      >
        <LogOut size={18} color={c.foreground} strokeWidth={1.75} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <ProfileConnectionCard
        session={session}
        perfilLoading={perfilLoading}
        perfilMeta={perfilMeta}
        clienteRow={clienteRow}
      />

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => openSub(CLIENT_SUB.PRIVACIDAD)}
      >
        <Text style={styles.linkBtnText}>Política de privacidad</Text>
      </TouchableOpacity>

      <Text style={styles.versionFoot}>
        Versión {appVersion} · Aura Salón
      </Text>
    </ScrollView>
  );

  let body;
  switch (tab) {
    case TABS.CITAS:
      body = renderCitas();
      break;
    case TABS.HISTORIAL:
      body = renderHistorial();
      break;
    case TABS.PERFIL:
      body = renderPerfil();
      break;
    default:
      body = renderInicio();
  }

  const subTitles = openedSub ? getSubScreenTitles(openedSub) : null;

  return (
    <View style={styles.container}>
      <StatusBar
        style={
          isDark || openedSub === CLIENT_SUB.TENDENCIAS ? 'light' : 'dark'
        }
        translucent
        backgroundColor="transparent"
      />
      {openedSub && subTitles ? (
        openedSub === CLIENT_SUB.TENDENCIAS ? (
          <View style={styles.tendenciasShell}>
            <ClientSubScreenBody
              screenId={openedSub}
              onClose={closeSub}
              onGoTab={goTabFromSub}
              privacyUrl={PRIVACY_URL}
              onLogout={onLogout}
              clienteRow={clienteRow}
              onCitasChanged={refreshCitas}
              sessionUser={session?.user ?? null}
              notifPrefs={notifPrefs}
              onNotifPrefChange={handleNotifPrefChange}
              onAuraUnreadChange={refreshAuraUnread}
              onClienteUpdated={() => {
                if (session?.user?.id) {
                  void refreshClienteFicha(session.user.id, { showPerfilSpinner: false });
                }
              }}
              onPromoAction={handlePromoAction}
              subPayload={subPayload}
              onPromoFollowUp={notifyPromoFollowUp}
              onOpenTienda={() => {
                closeSub();
                openSub(CLIENT_SUB.TIENDA);
              }}
              onPedidosChanged={handlePedidosChanged}
              onPrizeReady={handlePrizeReady}
              onPremiosCanjeNavigate={handlePremiosCanjeNavigate}
              onPremiosResumenLoaded={handlePremiosResumenLoaded}
            />
          </View>
        ) : (
          <SubScreenChrome
            title={subTitles.title}
            subtitle={subTitles.subtitle}
            onBack={closeSub}
            rightAction={
              openedSub === CLIENT_SUB.TIENDA ? (
                <TiendaCartButton onPress={openTiendaCart} />
              ) : null
            }
            disableBodyScroll={
              openedSub === CLIENT_SUB.MENSAJES ||
              openedSub === CLIENT_SUB.MIS_PEDIDOS ||
              openedSub === CLIENT_SUB.MIS_FACTURAS
            }
            bodyPaddingHorizontal={openedSub === CLIENT_SUB.MENSAJES ? 0 : undefined}
            bottomPadding={
              openedSub === CLIENT_SUB.MENSAJES || openedSub === CLIENT_SUB.MIS_PEDIDOS ? 0 : undefined
            }
            hideHeaderText={
              openedSub === CLIENT_SUB.MENSAJES || openedSub === CLIENT_SUB.TIENDA
            }
          >
            <ClientSubScreenBody
              screenId={openedSub}
              onClose={closeSub}
              onGoTab={goTabFromSub}
              privacyUrl={PRIVACY_URL}
              onLogout={onLogout}
              clienteRow={clienteRow}
              onCitasChanged={refreshCitas}
              sessionUser={session?.user ?? null}
              notifPrefs={notifPrefs}
              onNotifPrefChange={handleNotifPrefChange}
              onAuraUnreadChange={refreshAuraUnread}
              onClienteUpdated={() => {
                if (session?.user?.id) {
                  void refreshClienteFicha(session.user.id, { showPerfilSpinner: false });
                }
              }}
              onPromoAction={handlePromoAction}
              subPayload={subPayload}
              onPromoFollowUp={notifyPromoFollowUp}
              onOpenTienda={() => {
                closeSub();
                openSub(CLIENT_SUB.TIENDA);
              }}
              onPedidosChanged={handlePedidosChanged}
              onAgendarServicio={openAgendarServicio}
              onContinuarAgendarDesdeCarrito={openAgendarDesdeCarrito}
              onPrizeReady={handlePrizeReady}
              onPremiosCanjeNavigate={handlePremiosCanjeNavigate}
              onPremiosResumenLoaded={handlePremiosResumenLoaded}
            />
          </SubScreenChrome>
        )
      ) : (
        <>
          {body}
          <View style={styles.tabDock}>
            <BottomTabs
              items={TAB_ITEMS}
              activeId={tab}
              onChange={setTab}
              cartCount={cartCount}
              onCartPress={openTiendaCart}
            />
          </View>
        </>
      )}

      {/* Modal de celebración de premio */}
      <PremiosCelebrationModal
        visible={premiosCelebrationVisible}
        ruleId={premiosCelebrationRuleId}
        onVerPremio={() => {
          setPremiosCelebrationVisible(false);
          setPremiosCelebrationRuleId(null);
          setPremiosCanjeReady(false);
          openSub(CLIENT_SUB.PREMIOS);
        }}
        onDismiss={() => {
          setPremiosCelebrationVisible(false);
          setPremiosCelebrationRuleId(null);
        }}
      />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
  });

  const [gate, setGate] = useState({
    ready: false,
    phase: 'main',
    profile: null,
  });

  const enterAppAfterAuthUser = useCallback(async (user) => {
    if (!user) {
      setGate({ ready: true, phase: 'auth', profile: null });
      return;
    }
    const nom =
      (user.user_metadata?.full_name && String(user.user_metadata.full_name).trim()) ||
      user.email?.split('@')[0] ||
      'Cliente';
    await db.clientes.ensureFromAuth({
      userId: user.id,
      nombre: nom,
      email: user.email,
    });
    await clearLegacyLocalSession();
    const intro = await getIntroDone();
    const tour = await getTourDone();
    if (!intro) {
      const name =
        (user.user_metadata?.full_name && String(user.user_metadata.full_name).trim()) ||
        user.email?.split('@')[0] ||
        'Cliente';
      setGate({
        ready: true,
        phase: 'intro',
        profile: { name, email: user.email || '' },
      });
      return;
    }
    if (!tour) {
      setGate({ ready: true, phase: 'tour', profile: null });
      return;
    }
    setGate({ ready: true, phase: 'main', profile: null });
  }, []);

  const resolveGateAfterSession = useCallback(
    async (user) => {
      if (!user) {
        setGate({ ready: true, phase: 'auth', profile: null });
        return;
      }
      await enterAppAfterAuthUser(user);
    },
    [enterAppAfterAuthUser],
  );

  const handleAuthRedirectUrl = useCallback(
    async (url) => {
      if (!url || !hasSupabaseEnv) return;
      const { session, error } = await completeAuthFromRedirectUrl(url);
      if (error) {
        if (__DEV__) console.warn('[auth redirect]', error.message);
        Alert.alert(
          'Enlace de confirmación',
          error.message || 'No se pudo validar el enlace. Probá iniciar sesión.',
        );
        return;
      }
      if (session?.user) {
        await enterAppAfterAuthUser(session.user);
      }
    },
    [enterAppAfterAuthUser],
  );

  useEffect(() => {
    if (!fontsLoaded || !hasSupabaseEnv) return;
    Linking.getInitialURL().then((url) => {
      if (url) void handleAuthRedirectUrl(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleAuthRedirectUrl(url);
    });
    return () => sub.remove();
  }, [fontsLoaded, handleAuthRedirectUrl]);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (!hasSupabaseEnv) {
      setGate({ ready: true, phase: 'auth', profile: null });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { session: s },
          error: sessionErr,
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionErr && isInvalidRefreshTokenError(sessionErr)) {
          await supabase.auth.signOut({ scope: 'local' });
          setGate({ ready: true, phase: 'auth', profile: null });
          return;
        }
        await resolveGateAfterSession(s?.user ?? null);
      } catch (e) {
        if (__DEV__) console.warn('[auth gate]', e);
        if (!cancelled) {
          setGate({ ready: true, phase: 'auth', profile: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, resolveGateAfterSession]);

  useEffect(() => {
    if (!hasSupabaseEnv) return undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        setGate({ ready: true, phase: 'auth', profile: null });
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && s?.user) {
        void enterAppAfterAuthUser(s.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [enterAppAfterAuthUser]);

  const handleAuthSuccess = async (profile) => {
    setGate({ ready: true, phase: 'intro', profile: profile ?? null });
  };

  const handleIntroContinue = async () => {
    await setIntroDone();
    const tour = await getTourDone();
    setGate((g) => ({
      ...g,
      phase: tour ? 'main' : 'tour',
    }));
  };

  const handleTourDone = async () => {
    await setTourDone();
    setGate({ ready: true, phase: 'main', profile: null });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await clearLegacyLocalSession();
    setGate({ ready: true, phase: 'auth', profile: null });
  };

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ClientThemedRoot>
          {!fontsLoaded || (hasSupabaseEnv && !gate.ready) ? (
            <ThemeBoot />
          ) : !hasSupabaseEnv ? (
            <SupabaseConfigScreen />
          ) : gate.phase === 'auth' ? (
            <ClientAuthScreen onAuthSuccess={handleAuthSuccess} />
          ) : gate.phase === 'intro' ? (
            <PostLoginIntroScreen
              profile={gate.profile}
              onContinue={handleIntroContinue}
            />
          ) : gate.phase === 'tour' ? (
            <AppTourScreen onDone={handleTourDone} />
          ) : (
            <TiendaCartProvider>
              <ServiciosCartProvider>
                <AppMain onLogout={handleLogout} />
              </ServiciosCartProvider>
            </TiendaCartProvider>
          )}
        </ClientThemedRoot>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

/** Misma idea que App Salón: color de ventana / safe areas = tema (sin franjas blancas en oscuro). */
function ClientThemedRoot({ children }) {
  const { colors: c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {children}
    </View>
  );
}

function ThemeBoot() {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: themeColors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <ActivityIndicator color={themeColors.primary} size="large" />
    </View>
  );
}

function buildAppStyles(c) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  tendenciasShell: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: c.background,
  },
  scrollInner: {
    flexGrow: 1,
  },

  inicioShell: {
    flex: 1,
    backgroundColor: c.background,
  },
  inicioLayout: {
    flex: 1,
  },
  inicioHeaderSticky: {
    paddingHorizontal: spacing.lg,
    backgroundColor: c.background,
    zIndex: 2,
    elevation: 4,
  },
  inicioHeaderWrapTight: {
    marginBottom: 0,
  },

  inicioBelowHero: {
    flex: 1,
    minHeight: 0,
  },

  sectionBlock: {
    marginTop: 0,
    marginBottom: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionKickerGold: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: c.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  messagesIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  messagesBellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureCard: {
    backgroundColor: c.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: spacing.lg,
  },

  pageDisplay: {
    fontFamily: typography.fontDisplay,
    fontSize: 27,
    color: c.foreground,
    marginBottom: spacing.xs,
  },
  pageLead: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: c.foregroundMuted,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },

  detailCard: {
    backgroundColor: c.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: c.cardBorder,
    padding: spacing.lg,
  },
  citaRibbon: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: c.primary,
    marginBottom: spacing.sm,
  },
  citaTitulo: {
    fontFamily: typography.fontSansMedium,
    fontSize: 17,
    color: c.foreground,
  },
  citaStaff: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: c.foregroundMuted,
  },
  citaIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  citaIconCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  citaIconText: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: c.foreground,
  },

  duoBtns: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },

  emptyCitas: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  emptyOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.iconCircleBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitulo: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: c.foregroundMuted,
    textAlign: 'center',
  },

  historyCard: {
    backgroundColor: c.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: c.cardBorder,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  historyRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyEstado: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    color: c.foregroundMuted,
  },
  historyEstadoGold: {
    color: c.primary,
  },
  historyService: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: c.foreground,
    flex: 1,
  },
  historyPrice: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: c.foreground,
  },
  historyMeta: {
    marginTop: spacing.sm,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: c.foregroundMuted,
    lineHeight: 18,
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatarBig: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: c.avatarCircleBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  identityText: {
    flex: 1,
    justifyContent: 'center',
  },
  identityName: {
    fontFamily: typography.fontSansMedium,
    fontSize: 18,
    color: c.foreground,
    marginBottom: 4,
  },
  identityEmail: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: c.foregroundSubtle,
  },

  profileMenuShell: {
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    borderRadius: 26,
  },
  menuHairline: {
    height: 1,
    backgroundColor: c.cardBorder,
    marginHorizontal: spacing.xs + 26,
  },

  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: c.cardBorder,
    backgroundColor: c.card,
    marginBottom: spacing.lg,
  },
  logoutText: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: c.foreground,
  },
  linkBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  linkBtnText: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: c.foregroundMuted,
    textDecorationLine: 'underline',
  },
  versionFoot: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: c.foregroundSubtle,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
}
