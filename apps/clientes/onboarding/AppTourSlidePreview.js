import { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import {
  MessageCircle,
  ShoppingBag,
  Award,
  Package,
  Scissors,
  MapPin,
  ChevronDown,
  Check,
  Calendar,
  Clock,
  Phone,
  User,
  Settings,
  Gem,
  CreditCard,
  Sparkles,
  Bell,
  Star,
  Sun,
  Moon,
  Languages,
  ShieldCheck,
  Lock,
} from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';
import { LocationOnIcon } from '../components/social/LocationOnIcon';

const GOLD = '#C5A368';
const STAR_GOLD = '#FFB800';

const TOUR_PRODUCT_IMAGES = {
  shampoo: require('../assets/onboarding/tour-product-shampoo.png'),
  mascarilla: require('../assets/onboarding/tour-product-mascarilla.png'),
};

const SOCIAL_LOGOS = {
  whatsapp: require('../assets/social/WhatsApp.png'),
  instagram: require('../assets/social/Instagram.png'),
  facebook: require('../assets/social/Facebook.png'),
};

function MockRow({ icon: Icon, label, sub, highlight, check, logoSource }) {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: radii.sm,
          backgroundColor: highlight ? (isDark ? 'rgba(197,163,104,0.14)' : 'rgba(197,163,104,0.12)') : c.card,
          borderWidth: highlight ? 1 : StyleSheet.hairlineWidth,
          borderColor: highlight ? GOLD : c.cardBorder,
          marginBottom: 4,
        },
        icon: {
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: isDark ? 'rgba(197,163,104,0.15)' : 'rgba(197,163,104,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        logo: { width: 22, height: 22 },
        mid: { flex: 1, minWidth: 0 },
        label: {
          fontFamily: typography.fontSansMedium,
          fontSize: 10,
          color: c.foreground,
        },
        sub: {
          fontFamily: typography.fontSans,
          fontSize: 8,
          color: c.foregroundMuted,
          marginTop: 1,
        },
      }),
    [c, highlight, isDark],
  );
  return (
    <View style={styles.row}>
      {logoSource ? (
        <Image source={logoSource} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.icon}>
          <Icon size={13} color={GOLD} strokeWidth={2} />
        </View>
      )}
      <View style={styles.mid}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {check ? <Check size={13} color={GOLD} strokeWidth={2.5} /> : null}
    </View>
  );
}

function MockProduct({ name, price, image }) {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
          overflow: 'hidden',
        },
        img: {
          height: 40,
          width: '100%',
          backgroundColor: isDark ? '#3a3530' : '#EDE8E0',
        },
        body: { padding: 5 },
        name: {
          fontFamily: typography.fontSansMedium,
          fontSize: 8,
          color: c.foreground,
        },
        price: {
          fontFamily: typography.fontSansMedium,
          fontSize: 9,
          color: GOLD,
          marginTop: 2,
        },
      }),
    [c, isDark],
  );
  return (
    <View style={styles.card}>
      {image ? (
        <Image source={image} style={styles.img} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.img} />
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.price}>{price}</Text>
      </View>
    </View>
  );
}

function PreviewInicio() {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        hero: {
          height: 48,
          borderRadius: radii.sm,
          backgroundColor: isDark ? '#4a4035' : '#E8DFD0',
          marginBottom: 6,
          padding: 7,
          justifyContent: 'flex-end',
        },
        heroTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 9,
          color: isDark ? '#fff' : '#1A1510',
        },
        heroSub: { fontSize: 7, color: isDark ? 'rgba(255,255,255,0.75)' : '#5c5348', marginTop: 1 },
        tabs: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 6,
          paddingTop: 5,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.cardBorder,
        },
        tab: { alignItems: 'center', gap: 2 },
        tabLbl: { fontSize: 6, fontFamily: typography.fontSans, color: c.foregroundMuted },
        tabLblOn: { color: GOLD },
      }),
    [c, isDark],
  );
  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroTxt}>Promos del salón</Text>
        <Text style={styles.heroSub}>Carrusel · Agendar ahora</Text>
      </View>
      <MockRow icon={MessageCircle} label="Mensajes" sub="Andreas Pro" />
      <MockRow icon={ShoppingBag} label="Tienda" sub="Catálogo y carrito" />
      <MockRow icon={Sparkles} label="Tendencias" sub="Looks del salón" />
      <MockRow icon={Package} label="Pedidos" sub="Estado de compras" />
      <MockRow icon={Scissors} label="Servicios" sub="Elegir y agendar" />
      <View style={styles.tabs}>
        <View style={styles.tab}>
          <Sparkles size={10} color={GOLD} />
          <Text style={[styles.tabLbl, styles.tabLblOn]}>Inicio</Text>
        </View>
        <View style={styles.tab}>
          <Calendar size={10} color={c.foregroundMuted} />
          <Text style={styles.tabLbl}>Servicios</Text>
        </View>
        <View style={styles.tab}>
          <ShoppingBag size={10} color={c.foregroundMuted} />
          <Text style={styles.tabLbl}>Tienda</Text>
        </View>
        <View style={styles.tab}>
          <User size={10} color={c.foregroundMuted} />
          <Text style={styles.tabLbl}>Perfil</Text>
        </View>
      </View>
    </View>
  );
}

