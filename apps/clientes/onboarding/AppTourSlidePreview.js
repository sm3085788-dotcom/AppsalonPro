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
  QrCode,
  Phone,
  MessageSquare,
  Navigation,
  User,
  Settings,
  Gem,
  CreditCard,
} from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';

const GOLD = '#C5A368';

const TOUR_PRODUCT_IMAGES = {
  shampoo: require('../assets/onboarding/tour-product-shampoo.png'),
  mascarilla: require('../assets/onboarding/tour-product-mascarilla.png'),
};

function MockRow({ icon: Icon, label, sub, highlight, check }) {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 7,
          paddingHorizontal: 8,
          borderRadius: radii.sm,
          backgroundColor: highlight ? (isDark ? 'rgba(197,163,104,0.14)' : 'rgba(197,163,104,0.12)') : c.card,
          borderWidth: highlight ? 1 : StyleSheet.hairlineWidth,
          borderColor: highlight ? GOLD : c.cardBorder,
          marginBottom: 5,
        },
        icon: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: isDark ? 'rgba(197,163,104,0.15)' : 'rgba(197,163,104,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        },
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
      <View style={styles.icon}>
        <Icon size={14} color={GOLD} strokeWidth={2} />
      </View>
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
      {check ? <Check size={14} color={GOLD} strokeWidth={2.5} /> : null}
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
          height: 44,
          width: '100%',
          backgroundColor: isDark ? '#3a3530' : '#EDE8E0',
        },
        body: { padding: 6 },
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
          height: 52,
          borderRadius: radii.sm,
          backgroundColor: isDark ? '#4a4035' : '#E8DFD0',
          marginBottom: 8,
          padding: 8,
          justifyContent: 'flex-end',
        },
        heroTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 9,
          color: isDark ? '#fff' : '#1A1510',
        },
        heroSub: { fontSize: 7, color: isDark ? 'rgba(255,255,255,0.75)' : '#5c5348', marginTop: 2 },
      }),
    [isDark],
  );
  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.heroTxt}>Novedades del salón</Text>
        <Text style={styles.heroSub}>Carrusel · promos y servicios</Text>
      </View>
      <MockRow icon={MessageCircle} label="Mensajes" sub="Andreas Pro · en vivo" />
      <MockRow icon={ShoppingBag} label="Tienda" sub="Productos profesionales" />
      <MockRow icon={Award} label="Premios" sub="Puntos y referidos" />
      <MockRow icon={Package} label="Pedidos" sub="Mis compras" />
      <MockRow icon={Scissors} label="Servicios" sub="Agendá tu cita" />
    </View>
  );
}

function PreviewSucursal() {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        picker: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: 8,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: GOLD,
          backgroundColor: c.card,
          marginBottom: 8,
        },
        pickerTxt: {
          flex: 1,
          fontFamily: typography.fontSansMedium,
          fontSize: 10,
          color: c.foreground,
        },
        hint: {
          fontFamily: typography.fontSans,
          fontSize: 8,
          color: c.foregroundMuted,
          marginBottom: 6,
          lineHeight: 11,
        },
      }),
    [c],
  );
  return (
    <View>
      <Text style={styles.hint}>Tienda, citas y pedidos usan el stock de esta sucursal.</Text>
      <View style={styles.picker}>
        <MapPin size={14} color={GOLD} />
        <Text style={styles.pickerTxt}>Salón Andreas · Zona 10</Text>
        <ChevronDown size={14} color={c.foregroundMuted} />
      </View>
      <MockRow icon={MapPin} label="Matriz · Zona 10" sub="Sucursal principal" />
      <MockRow icon={MapPin} label="NORTE" sub="Zona norte · más cercana" highlight check />
      <MockRow icon={MapPin} label="SUR" sub="Zona sur" />
    </View>
  );
}

