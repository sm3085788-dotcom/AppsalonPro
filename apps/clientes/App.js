import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react-native';
import { supabase } from '@appsalon/shared-config';
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
  colors,
  spacing,
  typography,
  radii,
  tabBarLayout,
} from '@appsalon/design-tokens';
import {
  DEMO_PROFILE,
  DEMO_FIRST_NAME,
  QUICK_ACCESS,
  MOCK_PROXIMA_CITA,
  MOCK_HISTORIAL,
  FEATURED_SERVICE,
} from './data/luxuryUiMocks';
import {
  FEATURED_BALAYAGE_SLIDES,
  TRENDS_WATERMARK_URI,
  REWARDS_WATERMARK_URI,
  ORDERS_WATERMARK_URI,
} from './data/remoteHeroImages';

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
  { id: TABS.CITAS, label: 'Mis citas', icon: Calendar },
  { id: TABS.HISTORIAL, label: 'Historial', icon: Clock },
  { id: TABS.PERFIL, label: 'Perfil', icon: User },
];

function paddingForTabBar(insets) {
  return tabBarLayout.height + Math.max(insets.bottom, 10) + spacing.md;
}

function ProfileMenuRow({ icon: Icon, label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.profileMenuRow}
      onPress={onPress ?? (() => {})}
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      <Icon size={20} color={colors.foreground} strokeWidth={1.75} />
      <Text style={styles.profileMenuLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function AppMain() {
  const insets = useSafeAreaInsets();
  const scrollBottom = paddingForTabBar(insets);
  const [tab, setTab] = useState(TABS.INICIO);
  const [session, setSession] = useState(null);
  const [clienteRow, setClienteRow] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilMeta, setPerfilMeta] = useState({ error: null });

  const [headerSearch, setHeaderSearch] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
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

  const pickAvatar = useCallback(async (source) => {
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
          setAvatarUri(res.assets[0].uri);
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
        setAvatarUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('No se pudo abrir la cámara o la galería');
    }
  }, []);

  const onAvatarTap = useCallback(() => {
    Alert.alert('Foto de perfil', 'Elige cómo cargar tu imagen.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => pickAvatar('camera') },
      { text: 'Galería', onPress: () => pickAvatar('library') },
    ]);
  }, [pickAvatar]);

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
      return;
    }
    setPerfilLoading(true);
    setPerfilMeta({ error: null });
    const { data, error } = await supabase
      .from('clientes')
      .select('nombre,email')
      .eq('user_id', userId)
      .maybeSingle();
    setPerfilLoading(false);
    if (error) {
      setClienteRow(null);
      setPerfilMeta({ error: error.message });
      return;
    }
    setClienteRow(data ?? null);
    setPerfilMeta({ error: null });
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setClienteRow(null);
      setPerfilMeta({ error: null });
      setPerfilLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (tab !== TABS.PERFIL || !session?.user?.id) {
      if (tab !== TABS.PERFIL) setPerfilLoading(false);
      return;
    }
    refreshClienteFicha(session.user.id);
  }, [tab, session?.user?.id, refreshClienteFicha]);

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    '—';

  const profileFullName = clienteRow?.nombre ?? DEMO_PROFILE.fullName;
  const profileGreetingFirst =
    clienteRow?.nombre?.trim()?.split(/\s+/)[0] ?? DEMO_FIRST_NAME;
  const profileEmail =
    session?.user?.email ?? clienteRow?.email ?? DEMO_PROFILE.emailPlaceholder;

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

      <HeroImageCarousel onAgendar={() => setTab(TABS.CITAS)} />

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionKickerGold}>Acceso rápido</Text>
        <QuickAccessRow
          icon={Store}
          title="Tienda"
          subtitle={QUICK_ACCESS.tiendaSubtitle}
          onPress={() => openSub(CLIENT_SUB.TIENDA)}
          shoppingWatermark
        />
        <QuickAccessRow
          icon={Flame}
          title="Tendencias"
          subtitle={QUICK_ACCESS.tendenciasSubtitle}
          onPress={() => openSub(CLIENT_SUB.TENDENCIAS)}
          watermarkUri={TRENDS_WATERMARK_URI}
        />
        <QuickAccessRow
          icon={Award}
          title="Premios"
          subtitle={QUICK_ACCESS.premiosSubtitle}
          onPress={() => openSub(CLIENT_SUB.PREMIOS)}
          watermarkUri={REWARDS_WATERMARK_URI}
        />
        <QuickAccessRow
          icon={Package}
          title="Pedidos"
          subtitle={QUICK_ACCESS.pedidosSubtitle}
          onPress={() => openSub(CLIENT_SUB.CARRITO)}
          watermarkUri={ORDERS_WATERMARK_URI}
        />
      </View>

      <View style={styles.featuredWrap}>
        <LuxuryImageCarousel
          slides={FEATURED_BALAYAGE_SLIDES}
          overlayKicker="Servicios destacados"
          headline={FEATURED_SERVICE.titulo}
          body={FEATURED_SERVICE.descripcion}
          priceLabel={FEATURED_SERVICE.precio}
          buttonTitle="Ver detalles"
          buttonVariant="outlineGray"
          fullWidthButton
          onButtonPress={() => openSub(CLIENT_SUB.DETALLE_SERVICIO)}
          containerStyle={{ marginTop: 0 }}
        />
      </View>
    </ScrollView>
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

      <View style={styles.detailCard}>
        <Text style={styles.citaRibbon}>• Próxima cita</Text>
        <Text style={styles.citaTitulo}>{MOCK_PROXIMA_CITA.servicio}</Text>
        <Text style={styles.citaStaff}>
          Con {MOCK_PROXIMA_CITA.estilista} · {MOCK_PROXIMA_CITA.rol}
        </Text>
        <View style={styles.citaIconsRow}>
          <View style={styles.citaIconCell}>
            <Calendar size={18} color={colors.foreground} strokeWidth={1.7} />
            <Text style={styles.citaIconText}>{MOCK_PROXIMA_CITA.fechaLabel}</Text>
          </View>
          <View style={styles.citaIconCell}>
            <Clock size={18} color={colors.foreground} strokeWidth={1.7} />
            <Text style={styles.citaIconText}>{MOCK_PROXIMA_CITA.horaLabel}</Text>
          </View>
        </View>
      </View>

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
          <Calendar size={28} color={colors.foregroundSubtle} strokeWidth={1.5} />
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

      {MOCK_HISTORIAL.map((h) => (
        <View key={h.id} style={styles.historyCard}>
          <View style={styles.historyTop}>
            <Text style={styles.historyService}>{h.servicio}</Text>
            <Text style={styles.historyPrice}>{h.precio}</Text>
          </View>
          <Text style={styles.historyMeta}>{h.detalle}</Text>
        </View>
      ))}

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
              <User size={34} color={colors.foregroundMuted} strokeWidth={1.7} />
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
        <LogOut size={18} color={colors.foreground} strokeWidth={1.75} />
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
      <StatusBar style="dark" />
      {openedSub && subTitles ? (
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
          />
        </SubScreenChrome>
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

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppMain />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
  },
  scrollInner: {
    flexGrow: 1,
  },

  sectionBlock: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionKickerGold: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },

  featuredWrap: {
    marginTop: spacing.lg,
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },

  pageDisplay: {
    fontFamily: typography.fontDisplay,
    fontSize: 27,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  pageLead: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foregroundMuted,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },

  detailCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
  },
  citaRibbon: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  citaTitulo: {
    fontFamily: typography.fontSansMedium,
    fontSize: 17,
    color: colors.foreground,
  },
  citaStaff: {
    marginTop: 6,
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foregroundMuted,
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
    color: colors.foreground,
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
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitulo: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foregroundMuted,
    textAlign: 'center',
  },

  historyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    color: colors.foreground,
    flex: 1,
  },
  historyPrice: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  historyMeta: {
    marginTop: spacing.sm,
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: colors.foregroundMuted,
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
    backgroundColor: '#E8DDD0',
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
    color: colors.foreground,
    marginBottom: 4,
  },
  identityEmail: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foregroundSubtle,
  },

  profileMenuShell: {
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    borderRadius: 26,
  },
  profileMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  profileMenuLabel: {
    flex: 1,
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: colors.foreground,
  },
  menuHairline: {
    height: 1,
    backgroundColor: colors.cardBorder,
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
    borderColor: '#CCCCCC',
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  logoutText: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: colors.foreground,
  },
  linkBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  linkBtnText: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: colors.foregroundMuted,
    textDecorationLine: 'underline',
  },
  versionFoot: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: colors.foregroundSubtle,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
