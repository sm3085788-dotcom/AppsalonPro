import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  Check,
} from 'lucide-react-native';
import { SalonButton } from '../luxury/SalonButton';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { db, supabase, ANDREAS_META, getReferralPrizeByCiclo, ANDREAS_REFERRAL_META, buildReferralShareMessage, buildReferralInviteUrl } from '@appsalon/shared-config';
import {
  buildPremiosCanjeFlags,
  anyPremiosCanjeReady,
  resolvePremiosMeta,
} from '../../utils/premiosPointsAlert';

const BASE_META = ANDREAS_META.appEfectivoRetiro;   // 8 por defecto
const META_SALON_BASE = ANDREAS_META.salon;          // para el modal de salón físico
const META_REFERIDOS = ANDREAS_META.referidos;       // siempre 3, sin efecto membresía
const BASE_DISCOUNT = 19.99;

/** Bonus por nivel de membresía (no aplica a referidos). */
const MEMBRESIA_BONUS = {
  bronce: { metaReduction: 1, discountBonus: 15, label: 'Bronce',  accent: '#B87333' },
  plata:  { metaReduction: 2, discountBonus: 30, label: 'Plata',   accent: '#9CA3AF' },
  vip:    { metaReduction: 3, discountBonus: 55, label: 'VIP',     accent: '#C5A368' },
};

function getMembershipTier(nivel) {
  const id = String(nivel || '').toLowerCase().trim();
  const bonus = MEMBRESIA_BONUS[id];
  if (!bonus) return null;
  const meta = BASE_META - bonus.metaReduction;          // 7, 6, or 5
  const discount = (BASE_DISCOUNT + bonus.discountBonus).toFixed(2); // 34.99, 49.99, 74.99
  return {
    id,
    ...bonus,
    meta,
    discount,
    bonusDesc: `Membresía ${bonus.label}: descuento ${discount}% (en vez de ${BASE_DISCOUNT}%) · meta ${meta} pts (en vez de 8)`,
  };
}

const MEMBRESIA_PREVIEW_OPTIONS = [
  { id: 'estandar', label: 'Estándar', meta: BASE_META, discount: BASE_DISCOUNT.toFixed(2), accent: '#888888' },
  ...Object.entries(MEMBRESIA_BONUS).map(([id, b]) => ({
    id,
    label: b.label,
    meta: BASE_META - b.metaReduction,
    discount: (BASE_DISCOUNT + b.discountBonus).toFixed(2),
    accent: b.accent,
  })),
];

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
    rewardLine: '19,99% en un servicio',
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

function ReferidoInvitadoBanner({ tc, pendingTotal }) {
  return (
    <View style={[overviewStyles.referidoBanner, { backgroundColor: tc.surfaceMuted, borderColor: tc.primary }]}>
      <Text style={[overviewStyles.referidoBannerTitle, { color: tc.primary }]}>Invitado ANDREAS</Text>
      <Text style={[overviewStyles.referidoBannerTxt, { color: tc.foregroundMuted }]}>
        Entraste con código de referido: cada compra y cita suman puntos en tu cuenta Estándar, igual que cualquier
        cliente.
        {pendingTotal > 0
          ? ` Tenés ${pendingTotal} punto${pendingTotal === 1 ? '' : 's'} en camino hasta que el salón verifique tu pedido o visita.`
          : ''}
      </Text>
    </View>
  );
}

