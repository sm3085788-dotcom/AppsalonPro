import { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  supabase,
  db,
  isInvalidRefreshTokenError,
  uploadClientePhotoFromUri,
  fetchClientAuraUnreadCount,
  sendClientAuraChat,
  buildBroadcastActionMessage,
  BROADCAST_PROMO_ACTIONS,
  parseBroadcastContent,
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
  LuxuryImageCarousel,
} from './components/luxury';
import { CLIENT_SUB } from './navigation/clientSubScreens';
import { getSubScreenTitles } from './navigation/clientSubScreensMeta';
import { ClientSubScreenBody } from './screens/ClientSubScreenBody';
import { MisCitasTab } from './components/citas/MisCitasTab';
import { HistorialCitasTab } from './components/citas/HistorialCitasTab';
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
  getCitaConfirmadaAlertadas,
  addCitaConfirmadaAlertadas,
} from './utils/historialCitaAlerts';
import { partitionCitasCliente } from './utils/citasLabels';
import * as Linking from 'expo-linking';
import { PostLoginIntroScreen } from './onboarding/PostLoginIntroScreen';
import { AppTourScreen } from './onboarding/AppTourScreen';
import {
  DEFAULT_PROFILE,
  DEFAULT_GREETING_NAME,
  QUICK_ACCESS,
} from './data/luxuryUiMocks';
import {
  PUBLICIDAD_SLIDES,
} from './data/remoteHeroImages';

const PRIVACY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL ??
  'https://appsalon-pro-web-catalogo.vercel.app/privacidad';

const hasSupabaseEnv = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim(),
);

/** `marketing_posts` con `audience === 'home_carousel'`: overlay en JSON en `body`. */
function mapHomeCarouselPostToSlide(row) {
  const id = String(row.id);
  const uri = row.media_url;
  let kicker = 'Publicidad';
  let headline = row.title || 'Promoción';
  let bodyText = '';
  let priceLabel;
  let buttonTitle = 'Ver más';
  const raw = String(row.body || '').trim();
  let inventarioId = null;
  if (raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        if (o.kicker) kicker = String(o.kicker);
        if (o.headline) headline = String(o.headline);
        if (o.body != null) bodyText = String(o.body);
        if (o.priceLabel) priceLabel = String(o.priceLabel);
        if (o.buttonTitle) buttonTitle = String(o.buttonTitle);
        if (o.inventarioId != null) inventarioId = Number(o.inventarioId);
      }
    } catch {
      bodyText = raw;
    }
  } else {
    bodyText = raw;
  }
  if (inventarioId) buttonTitle = buttonTitle || 'Ver servicio';
  return {
    id,
    uri,
    caption: headline,
    kicker,
    headline,
    body: bodyText,
    priceLabel,
    buttonTitle,
    inventarioId: Number.isFinite(inventarioId) ? inventarioId : null,
  };
}

/** `marketing_posts` con `audience === 'home_hero'`: carrusel «Reserva tu cita». */
function mapHomeHeroPostToSlide(row) {
  const id = String(row.id);
  const uri = row.media_url;
  let kicker = 'Tu próxima experiencia';
  let headline = row.title || 'Reserva tu cita';
  let bodyText = 'Descubre el arte de la belleza con nuestros estilistas expertos.';
  let buttonTitle = 'Agendar ahora';
  const raw = String(row.body || '').trim();
  if (raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        if (o.kicker) kicker = String(o.kicker);
        if (o.headline) headline = String(o.headline);
        if (o.body != null) bodyText = String(o.body);
        if (o.buttonTitle) buttonTitle = String(o.buttonTitle);
      }
    } catch {
      bodyText = raw;
    }
  } else if (raw) {
    bodyText = raw;
  }
  return {
    id,
    uri,
    caption: headline,
    kicker,
    headline,
    body: bodyText,
    buttonTitle,
  };
}

const TABS = {
  INICIO: 'inicio',
  CITAS: 'citas',
  HISTORIAL: 'historial',
  PERFIL: 'perfil',
};

const TAB_ITEMS = [
  { id: TABS.INICIO, label: 'Inicio', icon: Sparkles },
  { id: TABS.CITAS, label: 'Mis citas', icon: Calendar },
  { id: TABS.HISTORIAL, label: 'Historial', icon: Clock },
  { id: TABS.PERFIL, label: 'Perfil', icon: User },
];