function PreviewCitas() {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        chips: { flexDirection: 'row', gap: 5, marginBottom: 8 },
        chip: {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
        },
        chipOn: { borderColor: GOLD, backgroundColor: 'rgba(197,163,104,0.12)' },
        chipTxt: { fontSize: 8, fontFamily: typography.fontSansMedium, color: c.foreground },
        slot: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: 8,
          borderRadius: radii.sm,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.cardBorder,
          marginBottom: 5,
        },
        slotTitle: { fontSize: 9, fontFamily: typography.fontSansMedium, color: c.foreground },
        slotSub: { fontSize: 7, color: c.foregroundMuted, marginTop: 1 },
      }),
    [c],
  );
  return (
    <View>
      <View style={styles.chips}>
        <View style={[styles.chip, styles.chipOn]}>
          <Text style={styles.chipTxt}>Mar 15</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipTxt}>Mar 16</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipTxt}>Mar 17</Text>
        </View>
      </View>
      <MockRow icon={Scissors} label="Balayage premium" sub="90 min · Q 450" />
      <View style={styles.slot}>
        <Clock size={14} color={GOLD} />
        <View style={{ flex: 1 }}>
          <Text style={styles.slotTitle}>10:30 · Confirmada</Text>
          <Text style={styles.slotSub}>NORTE · próxima cita</Text>
        </View>
        <Calendar size={14} color={c.foregroundMuted} />
      </View>
      <MockRow icon={Calendar} label="Historial de visitas" sub="Citas anteriores" />
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
          padding: 6,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: c.cardBorder,
          backgroundColor: c.card,
          marginBottom: 8,
        },
        pickerTxt: { flex: 1, fontSize: 9, fontFamily: typography.fontSansMedium, color: c.foreground },
        grid: { flexDirection: 'row', gap: 6, marginBottom: 6 },
        qr: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          padding: 8,
          borderRadius: radii.sm,
          backgroundColor: 'rgba(197,163,104,0.10)',
          borderWidth: 1,
          borderColor: 'rgba(197,163,104,0.35)',
        },
        qrTxt: { fontSize: 8, fontFamily: typography.fontSansMedium, color: c.foreground, flex: 1 },
      }),
    [c],
  );
  return (
    <View>
      <View style={styles.picker}>
        <MapPin size={12} color={GOLD} />
        <Text style={styles.pickerTxt}>Sucursal NORTE</Text>
        <ChevronDown size={12} color={c.foregroundMuted} />
      </View>
      <View style={styles.grid}>
        <MockProduct name="Shampoo reparador" price="Q 89.00" image={TOUR_PRODUCT_IMAGES.shampoo} />
        <MockProduct name="Mascarilla gold" price="Q 120.00" image={TOUR_PRODUCT_IMAGES.mascarilla} />
      </View>
      <View style={styles.qr}>
        <QrCode size={16} color={GOLD} />
        <Text style={styles.qrTxt}>Pedido #APS-4821 · QR retiro en salón</Text>
      </View>
    </View>
  );
}

function PreviewPremios() {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          padding: 10,
          borderRadius: radii.sm,
          backgroundColor: isDark ? 'rgba(197,163,104,0.12)' : 'rgba(197,163,104,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(197,163,104,0.35)',
          marginBottom: 8,
        },
        pts: {
          fontFamily: typography.fontDisplay,
          fontSize: 22,
          color: GOLD,
          textAlign: 'center',
        },
        ptsLbl: {
          fontSize: 8,
          fontFamily: typography.fontSans,
          color: c.foregroundMuted,
          textAlign: 'center',
          marginTop: 2,
        },
        bar: {
          height: 6,
          borderRadius: 3,
          backgroundColor: c.cardBorder,
          marginTop: 8,
          overflow: 'hidden',
        },
        barFill: { width: '62%', height: '100%', backgroundColor: GOLD, borderRadius: 3 },
        code: {
          marginTop: 8,
          padding: 8,
          borderRadius: radii.sm,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.cardBorder,
        },
        codeLbl: { fontSize: 7, color: c.foregroundMuted },
        codeVal: { fontSize: 9, fontFamily: typography.fontSansMedium, color: c.foreground, marginTop: 2 },
      }),
    [c, isDark],
  );
  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.pts}>24</Text>
        <Text style={styles.ptsLbl}>Puntos ANDREAS · canje en tienda</Text>
        <View style={styles.bar}>
          <View style={styles.barFill} />
        </View>
      </View>
      <MockRow icon={Award} label="Canje 19,99% en producto" sub="Próxima compra app" />
      <View style={styles.code}>
        <Text style={styles.codeLbl}>Tu código de referido</Text>
        <Text style={styles.codeVal}>ANDREAS-4BB1368F</Text>
      </View>
    </View>
  );
}

function PreviewSoporte() {
  return (
    <View>
      <MockRow icon={MessageSquare} label="WhatsApp" sub="Chat con recepción" />
      <MockRow icon={Phone} label="Servicio al cliente" sub="+502 4713-2123" highlight />
      <MockRow icon={Navigation} label="Ubicación GPS" sub="Abrir en mapas" />
    </View>
  );
}

function PreviewPerfil() {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        head: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          paddingBottom: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.cardBorder,
        },
        avatar: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: c.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: c.cardBorder,
        },
        name: { fontSize: 11, fontFamily: typography.fontSansMedium, color: c.foreground },
        email: { fontSize: 8, color: c.foregroundMuted, marginTop: 1 },
      }),
    [c],
  );
  return (
    <View>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <User size={18} color={c.foregroundMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Rosario</Text>
          <Text style={styles.email}>rosario@email.com</Text>
        </View>
        <Gem size={14} color={GOLD} />
      </View>
      <MockRow icon={Gem} label="Membresías" sub="Bronce · Plata · VIP" />
      <MockRow icon={Phone} label="Servicio al cliente" sub="WhatsApp y llamada" highlight />
      <MockRow icon={CreditCard} label="Métodos de pago" sub="Tarjetas guardadas" />
      <MockRow icon={Settings} label="Configuración" sub="Ajustes de la app" />
    </View>
  );
}

const PREVIEW_MAP = {
  inicio: PreviewInicio,
  sucursal: PreviewSucursal,
  citas: PreviewCitas,
  tienda: PreviewTienda,
  premios: PreviewPremios,
  soporte: PreviewSoporte,
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
          minHeight: 200,
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
