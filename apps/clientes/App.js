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
} from 'lucide-react-native';
import { supabase, db, uploadClientePhotoFromUri } from '@appsalon/shared-config';
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
  clearLocalOnboarding,
  clearLocalProfile,
  getLocalProfile,
  getIntroDone,
  getTourDone,
} from './onboarding/onboardingStorage';
import { ClientAuthScreen } from './onboarding/ClientAuthScreen';
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
  if (raw.startsWith('{')) {
    try {
      const o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        if (o.kicker) kicker = String(o.kicker);
        if (o.headline) headline = String(o.headline);
        if (o.body != null) bodyText = String(o.body);
        if (o.priceLabel) priceLabel = String(o.priceLabel);
        if (o.buttonTitle) buttonTitle = String(o.buttonTitle);
      }
    } catch {
      bodyText = raw;
    }
  } else {
    bodyText = raw;
  }
  return {
    id,
    uri,
    caption: headline,
    kicker,
    headline,
    body: bodyText,
    priceLabel,
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

function AppMain({ localProfile, onLogout }) {
  const insets = useSafeAreaInsets();
  const scrollBottom = paddingForTabBar(insets);
  const [tab, setTab] = useState(TABS.INICIO);
  const [session, setSession] = useState(null);
  const [clienteRow, setClienteRow] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilMeta, setPerfilMeta] = useState({ error: null });

  const [headerSearch, setHeaderSearch] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [inicioPubSlides, setInicioPubSlides] = useState(PUBLICIDAD_SLIDES);
  const [openedSub, setOpenedSub] = useState(null);
  const closeSub = useCallback(() => setOpenedSub(null), []);
  const openSub = useCallback((id) => setOpenedSub(id), []);
  const goTabFromSub = useCallback((slug) => {
    if (slug === 'inicio') setTab(TABS.INICIO);
    else if (slug === 'citas') setTab(TABS.CITAS);
    else if (slug === 'historial') setTab(TABS.HISTORIAL);
    else if (slug === 'perfil') setTab(TABS.PERFIL);
    setOpenedSub(null);
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
      const { data, error } = await db.marketingPosts.getPublishedHomeCarousel(20);
      if (!alive) return;
      if (!error && Array.isArray(data) && data.length > 0) {
        setInicioPubSlides(data.map(mapHomeCarouselPostToSlide));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv) return undefined;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
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
      const { data, error } = await db.citas.getByCliente(clienteRow.id);
      if (!alive) return;
      setCitasLoading(false);
      if (error || !Array.isArray(data)) {
        setCitasRaw([]);
      } else {
        setCitasRaw(data);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hasSupabaseEnv, clienteRow?.id, citasNonce]);

  const { proximaCita, historialRows } = useMemo(() => {
    const now = Date.now();
    const rows = Array.isArray(citasRaw) ? [...citasRaw] : [];
    rows.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    const upcoming = rows.filter((c) => new Date(c.fecha_hora).getTime() >= now - 60_000);
    const next = upcoming[0] || null;
    const past = rows
      .filter((c) => new Date(c.fecha_hora).getTime() < now)
      .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
    return { proximaCita: next, historialRows: past };
  }, [citasRaw]);

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    '—';

  const metaName =
    session?.user?.user_metadata?.full_name != null
      ? String(session.user.user_metadata.full_name).trim()
      : '';
  const profileFullName =
    clienteRow?.nombre || metaName || localProfile?.name || DEFAULT_PROFILE.fullName;
  const profileGreetingFirst =
    metaName ||
    clienteRow?.nombre?.trim()?.split(/\s+/)[0] ||
    localProfile?.name?.trim()?.split(/\s+/)[0] ||
    DEFAULT_GREETING_NAME;
  const profileEmail =
    session?.user?.email || clienteRow?.email || localProfile?.email || DEFAULT_PROFILE.emailPlaceholder;

  const primaryHeader = (
    <ScreenHeader
      showHomeBar={tab === TABS.INICIO}
      searchValue={headerSearch}
      onSearchChange={setHeaderSearch}
      onCartPress={() => openSub(CLIENT_SUB.CARRITO)}
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
          onCartPress={() => openSub(CLIENT_SUB.CARRITO)}
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
        <HeroImageCarousel onAgendar={() => setTab(TABS.CITAS)} />

        <View style={styles.inicioBelowHero}>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionKickerGold}>Acceso rápido</Text>
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
              onPress={() => openSub(CLIENT_SUB.CARRITO)}
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
            buttonTitle="Ver más"
            buttonVariant="heroGold"
            fullWidthButton
            onButtonPress={() => openSub(CLIENT_SUB.TIENDA)}
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
      <Text style={styles.pageDisplay}>Mis citas</Text>
      <Text style={styles.pageLead}>
        Gestiona tus próximas reservaciones
      </Text>

      {citasLoading && hasSupabaseEnv ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={c.primary} />
      ) : proximaCita ? (
        <View style={styles.detailCard}>
          <Text style={styles.citaRibbon}>• Próxima cita</Text>
          <Text style={styles.citaTitulo}>{proximaCita.servicio}</Text>
          <Text style={styles.citaStaff}>
            {proximaCita.empleado?.nombre
              ? `Con ${proximaCita.empleado.nombre}`
              : 'Profesional por confirmar'}
          </Text>
          <View style={styles.citaIconsRow}>
            <View style={styles.citaIconCell}>
              <Calendar size={18} color={c.foreground} strokeWidth={1.7} />
              <Text style={styles.citaIconText}>
                {new Date(proximaCita.fecha_hora).toLocaleDateString('es-GT', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.citaIconCell}>
              <Clock size={18} color={c.foreground} strokeWidth={1.7} />
              <Text style={styles.citaIconText}>
                {new Date(proximaCita.fecha_hora).toLocaleTimeString('es-GT', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.detailCard}>
          <Text style={styles.citaRibbon}>• Próxima cita</Text>
          <Text style={[styles.citaStaff, { marginTop: spacing.sm }]}>
            {hasSupabaseEnv && session?.user && !clienteRow
              ? 'No encontramos tu ficha de cliente. Pedí en recepción que enlacen tu cuenta con el salón.'
              : 'No tenés una cita agendada por ahora.'}
          </Text>
        </View>
      )}

      <View style={styles.duoBtns}>
        <SalonButton
          variant="outlineGray"
          title="Reprogramar"
          style={{ flex: 1 }}
          fullWidth
          onPress={() => openSub(CLIENT_SUB.REPROGRAMAR_CITA)}
        />
        <SalonButton
          variant="solidGold"
          title="Confirmar"
          style={{ flex: 1 }}
          fullWidth
          onPress={() => openSub(CLIENT_SUB.CONFIRMAR_CITA)}
        />
      </View>

      <View style={styles.emptyCitas}>
        <View style={styles.emptyOrb}>
          <Calendar size={28} color={c.foregroundSubtle} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitulo}>No tienes más citas programadas</Text>
        <SalonButton
          variant="mutedFill"
          title="Agendar nueva cita"
          fullWidth
          onPress={() => openSub(CLIENT_SUB.AGENDAR_FLUJO)}
          style={{ marginTop: spacing.md }}
          textStyle={{ fontSize: 14 }}
        />
      </View>
    </ScrollView>
  );

  const renderHistorial = () => (
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
      <Text style={styles.pageDisplay}>Historial</Text>
      <Text style={styles.pageLead}>Tus visitas anteriores</Text>

      {citasLoading && hasSupabaseEnv ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={c.primary} />
      ) : historialRows.length > 0 ? (
        historialRows.map((h) => (
          <View key={h.id} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <Text style={styles.historyService}>{h.servicio}</Text>
              <Text style={styles.historyPrice}>{formatGtq(h.precio)}</Text>
            </View>
            <Text style={styles.historyMeta}>
              {new Date(h.fecha_hora).toLocaleDateString('es-GT', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {h.empleado?.nombre ? ` · ${h.empleado.nombre}` : ''}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[styles.pageLead, { marginBottom: spacing.md }]}>
          Todavía no hay visitas registradas en tu historial.
        </Text>
      )}

      <SalonButton
        variant="outlineGray"
        title="Ver historial completo"
        fullWidth
        onPress={() => openSub(CLIENT_SUB.HISTORIAL_COMPLETO)}
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
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
        hasSupabaseEnv={hasSupabaseEnv}
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
            onClienteUpdated={() => {
              if (session?.user?.id) void refreshClienteFicha(session.user.id);
            }}
          />
        ) : (
          <SubScreenChrome
            title={subTitles.title}
            subtitle={subTitles.subtitle}
            onBack={closeSub}
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
              onClienteUpdated={() => {
                if (session?.user?.id) void refreshClienteFicha(session.user.id);
              }}
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

  useEffect(() => {
    if (!fontsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        if (hasSupabaseEnv) {
          const {
            data: { session: s },
          } = await supabase.auth.getSession();
          if (cancelled) return;
          if (!s?.user) {
            setGate({ ready: true, phase: 'auth', profile: null });
            return;
          }
          const intro = await getIntroDone();
          const tour = await getTourDone();
          if (!intro) {
            const name =
              (s.user.user_metadata?.full_name &&
                String(s.user.user_metadata.full_name).trim()) ||
              s.user.email?.split('@')[0] ||
              'Cliente';
            setGate({
              ready: true,
              phase: 'intro',
              profile: { name, email: s.user.email || '' },
            });
            return;
          }
          if (!tour) {
            setGate({ ready: true, phase: 'tour', profile: null });
            return;
          }
          setGate({ ready: true, phase: 'main', profile: null });
          return;
        }

        const local = await getLocalProfile();
        const intro = await getIntroDone();
        const tour = await getTourDone();
        if (cancelled) return;
        if (!local) {
          setGate({ ready: true, phase: 'auth', profile: null });
          return;
        }
        if (!intro) {
          setGate({ ready: true, phase: 'intro', profile: local });
          return;
        }
        if (!tour) {
          setGate({ ready: true, phase: 'tour', profile: local });
          return;
        }
        setGate({ ready: true, phase: 'main', profile: local });
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
  }, [fontsLoaded]);

  useEffect(() => {
    if (!hasSupabaseEnv) return undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setGate({ ready: true, phase: 'auth', profile: null });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
    const profile = await getLocalProfile();
    setGate({ ready: true, phase: 'main', profile });
  };

  const handleLogout = async () => {
    if (hasSupabaseEnv) {
      await supabase.auth.signOut();
      await clearLocalProfile();
    } else {
      await clearLocalOnboarding();
    }
    setGate({ ready: true, phase: 'auth', profile: null });
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {!fontsLoaded || !gate.ready ? (
          <ThemeBoot />
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
          <AppMain
            localProfile={gate.profile}
            onLogout={handleLogout}
          />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
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
  sectionKickerGold: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: c.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
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