function PreviewTienda() {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        picker: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: 5,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
          marginBottom: 6,
        },
        pickerTxt: { flex: 1, fontSize: 8, fontFamily: typography.fontSansMedium, color: c.foreground },
        grid: { flexDirection: 'row', gap: 5, marginBottom: 6 },
        review: {
          padding: 6,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
          marginBottom: 5,
        },
        reviewHead: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 3,
        },
        reviewName: { fontSize: 8, fontFamily: typography.fontSansMedium, color: c.foreground },
        reviewDate: { fontSize: 7, color: c.foregroundMuted },
        stars: { flexDirection: 'row', gap: 1, marginBottom: 3 },
        reviewTxt: { fontSize: 7, color: c.foregroundMuted, lineHeight: 10 },
        bandeja: {
          padding: 6,
          borderRadius: radii.sm,
          backgroundColor: 'rgba(197,163,104,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(197,163,104,0.25)',
        },
        bandejaTxt: { fontSize: 7, fontFamily: typography.fontSansMedium, color: c.foreground },
        bandejaSub: { fontSize: 7, color: c.foregroundMuted, marginTop: 2 },
      }),
    [c],
  );
  return (
    <View>
      <View style={styles.picker}>
        <MapPin size={11} color={GOLD} />
        <Text style={styles.pickerTxt}>Sucursal NORTE</Text>
        <ChevronDown size={11} color={c.foregroundMuted} />
      </View>
      <View style={styles.grid}>
        <MockProduct name="Shampoo reparador" price="Q 89" image={TOUR_PRODUCT_IMAGES.shampoo} />
        <MockProduct name="Mascarilla gold" price="Q 120" image={TOUR_PRODUCT_IMAGES.mascarilla} />
      </View>
      <View style={styles.review}>
        <View style={styles.reviewHead}>
          <Text style={styles.reviewName}>María López</Text>
          <Text style={styles.reviewDate}>12 mar</Text>
        </View>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={8} color={STAR_GOLD} fill={STAR_GOLD} strokeWidth={0} />
          ))}
        </View>
        <Text style={styles.reviewTxt} numberOfLines={2}>
          Producto excelente, llegó con mi pedido entregado.
        </Text>
      </View>
      <View style={styles.bandeja}>
        <Text style={styles.bandejaTxt}>Mis pedidos · bandeja</Text>
        <Text style={styles.bandejaSub}>QR retiro · delivery · seguimiento</Text>
      </View>
    </View>
  );
}

function PreviewCitas() {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        picker: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: 5,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: GOLD,
          backgroundColor: c.card,
          marginBottom: 6,
        },
        pickerTxt: { flex: 1, fontSize: 8, fontFamily: typography.fontSansMedium, color: c.foreground },
        slot: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: 6,
          borderRadius: radii.sm,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.cardBorder,
          marginBottom: 4,
        },
        slotTitle: { fontSize: 8, fontFamily: typography.fontSansMedium, color: c.foreground },
        slotSub: { fontSize: 7, color: c.foregroundMuted, marginTop: 1 },
      }),
    [c],
  );
  return (
    <View>
      <View style={styles.picker}>
        <MapPin size={11} color={GOLD} />
        <Text style={styles.pickerTxt}>Tu sucursal · NORTE</Text>
        <ChevronDown size={11} color={c.foregroundMuted} />
      </View>
      <MockRow icon={Scissors} label="Balayage premium" sub="90 min · Q 450" highlight />
      <View style={styles.slot}>
        <Clock size={12} color={GOLD} />
        <View style={{ flex: 1 }}>
          <Text style={styles.slotTitle}>10:30 · Pendiente</Text>
          <Text style={styles.slotSub}>Próxima cita en NORTE</Text>
        </View>
      </View>
      <MockRow icon={Calendar} label="Historial de citas" sub="Visitas anteriores" />
      <MockRow icon={Award} label="Premios ANDREAS" sub="Canje en servicios" />
    </View>
  );
}