function paddingForTabBar(insets) {
  return tabBarLayout.height + Math.max(insets.bottom, 10) + spacing.md;
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
  const scrollBottom = paddingForTabBar(insets);
  const [tab, setTab] = useState(TABS.INICIO);
  const [highlightInventarioId, setHighlightInventarioId] = useState(null);
  const [session, setSession] = useState(null);
  const [clienteRow, setClienteRow] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilMeta, setPerfilMeta] = useState({ error: null });

  const [headerSearch, setHeaderSearch] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [inicioPubSlides, setInicioPubSlides] = useState(PUBLICIDAD_SLIDES);
  const [inicioHeroSlides, setInicioHeroSlides] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_CLIENT_NOTIF_PREFS);
  const [auraUnread, setAuraUnread] = useState(0);
  const [pedidosActivos, setPedidosActivos] = useState(0);
  const { cartCount } = useTiendaCart();
  const [openedSub, setOpenedSub] = useState(null);
  const [subPayload, setSubPayload] = useState(null);
  const openSub = useCallback((id, payload = null) => {
    setSubPayload(payload);
    setOpenedSub(id);
  }, []);

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
        openSub(CLIENT_SUB.TIENDA, {
          ...payload,
          tiendaProductId: parsed.linkType === 'product' ? parsed.linkId : null,
        });
        return;
      }

      if (action === BROADCAST_PROMO_ACTIONS.BOOK) {
        openSub(CLIENT_SUB.AGENDAR_FLUJO, {
          ...payload,
          agendarServicioNombre: parsed.linkType === 'service' ? parsed.linkName : null,
        });
      }
    },
    [notifyPromoFollowUp, openSub],
  );

  const goTabFromSub = useCallback((slug) => {
    if (slug === 'inicio') setTab(TABS.INICIO);
    else if (slug === 'citas') setTab(TABS.CITAS);
    else if (slug === 'historial') setTab(TABS.HISTORIAL);
    else if (slug === 'perfil') setTab(TABS.PERFIL);
    setOpenedSub(null);
    setSubPayload(null);
  }, []);

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
      await refreshClienteFicha(session.user.id);
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
      const { data, error } = await db.marketingPosts.getPublishedHomeCarousel(15);
      if (!alive) return;
      if (error) {
        if (__DEV__) {
          console.warn('[Inicio] Carrusel Supabase:', error.message);
        }
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        setInicioPubSlides(data.map(mapHomeCarouselPostToSlide));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv) return;
    let alive = true;
    (async () => {
      const { data, error } = await db.marketingPosts.getPublishedHomeHero(15);
      if (!alive) return;
      if (error) {
        if (__DEV__) {
          console.warn('[Inicio] Hero Supabase:', error.message);
        }
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        setInicioHeroSlides(data.map(mapHomeHeroPostToSlide));
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

  const refreshClienteFicha = useCallback(async (userId) => {
    if (!hasSupabaseEnv || !userId) {
      setClienteRow(null);
      return null;
    }
    setPerfilLoading(true);
    setPerfilMeta({ error: null });
    const { data, error } = await db.clientes.getByUserId(userId);
    setPerfilLoading(false);
    if (error) {
      setClienteRow(null);
      setPerfilMeta({ error: error.message });
      return null;
    }
    setClienteRow(data ?? null);
    setPerfilMeta({ error: null });
    if (data?.photo_url) {
      setAvatarUri(data.photo_url);
    }
    return data ?? null;
  }, []);

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

  const refreshAuraUnread = useCallback(async () => {
    if (!hasSupabaseEnv || !clienteRow?.id || !notifPrefs.mensajes) {
      setAuraUnread(0);
      return;
    }
    const { count } = await fetchClientAuraUnreadCount();
    setAuraUnread(count || 0);
  }, [clienteRow?.id, notifPrefs.mensajes]);

  const refreshPedidosActivos = useCallback(async () => {
    const userId = session?.user?.id;
    if (!hasSupabaseEnv || !userId) {
      setPedidosActivos(0);
      return;
    }
    const { data, error } = await db.orders.getByCliente(userId);
    if (error) return;
    setPedidosActivos(countActivePedidos(data));
  }, [session?.user?.id]);

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

  useEffect(() => {
    refreshAuraUnread();
    if (!clienteRow?.id || !notifPrefs.mensajes) return undefined;
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
        () => refreshAuraUnread(),
      )
      .subscribe();
    const iv = setInterval(refreshAuraUnread, 45000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(iv);
    };
  }, [clienteRow?.id, notifPrefs.mensajes, refreshAuraUnread]);

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
    setOpenedSub(null);
    setSubPayload(null);
    void loadClientNotifPrefs(session?.user?.id ?? null).then(setNotifPrefs);
    void refreshAuraUnread();
    void refreshPedidosActivos();
  }, [session?.user?.id, refreshAuraUnread, refreshPedidosActivos]);

  useEffect(() => {
    if (tab !== TABS.INICIO) return;
    void loadClientNotifPrefs(session?.user?.id ?? null).then(setNotifPrefs);
  }, [tab, session?.user?.id]);

  const openAuraLine = useCallback(async () => {
    if (!session?.user) {
      Alert.alert('Andreas Pro', 'Iniciá sesión para ver mensajes del salón.');
      return;
    }
    if (hasSupabaseEnv && !clienteRow?.id) {
      await ensureClienteFicha();
    }
    openSub(CLIENT_SUB.MENSAJES);
  }, [session?.user, hasSupabaseEnv, clienteRow?.id, ensureClienteFicha, openSub]);

  const handleCarouselServicio = useCallback((slide) => {
    if (!slide) return;
    if (slide.inventarioId) {
      setHighlightInventarioId(slide.inventarioId);
      setTab(TABS.CITAS);
      return;
    }
    setTab(TABS.CITAS);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setClienteRow(null);
      setPerfilMeta({ error: null });
      setPerfilLoading(false);
      return;
    }
    if (!hasSupabaseEnv) return;
    void (async () => {
      const row = await refreshClienteFicha(session.user.id);
      if (!row) await ensureClienteFicha();
    })();
  }, [session?.user?.id, hasSupabaseEnv, refreshClienteFicha, ensureClienteFicha]);

  useEffect(() => {
    if (!hasSupabaseEnv || !clienteRow?.id) {
      setCitasRaw([]);
      return;
    }
    let alive = true;
    (async () => {
      setCitasLoading(true);
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

  const { proximaCita, otrasProximas, pasadas, canceladasFuturas } = citasPartition;

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
    if (!uid || !Array.isArray(citasRaw) || !citasRaw.length) return;
    let cancelled = false;
    (async () => {
      const confirmados = citasRaw.filter(
        (c) => String(c.estado || '').trim().toLowerCase() === 'confirmado' && c.id != null,
      );
      if (!confirmados.length) return;
      const ya = await getCitaConfirmadaAlertadas(uid);
      if (cancelled) return;
      const setYa = new Set(ya);
      const nuevos = confirmados.filter((c) => !setYa.has(String(c.id)));
      if (!nuevos.length) return;
      const lineas = nuevos.slice(0, 3).map((c) => {
        const fh = new Date(c.fecha_hora).toLocaleString('es-GT', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `· ${c.servicio || 'Cita'} — ${fh}`;
      });
      const more =
        nuevos.length > 3 ? `\n…y ${nuevos.length - 3} más. Revisá Historial.` : '';
      const body =
        nuevos.length === 1
          ? `El salón confirmó tu cita en App Salón: ${String(lineas[0] || '').replace(/^· /, '')}.`
          : `El salón confirmó ${nuevos.length} citas en App Salón:\n${lineas.join('\n')}${more}`;
      Alert.alert('Cita confirmada', body, [{ text: 'OK' }]);
      await addCitaConfirmadaAlertadas(uid, nuevos.map((c) => c.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, citasRaw]);

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
      <View
        style={[
          styles.inicioHeaderSticky,
          {
            paddingTop: insets.top + spacing.sm,
          },
        ]}
      >
        <ScreenHeader
          showHomeBar
          searchValue={headerSearch}
          onSearchChange={setHeaderSearch}
          onCartPress={openTiendaCart}
          cartBadgeCount={cartCount}
          wrapStyle={styles.inicioHeaderWrapTight}
        />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          {
            paddingBottom: scrollBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HeroImageCarousel slides={inicioHeroSlides} onAgendar={() => setTab(TABS.CITAS)} />

        <View style={styles.inicioBelowHero}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionKickerGold, { marginBottom: 0 }]}>Acceso rápido</Text>
              {notifPrefs.mensajes ? (
                <TouchableOpacity
                  style={[styles.messagesIconBtn, { borderColor: c.cardBorder, backgroundColor: c.card }]}
                  onPress={openAuraLine}
                  accessibilityRole="button"
                  accessibilityLabel="Mensajes Andreas Pro"
                  activeOpacity={0.85}
                >
                  <MessageCircle size={22} color={c.primary} strokeWidth={2} />
                  {auraUnread > 0 ? (
                    <View style={[styles.messagesBadge, { backgroundColor: c.error }]}>
                      <Text style={[styles.messagesBadgeTxt, { color: '#FFFFFF' }]}>
                        {auraUnread > 9 ? '9+' : auraUnread}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ) : null}
            </View>
            <QuickAccessRow
              icon={Store}
              title="Tienda"
              subtitle={QUICK_ACCESS.tiendaSubtitle}
              onPress={() => openSub(CLIENT_SUB.TIENDA)}
            />
            <QuickAccessRow
              icon={Flame}
              title="Tendencias"
              subtitle={QUICK_ACCESS.tendenciasSubtitle}
              onPress={() => openSub(CLIENT_SUB.TENDENCIAS)}
            />
            <QuickAccessRow
              icon={Award}
              title="Premios"
              subtitle={QUICK_ACCESS.premiosSubtitle}
              onPress={() => openSub(CLIENT_SUB.PREMIOS)}
            />
            <QuickAccessRow
              icon={Package}
              title="Pedidos"
              subtitle={QUICK_ACCESS.pedidosSubtitle}
              badgeCount={pedidosActivos}
              badgeTone="green"
              onPress={() => openSub(CLIENT_SUB.MIS_PEDIDOS)}
            />
          </View>
        </View>

        <View style={styles.featuredWrap}>
          <LuxuryImageCarousel
            slides={inicioPubSlides}
            perSlideOverlay
            overlayKicker="Publicidad"
            headline="Promociones"
            body=""
            buttonTitle="Ver servicio"
            buttonVariant="heroGold"
            onButtonPress={handleCarouselServicio}
            showAdvanceArrow={inicioPubSlides.length > 1}
            edgeToEdge
            squareCorners
            autoAdvance={false}
            height={240}
            containerStyle={{ marginTop: 0 }}
          />
        </View>
      </ScrollView>
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
      canceladasFuturas={canceladasFuturas}
      citasLoading={citasLoading}
      hasSupabaseEnv={hasSupabaseEnv}
      clienteRow={clienteRow}
      scrollBottom={scrollBottom}
      contentPaddingTop={insets.top + spacing.sm}
      onRefreshCitas={refreshCitas}
      onVerHistorialCompleto={() => openSub(CLIENT_SUB.HISTORIAL_COMPLETO)}
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
          label="Notificaciones"
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
      />
      {openedSub && subTitles ? (
        openedSub === CLIENT_SUB.TENDENCIAS ? (
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
              if (session?.user?.id) void refreshClienteFicha(session.user.id);
            }}
            onPromoAction={handlePromoAction}
            subPayload={subPayload}
            onPromoFollowUp={notifyPromoFollowUp}
            onOpenTienda={() => {
              closeSub();
              openSub(CLIENT_SUB.TIENDA);
            }}
            onPedidosChanged={refreshPedidosActivos}
          />
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
              openedSub === CLIENT_SUB.MENSAJES || openedSub === CLIENT_SUB.MIS_PEDIDOS
            }
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
                if (session?.user?.id) void refreshClienteFicha(session.user.id);
              }}
              onPromoAction={handlePromoAction}
              subPayload={subPayload}
              onPromoFollowUp={notifyPromoFollowUp}
              onOpenTienda={() => {
                closeSub();
                openSub(CLIENT_SUB.TIENDA);
              }}
              onPedidosChanged={refreshPedidosActivos}
              onAgendarServicio={openAgendarServicio}
              onContinuarAgendarDesdeCarrito={openAgendarDesdeCarrito}
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
            />
          </View>
        </>
      )}
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
    paddingHorizontal: spacing.lg,
  },

  sectionBlock: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
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
  messagesBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  messagesBadgeTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
  },

  featuredWrap: {
    marginTop: spacing.lg,
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
