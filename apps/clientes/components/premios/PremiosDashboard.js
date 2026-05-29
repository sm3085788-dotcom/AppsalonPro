import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  Award,
  Crown,
  Sparkles,
  Gift,
  Share2,
  Copy,
  Users,
  Percent,
  Calendar,
  Store,
  RefreshCw,
  X,
  Wallet,
  Truck,
  ChevronRight,
  Star,
  Camera,
  Scissors,
  Check,
} from 'lucide-react-native';
import { SalonButton } from '../luxury/SalonButton';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { db, ANDREAS_META } from '@appsalon/shared-config';

const BASE_META = ANDREAS_META.appEfectivoRetiro;   // 8 por defecto
const META_SALON_BASE = ANDREAS_META.salon;          // para el modal de salón físico
const META_REFERIDOS = ANDREAS_META.referidos;       // siempre 3, sin efecto membresía
const BASE_DISCOUNT = 19.99;

/** Bonus por nivel de membresía (no aplica a referidos). */
const MEMBRESIA_BONUS = {
  bronce: { metaReduction: 1, discountBonus: 5,  label: 'Bronce',  accent: '#B87333' },
  plata:  { metaReduction: 2, discountBonus: 15, label: 'Plata',   accent: '#9CA3AF' },
  vip:    { metaReduction: 3, discountBonus: 30, label: 'VIP',     accent: '#C5A368' },
};

function getMembershipTier(nivel) {
  const id = String(nivel || '').toLowerCase().trim();
  const bonus = MEMBRESIA_BONUS[id];
  if (!bonus) return null;
  const meta = BASE_META - bonus.metaReduction;          // 7, 6, or 5
  const discount = (BASE_DISCOUNT + bonus.discountBonus).toFixed(2); // 24.99, 34.99, 49.99
  return {
    ...bonus,
    meta,
    discount,
    bonusDesc: `Membresía ${bonus.label}: descuento ${discount}% (en vez de ${BASE_DISCOUNT}%) · meta ${meta} pts (en vez de 8)`,
  };
}

// ─── Póster visual por regla ────────────────────────────────────────────────

const RULE_POSTER_CONFIG = {
  wallet: {
    gradient: ['#0F4C2A', '#1A7A44', '#22A05A'],
    iconBg: 'rgba(255,255,255,0.15)',
    accent: '#4ADE80',
    rewardBg: 'rgba(74,222,128,0.18)',
    emoji: '💵',
    rewardLine: '19,99% en próximo pedido app',
  },
  truck: {
    gradient: ['#0F2D4C', '#1A5080', '#1E6DB0'],
    iconBg: 'rgba(255,255,255,0.15)',
    accent: '#60A5FA',
    rewardBg: 'rgba(96,165,250,0.18)',
    emoji: '📦',
    rewardLine: '19,99% en próximo delivery',
  },
  calendar: {
    gradient: ['#2D0F4C', '#561A8A', '#7B2DBF'],
    iconBg: 'rgba(255,255,255,0.15)',
    accent: '#C084FC',
    rewardBg: 'rgba(192,132,252,0.18)',
    emoji: '✂️',
    rewardLine: '19,99% en servicio + producto',
  },
  store: {
    gradient: ['#4C2D0F', '#8A561A', '#BF7B2D'],
    iconBg: 'rgba(255,255,255,0.15)',
    accent: '#FBB93B',
    rewardBg: 'rgba(251,185,59,0.18)',
    emoji: '🛍️',
    rewardLine: '19,99% en próxima compra en salón',
  },
};