function PreviewPagos() {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        checkout: {
          padding: 6,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
          marginBottom: 5,
        },
        checkoutTitle: {
          fontSize: 8,
          fontFamily: typography.fontSansMedium,
          color: c.foreground,
          marginBottom: 4,
        },
        payRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: 5,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: GOLD,
          backgroundColor: isDark ? 'rgba(197,163,104,0.12)' : 'rgba(197,163,104,0.08)',
          marginBottom: 4,
        },
        payLbl: { flex: 1, fontSize: 8, fontFamily: typography.fontSansMedium, color: c.foreground },
        payAmt: { fontSize: 9, fontFamily: typography.fontSansMedium, color: GOLD },
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: 5,
          borderRadius: radii.sm,
          backgroundColor: c.surfaceMuted,
          marginBottom: 4,
        },
        cardTxt: { fontSize: 8, fontFamily: typography.fontSans, color: c.foregroundMuted },
        trust: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 6,
          padding: 6,
          borderRadius: radii.sm,
          backgroundColor: isDark ? 'rgba(46,125,50,0.12)' : 'rgba(46,125,50,0.08)',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(46,125,50,0.35)' : 'rgba(46,125,50,0.25)',
        },
        trustTitle: {
          fontSize: 8,
          fontFamily: typography.fontSansMedium,
          color: c.foreground,
          marginBottom: 2,
        },
        trustBody: {
          fontSize: 7,
          fontFamily: typography.fontSans,
          color: c.foregroundMuted,
          lineHeight: 10,
        },
      }),
    [c, isDark],
  );
  return (
    <View>
      <View style={styles.checkout}>
        <Text style={styles.checkoutTitle}>Confirmar pedido · Tienda</Text>
        <View style={styles.payRow}>
          <CreditCard size={12} color={GOLD} />
          <Text style={styles.payLbl}>Tarjeta</Text>
          <Text style={styles.payAmt}>Q 209.00</Text>
        </View>
        <View style={styles.card}>
          <Lock size={10} color={c.foregroundMuted} />
          <Text style={styles.cardTxt}>Visa ···· 4242 · guardada</Text>
        </View>
      </View>
      <MockRow icon={CreditCard} label="Métodos de pago" sub="Perfil → agregar tarjetas" highlight />
      <View style={styles.trust}>
        <ShieldCheck size={14} color="#2E7D32" strokeWidth={2} />
        <View style={{ flex: 1 }}>
          <Text style={styles.trustTitle}>Pago seguro y confiable</Text>
          <Text style={styles.trustBody}>
            Cobro protegido con Stripe. No almacenamos el número completo de tu tarjeta en la app.
          </Text>
        </View>
      </View>
    </View>
  );
}

function PreviewEventos() {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radii.sm,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
        },
        img: {
          height: 52,
          backgroundColor: isDark ? '#3a3530' : '#D4C4A8',
        },
        body: { padding: 6 },
        badge: {
          alignSelf: 'flex-start',
          fontSize: 6,
          fontFamily: typography.fontSansMedium,
          color: '#fff',
          backgroundColor: 'rgba(0,0,0,0.55)',
          paddingHorizontal: 5,
          paddingVertical: 2,
          borderRadius: 3,
          marginBottom: 4,
          overflow: 'hidden',
        },
        title: { fontSize: 9, fontFamily: typography.fontSansMedium, color: c.foreground },
        sub: { fontSize: 7, color: c.foregroundMuted, marginTop: 2 },
        btn: {
          marginTop: 6,
          paddingVertical: 5,
          borderRadius: radii.sm,
          backgroundColor: 'rgba(197,163,104,0.18)',
          borderWidth: 1,
          borderColor: 'rgba(197,163,104,0.45)',
          alignItems: 'center',
        },
        btnTxt: { fontSize: 7, fontFamily: typography.fontSansMedium, color: GOLD },
        menu: { marginTop: 6 },
      }),
    [c, isDark],
  );
  return (
    <View>
      <View style={styles.card}>
        <View style={styles.img} />
        <View style={styles.body}>
          <Text style={styles.badge}>Evento</Text>
          <Text style={styles.title}>Paquete boda · sesión foto</Text>
          <Text style={styles.sub}>Consultar precio · solicitud al salón</Text>
          <View style={styles.btn}>
            <Text style={styles.btnTxt}>Solicitar participación</Text>
          </View>
        </View>
      </View>
      <View style={styles.menu}>
        <MockRow icon={Bell} label="Eventos profesionales" sub="Perfil → ver catálogo" highlight />
      </View>
    </View>
  );
}