function PosterRuleCard({
  icon: Icon,
  iconKey,
  title,
  body,
  current,
  pending = 0,
  meta,
  discount,
  tc,
  canjePendienteReminder = false,
}) {
  const cfg = RULE_POSTER_CONFIG[iconKey] || RULE_POSTER_CONFIG.wallet;
  const verified = Math.max(0, Number(current) || 0);
  const enCamino = Math.max(0, Number(pending) || 0);
  const displayTotal = verified + enCamino;
  const progress = Math.min(1, meta > 0 ? displayTotal / meta : 0);
  const remaining = Math.max(0, meta - verified);
  const completed = verified >= meta;

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
                <Text style={[posterStyles.countNum, { color: '#FFF' }]}>
                  {verified}
                  {enCamino > 0 ? `+${enCamino}` : ''}
                </Text>
                <Text style={[posterStyles.countOf, { color: 'rgba(255,255,255,0.65)' }]}>/{meta}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Card body */}
      <View style={[posterStyles.posterBody, { backgroundColor: tc.card, borderColor: tc.cardBorder }]}>
        <Text style={[posterStyles.posterTitle, { color: tc.foreground }]}>{title}</Text>
        {canjePendienteReminder ? (
          <View
            style={[
              posterStyles.pendingCanjeBanner,
              { backgroundColor: 'rgba(232,163,23,0.12)', borderColor: 'rgba(232,163,23,0.45)' },
            ]}
          >
            <Text style={[posterStyles.pendingCanjeTxt, { color: '#B8860B' }]}>
              Canje pendiente — aún no lo usaste. Sigue acumulando puntos; el beneficio queda guardado en tu ticket.
            </Text>
          </View>
        ) : null}
        <Text style={[posterStyles.posterBodyTxt, { color: tc.foregroundMuted }]}>{body}</Text>

        {/* Progress bar */}
        <View style={posterStyles.progressRow}>
          <View style={[posterStyles.track, { backgroundColor: tc.iconCircleBg ?? '#F3F3F3' }]}>
            <View style={[posterStyles.fill, { width: `${progress * 100}%`, backgroundColor: cfg.accent }]} />
          </View>
          <Text style={[posterStyles.progressLabel, { color: completed ? cfg.accent : tc.foregroundSubtle }]}>
            {completed
              ? '¡Podés canjear!'
              : enCamino > 0
                ? `Faltan ${remaining} · +${enCamino} en camino`
                : `Faltan ${remaining}`}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Tarjeta intro de premios (overview visual) ─────────────────────────────