function PosterRuleCard({ icon: Icon, iconKey, title, body, current, meta, discount, tc }) {
  const cfg = RULE_POSTER_CONFIG[iconKey] || RULE_POSTER_CONFIG.wallet;
  const progress = Math.min(1, meta > 0 ? current / meta : 0);
  const remaining = Math.max(0, meta - current);
  const completed = progress >= 1;

  return (
    <View style={posterStyles.cardWrap}>
      {/* Poster header */}
      <LinearGradient
        colors={cfg.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={posterStyles.posterHeader}
      >
        {/* Decorative circles */}
        <View style={posterStyles.deco1} />
        <View style={posterStyles.deco2} />

        <View style={posterStyles.posterHeaderInner}>
          {/* Left: icon + reward */}
          <View style={posterStyles.posterLeft}>
            <View style={[posterStyles.posterIconWrap, { backgroundColor: cfg.iconBg }]}>
              <Icon size={28} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={[posterStyles.rewardPill, { backgroundColor: cfg.rewardBg, borderColor: cfg.accent + '55' }]}>
              <Percent size={11} color={cfg.accent} strokeWidth={2.5} />
              <Text style={[posterStyles.rewardPillTxt, { color: cfg.accent }]}>
                {discount ? `${discount}% de descuento` : cfg.rewardLine}
              </Text>
            </View>
          </View>

          {/* Right: big emoji + completed stamp */}
          <View style={posterStyles.posterRight}>
            <Text style={posterStyles.posterEmoji}>{cfg.emoji}</Text>
            {completed ? (
              <View style={posterStyles.completedStamp}>
                <Check size={14} color="#FFF" strokeWidth={3} />
                <Text style={posterStyles.completedTxt}>LISTO</Text>
              </View>
            ) : (
              <View style={[posterStyles.countBadge, { borderColor: cfg.accent + '80', backgroundColor: 'rgba(0,0,0,0.35)' }]}>
                <Text style={[posterStyles.countNum, { color: '#FFF' }]}>{current}</Text>
                <Text style={[posterStyles.countOf, { color: 'rgba(255,255,255,0.65)' }]}>/{meta}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Card body */}
      <View style={[posterStyles.posterBody, { backgroundColor: tc.card, borderColor: tc.cardBorder }]}>
        <Text style={[posterStyles.posterTitle, { color: tc.foreground }]}>{title}</Text>
        <Text style={[posterStyles.posterBodyTxt, { color: tc.foregroundMuted }]}>{body}</Text>

        {/* Progress bar */}
        <View style={posterStyles.progressRow}>
          <View style={[posterStyles.track, { backgroundColor: tc.iconCircleBg ?? '#F3F3F3' }]}>
            <View style={[posterStyles.fill, { width: `${progress * 100}%`, backgroundColor: cfg.accent }]} />
          </View>
          <Text style={[posterStyles.progressLabel, { color: completed ? cfg.accent : tc.foregroundSubtle }]}>
            {completed ? '¡Podés canjear!' : `Faltan ${remaining}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Tarjeta intro de premios (overview visual) ─────────────────────────────

function PremiosOverview({ tc, membershipTier }) {
  const items = [
    { emoji: '💵', label: 'Efectivo\nRetiro', color: '#22A05A' },
    { emoji: '📦', label: 'Tarjeta\nDelivery', color: '#1E6DB0' },
    { emoji: '✂️', label: 'Citas', color: '#7B2DBF' },
    { emoji: '🛍️', label: 'Salón\nFísico', color: '#BF7B2D' },
    { emoji: '👥', label: 'Referidos', color: '#C9A24D' },
  ];
  return (
    <View style={[overviewStyles.wrap, { backgroundColor: tc.card, borderColor: tc.cardBorder }]}>
      <Text style={[overviewStyles.title, { color: tc.foreground }]}>5 formas de ganar puntos</Text>
      <View style={overviewStyles.row}>
        {items.map((it, i) => (
          <View key={i} style={overviewStyles.item}>
            <View style={[overviewStyles.emojiCircle, { backgroundColor: it.color + '22', borderColor: it.color + '44' }]}>
              <Text style={overviewStyles.emoji}>{it.emoji}</Text>
            </View>
            <Text style={[overviewStyles.label, { color: tc.foregroundMuted }]}>{it.label}</Text>
          </View>
        ))}
      </View>
      {membershipTier ? (
        <View style={[overviewStyles.bonusBanner, { backgroundColor: membershipTier.accent + '18', borderColor: membershipTier.accent + '55' }]}>
          <Text style={[overviewStyles.bonusTxt, { color: membershipTier.accent }]}>
            {membershipTier.bonusDesc}
          </Text>
        </View>
      ) : null}
      <Text style={[overviewStyles.sub, { color: tc.foregroundSubtle }]}>
        Con puntos por regla · canjeás descuento · 3 referidos · 29,99% + foto
      </Text>
    </View>
  );
}

// ─── Tarjeta de referidos visual ────────────────────────────────────────────

function ReferidosPoster({ referidosOk, meta, codigo, onCopy, onShare, tc }) {
  const progress = Math.min(1, meta > 0 ? referidosOk / meta : 0);
  const remaining = Math.max(0, meta - referidosOk);
  const completed = progress >= 1;

  return (
    <View style={[refStyles.cardWrap, { borderColor: 'rgba(201,162,77,0.4)' }]}>
      {/* Banner header */}
      <LinearGradient
        colors={['#1a0f00', '#2e1c05', '#4a2e0a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={refStyles.banner}
      >
        <View style={refStyles.bannerDecoL} />
        <View style={refStyles.bannerDecoR} />

        <View style={refStyles.bannerContent}>
          <View style={refStyles.bannerLeft}>
            <View style={refStyles.personBubbles}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    refStyles.personBubble,
                    {
                      backgroundColor: i < referidosOk ? '#C9A24D' : 'rgba(255,255,255,0.12)',
                      borderColor: i < referidosOk ? '#F5E6A8' : 'rgba(255,255,255,0.2)',
                      marginLeft: i === 0 ? 0 : -10,
                    },
                  ]}
                >
                  <Users size={14} color={i < referidosOk ? '#1a0f00' : 'rgba(255,255,255,0.45)'} strokeWidth={2} />
                </View>
              ))}
              <Text style={refStyles.personsLabel}>{referidosOk}/3</Text>
            </View>
            <Text style={refStyles.bannerTitle}>Referidos ANDREAS</Text>
            <View style={refStyles.rewardRow}>
              <View style={refStyles.rewardChip}>
                <Percent size={10} color="#C9A24D" strokeWidth={2.5} />
                <Text style={refStyles.rewardChipTxt}>29,99%</Text>
              </View>
              <Text style={refStyles.plusSign}>+</Text>
              <View style={refStyles.rewardChip}>
                <Camera size={10} color="#C9A24D" strokeWidth={2} />
                <Text style={refStyles.rewardChipTxt}>Sesión fotos</Text>
              </View>
            </View>
          </View>
          <View style={refStyles.bannerRight}>
            <Text style={refStyles.bigEmoji}>🎁</Text>
            {completed && (
              <View style={refStyles.completedStamp}>
                <Star size={12} color="#1a0f00" strokeWidth={2} />
                <Text style={refStyles.completedTxt}>¡Ganaste!</Text>
              </View>
            )}
          </View>
        </View>

        {/* Progress */}
        <View style={refStyles.progressWrap}>
          <View style={[refStyles.track, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <View style={[refStyles.fill, { width: `${progress * 100}%`, backgroundColor: '#C9A24D' }]} />
          </View>
          <Text style={refStyles.progressLabel}>
            {completed ? '¡Podés canjear tu premio!' : `Faltan ${remaining} referido${remaining === 1 ? '' : 's'}`}
          </Text>
        </View>
      </LinearGradient>

      {/* Bottom: code + share */}
      <View style={[refStyles.codeSection, { backgroundColor: tc.card }]}>
        <Text style={[refStyles.codeLead, { color: tc.foregroundMuted }]}>
          Compartí tu código — si 3 nuevos clientes se registran y compran o agendan cita, ganás el premio completo.
        </Text>
        <TouchableOpacity
          style={[refStyles.codeBox, { backgroundColor: tc.surfaceMuted, borderColor: 'rgba(201,162,77,0.4)' }]}
          onPress={onCopy}
          activeOpacity={0.85}
        >
          <View style={refStyles.codeLeft}>
            <Text style={[refStyles.codeLabel, { color: tc.foregroundSubtle }]}>TU CÓDIGO</Text>
            <Text style={[refStyles.codeValue, { color: tc.foreground }]}>{codigo}</Text>
          </View>
          <View style={[refStyles.copyBtn, { backgroundColor: 'rgba(201,162,77,0.15)', borderColor: 'rgba(201,162,77,0.4)' }]}>
            <Copy size={18} color="#C9A24D" strokeWidth={2} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={refStyles.shareBtn} onPress={onShare} activeOpacity={0.9}>
          <Share2 size={18} color="#1a0f00" strokeWidth={2.2} />
          <Text style={refStyles.shareTxt}>Compartir invitación Andreas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Canje ticket visual ──────────────────────────────────────────────────────

function CanjeTicket({ titulo, detalle, isActive, onPress, tc }) {
  const discountMatch = titulo.match(/(\d+,\d+%)/);
  const discount = discountMatch ? discountMatch[1] : '19,99%';
  const shortTitle = titulo.replace(/\d+,\d+%\s*·?\s*/, '').trim();

  return (
    <TouchableOpacity
      style={[
        ticketStyles.wrap,
        { borderColor: isActive ? '#C9A24D' : tc.cardBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Left stub */}
      <LinearGradient
        colors={isActive ? ['#C9A24D', '#E8D4A8'] : ['#1a1412', '#2a2018']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={ticketStyles.stub}
      >
        <Text style={[ticketStyles.stubDiscount, { color: isActive ? '#1a0f00' : '#C9A24D' }]}>
          {discount}
        </Text>
        <Text style={[ticketStyles.stubOff, { color: isActive ? '#3a2010' : 'rgba(201,162,77,0.7)' }]}>
          OFF
        </Text>
      </LinearGradient>

      {/* Perforated separator */}
      <View style={ticketStyles.perfWrap}>
        <View style={[ticketStyles.semicircleTop, { backgroundColor: tc.background }]} />
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[ticketStyles.dot, { backgroundColor: tc.cardBorder }]} />
        ))}
        <View style={[ticketStyles.semicircleBottom, { backgroundColor: tc.background }]} />
      </View>

      {/* Right body */}
      <View style={[ticketStyles.body, { backgroundColor: tc.card }]}>
        <Text style={[ticketStyles.bodyTitle, { color: tc.foreground }]} numberOfLines={2}>
          {shortTitle}
        </Text>
        <Text style={[ticketStyles.bodyDetail, { color: tc.foregroundMuted }]} numberOfLines={2}>
          {detalle}
        </Text>
        <View style={ticketStyles.bodyFooter}>
          <View style={[ticketStyles.condChip, { borderColor: tc.cardBorder }]}>
            <Text style={[ticketStyles.condTxt, { color: tc.foregroundSubtle }]}>8 puntos</Text>
          </View>
          <ChevronRight size={14} color={tc.foregroundSubtle} strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PremiosDashboard({ onClose, clientUserId, clienteRow, onPrizeReady }) {
  const [canjeTap, setCanjeTap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [modalSalonFisico, setModalSalonFisico] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors: tc } = useTheme();
  const styles = useMemo(() => createPremiosStyles(tc), [tc]);

  const load = useCallback(async () => {
    if (!clientUserId || !clienteRow?.id) {
      setResumen(null);
      setLoadErr(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadErr(null);
    const r = await db.premiosAndreas.getResumen({ clientUserId, clienteRow });
    setLoading(false);
    if (r.error) {
      setLoadErr(String(r.error.message || 'No se pudo cargar'));
      setResumen(null);
      return;
    }
    setResumen(r);
    // Notificar si alguna regla está lista para canjear
    const tier = getMembershipTier(clienteRow?.membresia_nivel);
    const meta = tier?.meta ?? BASE_META;
    const anyReady =
      (r.productosAppEfectivoRetiro   ?? 0) >= meta ||
      (r.productosAppTarjetaDelivery  ?? 0) >= meta ||
      (r.citasVerificadas             ?? 0) >= meta ||
      (r.productosSalonFisico         ?? 0) >= meta ||
      (r.referidosPrimeraCompra       ?? 0) >= META_REFERIDOS;
    onPrizeReady?.(anyReady);
  }, [clientUserId, clienteRow, onPrizeReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const membershipTier = getMembershipTier(clienteRow?.membresia_nivel);
  // Meta efectiva según membresía (sin membresía = 8; bronce = 7; plata = 6; vip = 5)
  const efectiveMeta = membershipTier?.meta ?? BASE_META;
  const efectiveDiscount = membershipTier?.discount ?? BASE_DISCOUNT.toFixed(2);

  const codigo = resumen?.codigoReferido?.trim() || '—';
  const productosAppEfectivoRetiro = resumen?.productosAppEfectivoRetiro ?? 0;
  const productosAppTarjetaDelivery = resumen?.productosAppTarjetaDelivery ?? 0;
  const citasOk = resumen?.citasVerificadas ?? 0;
  const salonFisico = resumen?.productosSalonFisico ?? 0;
  const referidosOk = resumen?.referidosPrimeraCompra ?? 0;

  const shareReferral = async () => {
    if (!codigo || codigo === '—') {
      Alert.alert('Premios', 'Iniciá sesión y enlazá tu ficha para obtener tu código de invitación.');
      return;
    }
    const msg =
      `¡Te invito a Salon Andreas! Descargá la app de clientes, creá tu cuenta verificada y usá mi código ${codigo}. ` +
      `Programa ANDREAS: si 3 nuevos usuarios crean cuenta verificada con tu código y realizan su primera compra en efectivo o con tarjeta, o agendan su primera cita, ganás 29,99% en un servicio más sesión de fotos e imagen impresa, canjeable en Salon Andreas.`;
    try {
      await Share.share({ message: msg, title: 'Invitación Salon Andreas' });
    } catch {
      /* cancelado */
    }
  };

  const copyCode = async () => {
    if (!codigo || codigo === '—') {
      Alert.alert('Código', 'Aún no tenemos un código asignado. Volvé a abrir Premios luego de iniciar sesión.');
      return;
    }
    try {
      await Clipboard.setStringAsync(codigo);
      Alert.alert('Listo', 'Código copiado al portapapeles.');
    } catch {
      Alert.alert('Código', codigo);
    }
  };

  const onCanjeInfo = (id, titulo, detalle) => {
    setCanjeTap(id);
    Alert.alert(titulo, detalle, [{ text: 'OK', onPress: () => setCanjeTap(null) }]);
  };

  const d = efectiveDiscount;
  const m = efectiveMeta;
  const canjesIlustrativos = [
    {
      id: 'p_app_efectivo_retiro',
      titulo: `${d}% · app efectivo y retiro en salón`,
      detalle: `1 punto por cada producto en pedidos de la app pagados en efectivo con retiro en Salon Andreas, verificados al entregar (estado entregado). Con ${m} puntos: ${d}% de descuento en un producto en tu próxima compra app efectivo + retiro. Coordiná el canje en recepción.`,
    },
    {
      id: 'p_app_tarjeta_delivery',
      titulo: `${d}% · app tarjeta y envío a domicilio`,
      detalle: `1 punto por cada producto en pedidos de la app pagados con tarjeta y envío a domicilio, verificados al entregar (estado entregado). Con ${m} puntos: ${d}% de descuento en un producto en tu próxima compra app tarjeta + delivery. Coordiná el canje en recepción.`,
    },
    {
      id: 'citas',
      titulo: `${d}% en servicio + producto`,
      detalle: `Con ${m} citas en estado completada y verificadas en el salón, obtenés ${d}% de descuento en un servicio al comprar producto en Salon Andreas. Canje en salón.`,
    },
    {
      id: 'salon',
      titulo: `${d}% próximo producto (salón físico)`,
      detalle: `Cuando adquirís un producto en el salón, la compra se registra con tu nombre y la vinculación de tu perfil en la app. Con ${m} unidades verificadas: ${d}% en la siguiente compra de producto en salón físico.`,
    },
  ];

  if (!clientUserId || !clienteRow?.id) {
    return (
      <>
        <View style={[styles.card, { marginBottom: spacing.md }]}>
          <Text style={styles.cardLead}>
            Iniciá sesión y pedí en recepción que enlacen tu cuenta para ver tu código ANDREAS y el progreso de puntos.
          </Text>
        </View>
        <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      </>
    );
  }

  return (
    <>
      {/* Hero */}
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={['#1A1612', '#0C0B0A', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: styles.heroBorderColor }]}
        >
          <LinearGradient
            colors={['rgba(201, 162, 77, 0.2)', 'rgba(201, 162, 77, 0.04)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={styles.heroSheen}
            pointerEvents="none"
          />
          <View style={styles.heroInner}>
            <View style={styles.heroTop}>
              <View style={[styles.heroBadge, { borderColor: styles.heroGoldBorder }]}>
                <Crown size={14} color={tc.primary} strokeWidth={2.2} />
                <Text style={styles.heroBadgeTxt}>ANDREAS</Text>
              </View>
              <View style={styles.heroActions}>
                <TouchableOpacity
                  onPress={() => setModalSalonFisico(true)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Ver progreso salón físico"
                  activeOpacity={0.85}
                  style={[styles.heroIconBtn, { borderColor: styles.heroGoldBorderSoft }]}
                >
                  <Store size={18} color="#F5E6A8" strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void load()}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Actualizar puntos"
                  activeOpacity={0.85}
                  disabled={loading}
                  style={[styles.heroIconBtn, { borderColor: styles.heroGoldBorderSoft }]}
                >
                  <RefreshCw size={18} color="rgba(255,255,255,0.65)" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.heroTitleRow}>
              <Sparkles size={16} color={tc.primary} strokeWidth={2} />
              <Text style={styles.heroEyebrow}>Programa exclusivo</Text>
            </View>
            <Text style={styles.heroPoints}>Premios</Text>
            <View style={[styles.heroDivider, { backgroundColor: tc.primary }]} />
            <Text style={styles.heroPointsLabel}>Programa de puntos Salon Andreas</Text>

            <View style={[styles.heroTaglineBox, { borderColor: styles.heroGoldBorder, backgroundColor: styles.heroTaglineBg }]}>
              <Text style={[styles.heroTagline, { color: styles.heroTaglineColor }]}>
                Cada acción que realizás con Salon Andreas tiene recompensa; todo lo que hacés tiene valor.
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: spacing.lg }} color={tc.primary} />
      ) : loadErr ? (
        <View style={[styles.card, { marginBottom: spacing.md }]}>
          <Text style={styles.cardLead}>{loadErr}</Text>
          <SalonButton variant="mutedFill" title="Reintentar" fullWidth onPress={() => void load()} />
        </View>
      ) : null}

      {!loading && !loadErr && resumen?.rpcMissing ? (
        <View style={[styles.card, { marginBottom: spacing.md, borderColor: tc.primary }]}>
          <Text style={styles.cardLead}>
            Para contar referidos (compra o primera cita), ejecutá en Supabase el script{' '}
            <Text style={styles.leadStrong}>supabase-andreas-premios.sql</Text> (función RPC). El resto de contadores
            ya debería funcionar.
          </Text>
        </View>
      ) : null}

      {!loading && !loadErr ? (
        <>
          {/* Overview visual */}
          <PremiosOverview tc={tc} membershipTier={membershipTier} />

          {/* Tarjetas póster por regla */}
          <Text style={[styles.sectionLabel, { color: tc.foregroundSubtle }]}>TUS PUNTOS POR REGLA</Text>

          <PosterRuleCard
            icon={Wallet}
            iconKey="wallet"
            title="App · efectivo y retiro en salón"
            body={`1 punto por cada producto en pedidos de la app pagados en efectivo con retiro en Salon Andreas. ${efectiveMeta} puntos: ${efectiveDiscount}% de descuento en tu próxima compra.`}
            current={productosAppEfectivoRetiro}
            meta={efectiveMeta}
            discount={efectiveDiscount}
            tc={tc}
          />
          <PosterRuleCard
            icon={Truck}
            iconKey="truck"
            title="App · tarjeta y envío a domicilio"
            body={`1 punto por cada producto en pedidos de la app con tarjeta y envío a domicilio. ${efectiveMeta} puntos: ${efectiveDiscount}% en tu próxima compra con delivery.`}
            current={productosAppTarjetaDelivery}
            meta={efectiveMeta}
            discount={efectiveDiscount}
            tc={tc}
          />
          <PosterRuleCard
            icon={Scissors}
            iconKey="calendar"
            title="Citas verificadas"
            body={`1 punto por cada cita en estado completada. ${efectiveMeta} citas verificadas: ${efectiveDiscount}% de descuento en servicio + producto.`}
            current={citasOk}
            meta={efectiveMeta}
            discount={efectiveDiscount}
            tc={tc}
          />
          <PosterRuleCard
            icon={Store}
            iconKey="store"
            title="Producto en salón físico"
            body={`Cada producto comprado en el salón lo registra recepción en tu ficha. ${efectiveMeta} unidades: ${efectiveDiscount}% en la siguiente compra en salón.`}
            current={salonFisico}
            meta={efectiveMeta}
            discount={efectiveDiscount}
            tc={tc}
          />

          {/* Referidos visual */}
          <Text style={[styles.sectionLabel, { color: tc.foregroundSubtle }]}>REFERIDOS</Text>
          <ReferidosPoster
            referidosOk={referidosOk}
            meta={META_REFERIDOS}
            codigo={codigo}
            onCopy={copyCode}
            onShare={shareReferral}
            tc={tc}
          />

          {/* Canjes como tickets */}
          <Text style={[styles.sectionLabel, { color: tc.foregroundSubtle }]}>CANJES DISPONIBLES</Text>
          <View style={[styles.card, { paddingTop: spacing.xs }]}>
            <View style={[styles.cardHeadRow, { marginBottom: spacing.sm }]}>
              <Gift size={20} color={tc.primary} strokeWidth={2} />
              <Text style={styles.cardTitleFlush}>Tocá para ver condición completa</Text>
            </View>
            {canjesIlustrativos.map((c) => (
              <CanjeTicket
                key={c.id}
                titulo={c.titulo}
                detalle={c.detalle}
                isActive={canjeTap === c.id}
                onPress={() => onCanjeInfo(c.id, c.titulo, c.detalle)}
                tc={tc}
              />
            ))}
          </View>
        </>
      ) : null}

      <Modal
        visible={modalSalonFisico}
        animationType="slide"
        transparent
        onRequestClose={() => setModalSalonFisico(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: tc.card, paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md },
            ]}
          >
            <View style={styles.modalHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Store size={20} color={tc.primary} strokeWidth={2} />
                <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Salón físico</Text>
              </View>
              <TouchableOpacity onPress={() => setModalSalonFisico(false)} hitSlop={12}>
                <X size={22} color={tc.foregroundMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardLead}>
              Cada producto que comprás en el salón (no en la app) lo registra recepción en tu ficha. Llevás{' '}
              <Text style={styles.leadStrong}>{salonFisico}</Text> de{' '}
              <Text style={styles.leadStrong}>{efectiveMeta}</Text> unidades verificadas.
            </Text>
            <View
              style={[
                { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: spacing.md, backgroundColor: tc.iconCircleBg ?? '#F3F3F3' },
              ]}
            >
              <View style={[{ height: '100%', borderRadius: 5, width: `${Math.min(1, salonFisico / (efectiveMeta || META_SALON_BASE || 8)) * 100}%`, backgroundColor: '#BF7B2D' }]} />
            </View>
            <Text style={[styles.cardLead, { marginBottom: spacing.md }]}>
              Al completar {efectiveMeta} unidades, podés canjear{' '}
              <Text style={styles.leadStrong}>19,99%</Text> de descuento en la compra del siguiente producto en Salon
              Andreas. Si acabás de comprar en salón y no ves el cambio, pedí en recepción que lo registren y tocá
              actualizar.
            </Text>
            <SalonButton
              variant="heroGold"
              title={loading ? 'Actualizando…' : 'Actualizar progreso'}
              fullWidth
              disabled={loading}
              onPress={() => void load()}
            />
            <SalonButton
              variant="outlineGray"
              title="Cerrar"
              fullWidth
              style={{ marginTop: spacing.sm }}
              onPress={() => setModalSalonFisico(false)}
            />
          </View>
        </View>
      </Modal>

      <SalonButton variant="outlineGray" title="Cerrar" fullWidth onPress={onClose} />
      <Text style={styles.footNote}>
        Reglas y exclusiones las confirma el equipo en App Salón; los canjes de premios ANDREAS se coordinan en
        recepción Salon Andreas.
      </Text>
    </>
  );
}

// ─── Estilos secundarios ──────────────────────────────────────────────────────

const posterStyles = StyleSheet.create({
  cardWrap: {
    marginBottom: spacing.md,
    borderRadius: radii.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  posterHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  deco1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  deco2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  posterHeaderInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  posterLeft: {
    flex: 1,
    gap: 8,
  },
  posterIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  rewardPillTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  posterRight: {
    alignItems: 'center',
    gap: 6,
  },
  posterEmoji: {
    fontSize: 42,
    lineHeight: 48,
  },
  completedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  completedTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    color: '#FFF',
    letterSpacing: 0.8,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countNum: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    lineHeight: 26,
  },
  countOf: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  posterBody: {
    padding: spacing.md,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    borderWidth: 1,
    borderTopWidth: 0,
  },
  posterTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    marginBottom: 4,
  },
  posterBodyTxt: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  progressRow: {
    gap: 4,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

const overviewStyles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  item: {
    alignItems: 'center',
    gap: 5,
    minWidth: 54,
  },
  emojiCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  sub: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
  },
  bonusBanner: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  bonusTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});

const refStyles = StyleSheet.create({
  cardWrap: {
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#C9A24D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  banner: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    overflow: 'hidden',
  },
  bannerDecoL: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(201,162,77,0.06)',
  },
  bannerDecoR: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(201,162,77,0.05)',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  bannerLeft: {
    flex: 1,
    gap: 6,
  },
  personBubbles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  personBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  personsLabel: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginLeft: 6,
  },
  bannerTitle: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201,162,77,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(201,162,77,0.4)',
  },
  rewardChipTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    color: '#C9A24D',
  },
  plusSign: {
    fontFamily: typography.fontDisplay,
    fontSize: 16,
    color: 'rgba(201,162,77,0.7)',
  },
  bannerRight: {
    alignItems: 'center',
    gap: 6,
  },
  bigEmoji: {
    fontSize: 48,
    lineHeight: 54,
  },
  completedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C9A24D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  completedTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    color: '#1a0f00',
    letterSpacing: 0.5,
  },
  progressWrap: {
    gap: 4,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    color: 'rgba(201,162,77,0.9)',
  },
  codeSection: {
    padding: spacing.md,
  },
  codeLead: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  codeLeft: { gap: 2 },
  codeLabel: {
    fontFamily: typography.fontSansMedium,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  codeValue: {
    fontFamily: typography.fontSansMedium,
    fontSize: 18,
    letterSpacing: 1,
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#C9A24D',
    borderRadius: radii.pill,
    paddingVertical: 13,
  },
  shareTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: '#1a0f00',
  },
});

const ticketStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  stub: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
  },
  stubDiscount: {
    fontFamily: typography.fontDisplay,
    fontSize: 17,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  stubOff: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  perfWrap: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
  },
  semicircleTop: {
    width: 14,
    height: 7,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  semicircleBottom: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  body: {
    flex: 1,
    padding: spacing.sm,
    paddingLeft: 6,
    justifyContent: 'center',
  },
  bodyTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 3,
  },
  bodyDetail: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  bodyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  condChip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  condTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

// ─── Estilos principales ──────────────────────────────────────────────────────

function createPremiosStyles(c) {
  const gold = c.primary ?? '#C9A24D';
  const goldLight = '#E8D4A8';
  const goldBorder = 'rgba(201, 162, 77, 0.38)';
  const goldBorderSoft = 'rgba(201, 162, 77, 0.22)';

  return StyleSheet.create({
    heroBorderColor: goldBorder,
    heroGoldBorder: goldBorder,
    heroGoldBorderSoft: goldBorderSoft,
    heroTaglineBg: 'rgba(201, 162, 77, 0.1)',
    heroTaglineColor: goldLight,
    heroWrap: {
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      ...Platform.select({
        ios: { shadowColor: gold, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 18 },
        android: { elevation: 10 },
      }),
    },
    hero: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      borderWidth: 1,
    },
    heroSheen: {
      ...StyleSheet.absoluteFillObject,
    },
    heroInner: {
      padding: spacing.lg,
      paddingTop: spacing.md,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    heroActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    heroIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    heroTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    heroEyebrow: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: goldLight,
    },
    heroDivider: {
      width: 44,
      height: 2,
      borderRadius: 1,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      opacity: 0.9,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(201, 162, 77, 0.14)',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    heroBadgeTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 11,
      color: goldLight,
      letterSpacing: 1.2,
    },
    heroPoints: {
      fontFamily: typography.fontDisplay,
      fontSize: 36,
      color: '#FFFFFF',
      letterSpacing: -0.8,
      textShadowColor: 'rgba(201, 162, 77, 0.35)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    heroPointsLabel: {
      fontFamily: typography.fontSans,
      fontSize: 12,
      color: 'rgba(255,255,255,0.68)',
      letterSpacing: 0.3,
      marginBottom: spacing.md,
    },
    heroTaglineBox: {
      borderRadius: radii.sm,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    heroTagline: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      lineHeight: 21,
      letterSpacing: 0.2,
      textAlign: 'center',
    },
    sectionLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 10,
      letterSpacing: 1.4,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    cardHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    cardTitle: {
      fontFamily: typography.fontSansMedium,
      fontSize: 16,
      color: c.foreground,
      marginBottom: spacing.xs,
    },
    cardTitleFlush: {
      fontFamily: typography.fontSansMedium,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    cardLead: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted ?? '#6B6B6B',
      lineHeight: 19,
      marginBottom: spacing.sm,
    },
    leadStrong: {
      fontFamily: typography.fontSansMedium,
      color: c.foreground,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    footNote: {
      fontFamily: typography.fontSans,
      fontSize: 11,
      color: c.foregroundSubtle ?? '#888',
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      lineHeight: 15,
    },
  });
}