function PreviewContacto() {
  const { colors: c } = useTheme();
  return (
    <View>
      <MockRow logoSource={SOCIAL_LOGOS.whatsapp} icon={Phone} label="WhatsApp" sub="Chat con recepción" />
      <MockRow icon={Phone} label="Llamada" sub="+502 4713-2123" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, paddingHorizontal: 4 }}>
        <LocationOnIcon size={22} color={GOLD} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontFamily: typography.fontSansMedium, color: c.foreground }}>Ubicación GPS</Text>
          <Text style={{ fontSize: 8, color: c.foregroundMuted }}>Abrir en mapas</Text>
        </View>
      </View>
      <MockRow logoSource={SOCIAL_LOGOS.instagram} icon={Sparkles} label="Instagram" sub="@appsalonpro" />
      <MockRow logoSource={SOCIAL_LOGOS.facebook} icon={User} label="Facebook" sub="AppSalon Pro" />
    </View>
  );
}

function PreviewPerfil() {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        head: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          paddingBottom: 6,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.cardBorder,
        },
        avatar: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: c.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: c.cardBorder,
        },
        name: { fontSize: 10, fontFamily: typography.fontSansMedium, color: c.foreground },
        email: { fontSize: 7, color: c.foregroundMuted, marginTop: 1 },
        configRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 5,
          paddingHorizontal: 8,
          borderRadius: radii.sm,
          backgroundColor: c.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.cardBorder,
          marginBottom: 4,
        },
        configLbl: { fontSize: 9, fontFamily: typography.fontSansMedium, color: c.foreground },
        configVal: { fontSize: 8, fontFamily: typography.fontSans, color: GOLD },
        themePill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: radii.pill,
          backgroundColor: isDark ? 'rgba(197,163,104,0.15)' : 'rgba(197,163,104,0.10)',
        },
      }),
    [c, isDark],
  );
  const ThemeIcon = isDark ? Moon : Sun;
  const themeLabel = isDark ? 'Oscuro' : 'Claro';
  return (
    <View>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <User size={16} color={c.foregroundMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Tu perfil</Text>
          <Text style={styles.email}>Datos · membresía</Text>
        </View>
        <Gem size={13} color={GOLD} />
      </View>
      <MockRow icon={Gem} label="Membresías" sub="Bronce · Plata · VIP" />
      <MockRow icon={CreditCard} label="Métodos de pago" sub="Tarjetas guardadas · Stripe" />
      <MockRow icon={Phone} label="Servicio al cliente" sub="Sin iconos en menú" />
      <View style={styles.configRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Languages size={12} color={GOLD} />
          <Text style={styles.configLbl}>Idioma</Text>
        </View>
        <Text style={styles.configVal}>Español · EN</Text>
      </View>
      <View style={styles.configRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Settings size={12} color={GOLD} />
          <Text style={styles.configLbl}>Apariencia</Text>
        </View>
        <View style={styles.themePill}>
          <ThemeIcon size={10} color={GOLD} />
          <Text style={styles.configVal}>{themeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const PREVIEW_MAP = {
  inicio: PreviewInicio,
  tienda: PreviewTienda,
  pagos: PreviewPagos,
  citas: PreviewCitas,
  eventos: PreviewEventos,
  contacto: PreviewContacto,
  perfil: PreviewPerfil,
};

/** Mini captura estilizada de la pantalla real de la app (tour onboarding). */
export function AppTourSlidePreview({ slideId }) {
  const { colors: c, isDark } = useTheme();
  const Preview = PREVIEW_MAP[slideId] || PreviewInicio;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        phone: {
          width: '100%',
          maxWidth: 280,
          borderRadius: radii.lg,
          borderWidth: 2,
          borderColor: isDark ? 'rgba(197,163,104,0.45)' : 'rgba(197,163,104,0.55)',
          backgroundColor: c.card,
          padding: spacing.sm,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 12,
          elevation: 4,
        },
        notch: {
          alignSelf: 'center',
          width: 48,
          height: 4,
          borderRadius: 2,
          backgroundColor: c.cardBorder,
          marginBottom: spacing.sm,
        },
        screen: {
          borderRadius: radii.sm,
          backgroundColor: c.background,
          padding: spacing.sm,
          minHeight: 188,
        },
        caption: {
          marginTop: spacing.xs,
          alignSelf: 'center',
          fontFamily: typography.fontSans,
          fontSize: 9,
          color: c.foregroundSubtle,
        },
      }),
    [c, isDark],
  );

  return (
    <View style={styles.phone} accessibilityRole="image" accessibilityLabel={`Vista previa: ${slideId}`}>
      <View style={styles.notch} />
      <View style={styles.screen}>
        <Preview />
      </View>
      <Text style={styles.caption}>Vista de la app</Text>
    </View>
  );
}