function PremiosOverview({ tc, membershipTier, selectedMembresiaId, onSelectMembresia, efectiveMeta }) {
  const items = [
    { emoji: '💵', label: 'Efectivo\nRetiro', color: '#22A05A' },
    { emoji: '📦', label: 'Tarjeta\nDelivery', color: '#1E6DB0' },
    { emoji: '✂️', label: 'Citas', color: '#7B2DBF' },
    { emoji: '🛍️', label: 'Salón\nFísico', color: '#BF7B2D' },
    { emoji: '👥', label: 'Referidos', color: '#C9A24D' },
  ];
  const activePreview = MEMBRESIA_PREVIEW_OPTIONS.find((o) => o.id === selectedMembresiaId) ?? MEMBRESIA_PREVIEW_OPTIONS[0];

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

      <Text style={[overviewStyles.membresiaLbl, { color: tc.foregroundMuted }]}>Tu membresía · meta de canje</Text>
      <View style={overviewStyles.membresiaRow}>
        {MEMBRESIA_PREVIEW_OPTIONS.map((opt) => {
          const on = selectedMembresiaId === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                overviewStyles.membresiaChip,
                { borderColor: on ? opt.accent : tc.cardBorder, backgroundColor: on ? opt.accent + '22' : tc.surfaceMuted },
              ]}
              onPress={() => onSelectMembresia(opt.id)}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${opt.label}, ${opt.meta} puntos para canjear`}
            >
              <Text style={[overviewStyles.membresiaChipLbl, { color: on ? opt.accent : tc.foregroundMuted }]}>
                {opt.label}
              </Text>
              <Text style={[overviewStyles.membresiaChipMeta, { color: on ? tc.foreground : tc.foregroundSubtle }]}>
                {opt.meta} pts
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {membershipTier && selectedMembresiaId === membershipTier.id ? (
        <View style={[overviewStyles.bonusBanner, { backgroundColor: membershipTier.accent + '18', borderColor: membershipTier.accent + '55' }]}>
          <Text style={[overviewStyles.bonusTxt, { color: membershipTier.accent }]}>
            {membershipTier.bonusDesc}
          </Text>
        </View>
      ) : selectedMembresiaId !== 'estandar' ? (
        <View style={[overviewStyles.bonusBanner, { backgroundColor: activePreview.accent + '18', borderColor: activePreview.accent + '55' }]}>
          <Text style={[overviewStyles.bonusTxt, { color: activePreview.accent }]}>
            Vista {activePreview.label}: canje con {efectiveMeta} puntos · {activePreview.discount}% de descuento
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

function ReferidosPoster({ referidosOk, meta, codigo, onCopy, onShare, tc, prize }) {
  const progress = Math.min(1, meta > 0 ? referidosOk / meta : 0);
  const remaining = Math.max(0, meta - referidosOk);
  const completed = progress >= 1;
  const p = prize || getReferralPrizeByCiclo(0);

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
            <Text style={refStyles.bannerTitle}>Referidos ANDREAS · Premio {p.ciclo + 1}/3</Text>
            <View style={refStyles.rewardRow}>
              <Text style={refStyles.rewardChipTxt}>{p.emoji} {p.shortTitle}</Text>
            </View>
          </View>
          <View style={refStyles.bannerRight}>
            <Text style={refStyles.bigEmoji}>{p.emoji}</Text>
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
          {p.detail}
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

function metaChipLabel(ruleId, meta) {
  if (ruleId === 'citas') return `${meta} citas`;
  return `${meta} puntos`;
}

function CanjeTicket({
  titulo,
  detalle,
  isReady,
  isActive,
  onPress,
  tc,
  meta,
  ruleId,
  canjePendienteRecordatorio = false,
}) {
  const discountMatch = titulo.match(/(\d+,\d+%)/);
  const discount = discountMatch ? discountMatch[1] : '19,99%';
  const shortTitle = titulo.replace(/\d+,\d+%\s*·?\s*/, '').trim();
  const metaLabel = metaChipLabel(ruleId, meta ?? BASE_META);

  return (
    <TouchableOpacity
      style={[
        ticketStyles.wrap,
        { borderColor: isReady || isActive ? '#C9A24D' : tc.cardBorder },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Left stub */}
      <LinearGradient
        colors={isReady || isActive ? ['#C9A24D', '#E8D4A8'] : ['#1a1412', '#2a2018']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={ticketStyles.stub}
      >
        <Text style={[ticketStyles.stubDiscount, { color: isReady || isActive ? '#1a0f00' : '#C9A24D' }]}>
          {discount}
        </Text>
        <Text style={[ticketStyles.stubOff, { color: isReady || isActive ? '#3a2010' : 'rgba(201,162,77,0.7)' }]}>
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
          {canjePendienteRecordatorio ? (
            <Text style={[ticketStyles.readyLbl, { color: '#E8A317' }]}>Canje pendiente</Text>
          ) : isReady ? (
            <Text style={[ticketStyles.readyLbl, { color: '#C9A24D' }]}>Listo para canjear</Text>
          ) : null}
          <View style={[ticketStyles.condChip, { borderColor: tc.cardBorder }]}>
            <Text style={[ticketStyles.condTxt, { color: tc.foregroundSubtle }]}>{metaLabel}</Text>
          </View>
          <ChevronRight size={14} color={tc.foregroundSubtle} strokeWidth={2} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PremiosDashboard({
  onClose,
  clientUserId,
  clienteRow,
  onPrizeReady,
  onCanjeNavigate,
  onResumenLoaded,
}) {
  const [canjeTap, setCanjeTap] = useState(null);
  const [selectedMembresiaId, setSelectedMembresiaId] = useState('estandar');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resumen, setResumen] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [modalSalonFisico, setModalSalonFisico] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors: tc } = useTheme();
  const styles = useMemo(() => createPremiosStyles(tc), [tc]);
  const clienteId = clienteRow?.id;
  const membresiaNivel = clienteRow?.membresia_nivel;
  const clienteRowRef = useRef(clienteRow);
  const onPrizeReadyRef = useRef(onPrizeReady);
  const onResumenLoadedRef = useRef(onResumenLoaded);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    clienteRowRef.current = clienteRow;
  }, [clienteRow]);

  useEffect(() => {
    onPrizeReadyRef.current = onPrizeReady;
  }, [onPrizeReady]);

  useEffect(() => {
    onResumenLoadedRef.current = onResumenLoaded;
  }, [onResumenLoaded]);

  const load = useCallback(
    async (opts = { showSpinner: true, manual: false }) => {
      const row = clienteRowRef.current;
      if (!clientUserId || !row?.id) {
        setResumen(null);
        setLoadErr(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const seq = ++loadSeqRef.current;
      if (opts.showSpinner) setLoading(true);
      if (opts.manual) setRefreshing(true);
      setLoadErr(null);
      try {
        const r = await db.premiosAndreas.getResumen({ clientUserId, clienteRow: row });
        if (seq !== loadSeqRef.current) return;
        if (r.error) {
          const msg = String(r.error.message || 'No se pudo cargar');
          if (__DEV__) console.warn('[Premios] getResumen:', msg, r.error);
          setLoadErr(msg);
          setResumen(null);
          return;
        }
        setResumen(r);
        const tier = getMembershipTier(membresiaNivel);
        const meta = tier?.meta ?? BASE_META;
        const flags = buildPremiosCanjeFlags(r, meta);
        onPrizeReadyRef.current?.(anyPremiosCanjeReady(flags));
        void onResumenLoadedRef.current?.(r);
      } catch (e) {
        if (seq !== loadSeqRef.current) return;
        setLoadErr(String(e?.message || 'No se pudo cargar'));
        setResumen(null);
      } finally {
        if (seq === loadSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [clientUserId, clienteId, membresiaNivel],
  );

  const manualRefresh = useCallback(() => {
    void load({ showSpinner: false, manual: true });
  }, [load]);

  useEffect(() => {
    void load({ showSpinner: true });
  }, [load]);

  // Si la ficha llega después de abrir Premios, recargar sin bloquear la UI.
  useEffect(() => {
    if (!clienteId || !clientUserId) return;
    void load({ showSpinner: false });
  }, [clienteId, clientUserId]);

  useEffect(() => {
    const clienteId = clienteRow?.id;
    if (!clientUserId || !clienteId) return undefined;
    const channel = supabase
      .channel(`premios-salon-fisico-${clienteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clientes',
          filter: `id=eq.${clienteId}`,
        },
        () => {
          void load({ showSpinner: false });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientUserId, clienteRow?.id, load]);

  useEffect(() => {
    const n = String(clienteRow?.membresia_nivel || '').toLowerCase().trim();
    setSelectedMembresiaId(MEMBRESIA_BONUS[n] ? n : 'estandar');
  }, [clienteRow?.membresia_nivel]);

  const membershipTier = getMembershipTier(clienteRow?.membresia_nivel);
  const previewTier =
    selectedMembresiaId === 'estandar' ? null : getMembershipTier(selectedMembresiaId);
  // Meta efectiva según membresía elegida (sin membresía = 8; bronce = 7; plata = 6; vip = 5)
  const efectiveMeta = previewTier?.meta ?? BASE_META;
  const efectiveDiscount = previewTier?.discount ?? BASE_DISCOUNT.toFixed(2);

  const codigo = resumen?.codigoReferido?.trim() || '—';
  const productosAppEfectivoRetiro = resumen?.productosAppEfectivoRetiro ?? 0;
  const productosAppTarjetaDelivery = resumen?.productosAppTarjetaDelivery ?? 0;
  const productosEfectivoPendiente = resumen?.productosAppEfectivoRetiroPendiente ?? 0;
  const productosTarjetaPendiente = resumen?.productosAppTarjetaDeliveryPendiente ?? 0;
  const citasOk = resumen?.citasVerificadas ?? 0;
  const citasPendientes = resumen?.citasPendientes ?? 0;
  const salonFisico = resumen?.productosSalonFisico ?? 0;
  const esReferidoInvitado = Boolean(resumen?.esReferidoInvitado);
  const puntosEnCamino =
    productosEfectivoPendiente + productosTarjetaPendiente + citasPendientes;
  const referidosOk = resumen?.referidosPrimeraCompra ?? 0;
  const referidosCiclo = resumen?.referidosCiclo ?? 0;
  const referidosPrize = getReferralPrizeByCiclo(referidosCiclo);

  const shareReferral = async () => {
    if (!codigo || codigo === '—') {
      Alert.alert('Premios', 'Iniciá sesión y enlazá tu ficha para obtener tu código de invitación.');
      return;
    }
    const msg = buildReferralShareMessage(codigo, referidosPrize.title);
    const url = buildReferralInviteUrl(codigo);
    try {
      await Share.share({
        message: msg,
        title: 'Invitación Salon Andreas',
        ...(url ? { url } : {}),
      });
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

  const canjeFlags = useMemo(() => {
    if (!resumen) return {};
    const meta = resolvePremiosMeta(clienteRow?.membresia_nivel);
    return buildPremiosCanjeFlags(resumen, meta) || {};
  }, [resumen, clienteRow?.membresia_nivel]);

  const canjePendienteFlags = useMemo(() => {
    const cp = resumen?.canjePendiente;
    if (!cp || typeof cp !== 'object') return {};
    return {
      p_app_efectivo_retiro: Boolean(cp.p_app_efectivo_retiro),
      p_app_tarjeta_delivery: Boolean(cp.p_app_tarjeta_delivery),
      citas: Boolean(cp.citas),
      salon: Boolean(cp.salon),
    };
  }, [resumen?.canjePendiente]);

  const onCanjePress = (id, titulo, detalle) => {
    setCanjeTap(id);
    const ready = Boolean(canjeFlags[id]);
    const pendiente = Boolean(canjePendienteFlags[id]);
    if (!ready) {
      Alert.alert(titulo, detalle, [{ text: 'Entendido', onPress: () => setCanjeTap(null) }]);
      return;
    }
    const acciones = [{ text: 'Cerrar', style: 'cancel', onPress: () => setCanjeTap(null) }];
    if (id === 'p_app_efectivo_retiro' || id === 'p_app_tarjeta_delivery') {
      acciones.unshift({
        text: 'Ir a tienda',
        onPress: () => {
          setCanjeTap(null);
          onCanjeNavigate?.('tienda');
        },
      });
    }
    if (id === 'citas') {
      acciones.unshift({
        text: 'Ver citas',
        onPress: () => {
          setCanjeTap(null);
          onCanjeNavigate?.('citas');
        },
      });
    }
    if (id === 'referidos') {
      acciones.unshift({
        text: 'Ver código',
        onPress: () => setCanjeTap(null),
      });
    }
    const instruccion =
      id === 'salon'
        ? 'Acercate en persona a recepción con la app abierta. El equipo aplica el descuento en tu próxima compra de producto en salón físico (venta en caja).'
        : id === 'p_app_efectivo_retiro' || id === 'p_app_tarjeta_delivery'
          ? 'Al confirmar tu pedido en la app (mismo método de pago y envío de esta regla), el descuento se aplica automáticamente en el total.'
          : id === 'citas'
            ? 'Al agendar tu próxima cita desde Servicios, el descuento se aplica automáticamente en el precio del primer servicio de la solicitud.'
            : 'Presentate en recepción con la app abierta.';
    const tituloAlert = pendiente ? 'Canje pendiente' : 'Canje disponible';
    Alert.alert(tituloAlert, `${titulo}\n\n${instruccion}\n\n${detalle}`, acciones);
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
      titulo: `${d}% en un servicio`,
      detalle: `Con ${m} citas verificadas en el salón (QR escaneado en recepción), obtenés ${d}% de descuento en un servicio profesional en Salon Andreas. Canje presencial en recepción.`,
    },
    {
      id: 'salon',
      titulo: `${d}% próximo producto (salón físico)`,
      detalle: `Cuando adquirís un producto en el salón, la compra se registra con tu nombre y la vinculación de tu perfil en la app. Con ${m} unidades verificadas: ${d}% en la siguiente compra de producto en salón físico.`,
    },
    {
      id: 'referidos',
      titulo: referidosPrize.shortTitle,
      detalle: referidosPrize.detail,
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
                  onPress={manualRefresh}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Actualizar puntos"
                  activeOpacity={0.85}
                  disabled={refreshing}
                  style={[
                    styles.heroIconBtn,
                    { borderColor: styles.heroGoldBorderSoft, opacity: refreshing ? 0.55 : 1 },
                  ]}
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
          <SalonButton variant="mutedFill" title="Reintentar" fullWidth onPress={() => void load({ showSpinner: true })} />
        </View>
      ) : null}

      {!loading && !loadErr && resumen?.rpcMissing ? (
        <View style={[styles.card, { marginBottom: spacing.md, borderColor: tc.primary }]}>
          <Text style={styles.cardLead}>
            Falta configurar Supabase para referidos: ejecutá en el SQL Editor{' '}
            <Text style={styles.leadStrong}>supabase-andreas-premios.sql</Text> y{' '}
            <Text style={styles.leadStrong}>supabase-membresias-referidos-programa.sql</Text>. Los demás contadores
            (app, citas, salón físico) siguen activos.
          </Text>
        </View>
      ) : null}

      {!loading && !loadErr ? (
        <>
          {/* Overview visual */}
          <PremiosOverview
            tc={tc}
            membershipTier={membershipTier}
            selectedMembresiaId={selectedMembresiaId}
            onSelectMembresia={setSelectedMembresiaId}
            efectiveMeta={efectiveMeta}
          />

          {esReferidoInvitado ? (
            <ReferidoInvitadoBanner tc={tc} pendingTotal={puntosEnCamino} />
          ) : null}

          {/* Tarjetas póster por regla */}
          <Text style={[styles.sectionLabel, { color: tc.foregroundSubtle }]}>TUS PUNTOS POR REGLA</Text>

          <PosterRuleCard
            icon={Wallet}
            iconKey="wallet"
            title="App · efectivo y retiro en salón"
            body={`1 punto por cada producto en pedidos de la app pagados en efectivo con retiro en Salon Andreas. ${efectiveMeta} puntos: ${efectiveDiscount}% de descuento en tu próxima compra.`}
            current={productosAppEfectivoRetiro}
            pending={productosEfectivoPendiente}
            meta={efectiveMeta}
            discount={efectiveDiscount}
            tc={tc}
            canjePendienteReminder={canjePendienteFlags.p_app_efectivo_retiro}
          />
          <PosterRuleCard
            icon={Truck}
            iconKey="truck"
            title="App · tarjeta y envío a domicilio"
            body={`1 punto por cada producto en pedidos de la app con tarjeta y envío a domicilio. ${efectiveMeta} puntos: ${efectiveDiscount}% en tu próxima compra con delivery.`}
            current={productosAppTarjetaDelivery}
            pending={productosTarjetaPendiente}
            meta={efectiveMeta}
            discount={efectiveDiscount}
            tc={tc}
            canjePendienteReminder={canjePendienteFlags.p_app_tarjeta_delivery}
          />
          <PosterRuleCard
            icon={Calendar}
            iconKey="calendar"
            title="Citas verificadas"
            body={`1 punto por cita cuando recepción escanea tu QR en la pestaña Citas (citas confirmadas). «En camino» = confirmadas sin escanear aún. ${efectiveMeta} citas verificadas: ${efectiveDiscount}% de descuento en un servicio.`}
            current={citasOk}
            pending={citasPendientes}
            meta={efectiveMeta}
            discount={efectiveDiscount}
            tc={tc}
            canjePendienteReminder={canjePendienteFlags.citas}
          />
          <PosterRuleCard
            icon={Store}
            iconKey="store"
            title="Producto en salón físico"
            body={`Cada producto en una venta de caja con tu cuenta vinculada suma automáticamente. ${efectiveMeta} unidades: ${efectiveDiscount}% en la siguiente compra en salón.`}
            current={salonFisico}
            meta={efectiveMeta}
            discount={efectiveDiscount}
            tc={tc}
            canjePendienteReminder={canjePendienteFlags.salon}
          />

          {/* Referidos visual */}
          <Text style={[styles.sectionLabel, { color: tc.foregroundSubtle }]}>REFERIDOS</Text>
          <ReferidosPoster
            referidosOk={referidosOk}
            meta={ANDREAS_REFERRAL_META}
            codigo={codigo}
            onCopy={copyCode}
            onShare={shareReferral}
            tc={tc}
            prize={referidosPrize}
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
                isReady={Boolean(canjeFlags[c.id])}
                isActive={canjeTap === c.id}
                canjePendienteRecordatorio={Boolean(canjePendienteFlags[c.id])}
                onPress={() => onCanjePress(c.id, c.titulo, c.detalle)}
                tc={tc}
                meta={c.id === 'referidos' ? META_REFERIDOS : efectiveMeta}
                ruleId={c.id}
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
              Cada producto que comprás en el salón (no en la app), con tu nombre de la cuenta vinculada, suma solo al
              registrar la venta en caja. Llevás{' '}
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
              <Text style={styles.leadStrong}>{efectiveDiscount}%</Text> de descuento en la compra del siguiente producto en Salon
              Andreas. La barra se actualiza sola cuando recepción registra tu compra; el botón de abajo es solo por si
              querés refrescar.
            </Text>
            <SalonButton
              variant="outlineGray"
              title={refreshing ? 'Actualizando…' : 'Refrescar progreso'}
              fullWidth
              loading={refreshing}
              disabled={refreshing}
              onPress={manualRefresh}
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
  pendingCanjeBanner: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  pendingCanjeTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
    lineHeight: 17,
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
  membresiaLbl: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  membresiaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  membresiaChip: {
    flexGrow: 1,
    minWidth: '22%',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  membresiaChipLbl: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
  },
  membresiaChipMeta: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    marginTop: 2,
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
  referidoBanner: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  referidoBannerTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 13,
    marginBottom: 4,
  },
  referidoBannerTxt: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    lineHeight: 18,
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
  readyLbl: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    flex: 1,
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
