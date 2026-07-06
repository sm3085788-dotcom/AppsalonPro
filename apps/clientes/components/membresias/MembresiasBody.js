import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Medal, Sparkles, Check, KeyRound, Gem } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  MEMBRESIA_TIERS,
  getMembresiaTier,
  db,
  membresiaLabel,
  normalizeMembresiaCodigoInput,
  computeMembresiaStatusFromRow,
  isPaymentGatewayConfigured,
  isPaymentGatewayConfigured as isStripeConfigured,
  checkoutMembresiaConQPayPro,
  checkoutMembresiaConQPayPro as checkoutMembresiaConStripe,
  getMembresiaMonthlyGtq,
} from '@appsalon/shared-config';
import { SalonButton } from '../luxury/SalonButton';
import { useTheme } from '../../theme/ThemeProvider';
import { CustomerServiceIcon } from '../social/CustomerServiceIcon';
import { useClientLocale } from '../../hooks/useClientLocale';

const SALON_PHONE_TEL = 'tel:+50247132123';
const SALON_PHONE_DISPLAY = '+502 4713-2123';

const GOLD        = '#C9A24D';
const GOLD_LIGHT  = '#F5E6A8';
const GOLD_BORDER = 'rgba(201,162,77,0.38)';

const TIER_ICONS = { bronce: Medal, plata: Sparkles, vip: Crown };

// Gradientes poster por tier (mismo estilo que Premios)
const TIER_CONFIG = {
  bronce: { gradient: ['#2a1600', '#4a2a0a', '#6b3e14'], headerGrad: ['#3a1e00', '#6b3a10'] },
  plata:  { gradient: ['#141420', '#25253a', '#38385a'], headerGrad: ['#1e1e30', '#38385a'] },
  vip:    { gradient: ['#0a0600', '#3a2c00', '#6a5000'], headerGrad: ['#0f0900', '#7a5c00', '#C9A24D'] },
};

function formatMembresiaPrice(nivel, localeTag) {
  const q = getMembresiaMonthlyGtq(nivel);
  if (q == null) return null;
  return `Q ${q.toLocaleString(localeTag)}`;
}

function getTierCopy(strings, tierId) {
  return strings.membresias?.tiers?.[tierId] || {};
}

// ─── Tarjeta poster por tier ─────────────────────────────────────────────────

function TierPosterCard({ tier, isActive, t, strings, localeTag }) {
  const [open, setOpen] = useState(isActive);
  const Icon    = TIER_ICONS[tier.id] || Medal;
  const cfg     = TIER_CONFIG[tier.id] || TIER_CONFIG.bronce;
  const tierCopy = getTierCopy(strings, tier.id);
  const benefits = strings.membresias?.benefits?.[tier.id] || [];
  const priceLabel = formatMembresiaPrice(tier.id, localeTag);
  const tierLabel = tierCopy.label || tier.label;
  const tierSubtitle = tierCopy.subtitle || tier.subtitle;

  return (
    <View style={[posterStyles.cardWrap, isActive && { borderColor: tier.accent + '88', borderWidth: 2 }]}>
      {/* Header del poster */}
      <LinearGradient
        colors={cfg.headerGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={posterStyles.posterHeader}
      >
        {/* Círculo decorativo */}
        <View style={posterStyles.deco} />

        {priceLabel ? (
          <View style={[posterStyles.priceRow, { borderColor: tier.accent + '44' }]}>
            <Text style={[posterStyles.priceAmount, { color: tier.accent }]}>{priceLabel}</Text>
            <Text style={posterStyles.pricePeriod}>{t('membresias.pricePeriod')}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={posterStyles.headerInner}
          onPress={() => setOpen((v) => !v)}
          activeOpacity={0.85}
        >
          {/* Ícono */}
          <View style={[posterStyles.iconWrap, { backgroundColor: tier.accent + '22', borderColor: tier.accent + '55' }]}>
            <Icon size={26} color={tier.accent} strokeWidth={2} />
          </View>

          {/* Nombre + subtítulo */}
          <View style={posterStyles.titleCol}>
            <Text style={[posterStyles.tierName, { color: isActive ? '#FFFFFF' : tier.accent + 'EE' }]}>
              {tierLabel}
            </Text>
            <Text style={posterStyles.tierSub}>{tierSubtitle}</Text>
          </View>

          {/* Badge activo o flecha */}
          {isActive ? (
            <View style={[posterStyles.activePill, { backgroundColor: tier.accent }]}>
              <Check size={10} color="#1a0f00" strokeWidth={3} />
              <Text style={posterStyles.activePillTxt}>{t('membresias.activePill')}</Text>
            </View>
          ) : (
            <Text style={[posterStyles.chevron, { color: tier.accent + '88' }]}>
              {open ? '▲' : '▼'}
            </Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Cuerpo expandible con beneficios */}
      {open ? (
        <LinearGradient
          colors={cfg.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={posterStyles.body}
        >
          {/* Línea dorada */}
          <LinearGradient
            colors={['transparent', tier.accent + '99', tier.accent, tier.accent + '99', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={posterStyles.divider}
          />
          <Text style={[posterStyles.benefitsKicker, { color: tier.accent }]}>{t('membresias.benefitsKicker')}</Text>
          {benefits.map((line, i) => (
            <View key={i} style={posterStyles.benefitRow}>
              <View style={[posterStyles.dot, { backgroundColor: tier.accent }]} />
              <Text style={posterStyles.benefitTxt}>{line}</Text>
            </View>
          ))}
        </LinearGradient>
      ) : null}
    </View>
  );
}

// ─── Card de activación de código ────────────────────────────────────────────

function CodigoCard({ clienteRow, onActivated, onDone, c, t, strings, localeTag }) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const tier = getMembresiaTier(clienteRow?.membresia_nivel);
  const tierCopy = tier ? getTierCopy(strings, tier.id) : null;
  const tierLabel = tierCopy?.label || tier?.label;

  const finishActivation = (data) => {
    setCodigo('');
    const label = data?.label || membresiaLabel(data?.nivel) || t('membresias.codigo.defaultLabel');
    onActivated?.();
    Alert.alert(
      t('membresias.alerts.successTitle'),
      t('membresias.alerts.successBody', { label }),
      [{ text: t('membresias.alerts.successBtn'), onPress: () => onDone?.() }],
    );
  };

  const canjear = async () => {
    const normalized = normalizeMembresiaCodigoInput(codigo);
    if (!normalized) {
      Alert.alert(t('membresias.alerts.codeTitle'), t('membresias.alerts.codeEmpty'));
      return;
    }
    setLoading(true);
    try {
      if (isStripeConfigured()) {
        const preview = await db.membresias.previewCodigo(normalized);
        if (preview.error) {
          Alert.alert(
            t('membresias.alerts.notActivatedTitle'),
            preview.error.message || t('membresias.alerts.notActivatedBody'),
          );
          return;
        }
        const pay = await checkoutMembresiaConQPayPro({
          codigo: normalized,
          nivel: preview.data?.nivel,
          openUrl: (url) => Linking.openURL(url),
        });
        if (!pay.ok) {
          if (!pay.cancelled) {
            Alert.alert(
              t('membresias.alerts.paymentTitle'),
              pay.error?.message || t('membresias.alerts.paymentBody'),
            );
          }
          return;
        }
        if (pay.pendingRedirect) {
          Alert.alert(
            t('membresias.alerts.paymentTitle'),
            'Completa el pago en QPayPro y vuelve a activar el código.',
          );
          return;
        }
      }

      const { data, error } = await db.membresias.canjearCodigo(normalized);
      if (error) {
        Alert.alert(
          t('membresias.alerts.notActivatedTitle'),
          error.message || t('membresias.alerts.notActivatedBody'),
        );
        return;
      }
      finishActivation(data);
    } finally {
      setLoading(false);
    }
  };

  const callSalon = () => {
    Linking.openURL(SALON_PHONE_TEL).catch(() => {});
  };

  return (
    <View style={[codeStyles.wrap, { borderColor: GOLD_BORDER, backgroundColor: c.card }]}>
      {/* Ícono + título */}
      <View style={codeStyles.titleRow}>
        <View style={codeStyles.iconCircle}>
          <Gem size={20} color={GOLD} strokeWidth={1.8} />
        </View>
        <View>
          <Text style={[codeStyles.title, { color: c.foreground }]}>
            {tier
              ? t('membresias.codigo.titleActive', { tier: tierLabel })
              : t('membresias.codigo.titleActivate')}
          </Text>
          {tier ? (
            <Text style={[codeStyles.sub, { color: GOLD }]}>
              {t('membresias.codigo.subSince', {
                date: clienteRow?.membresia_activada_en
                  ? new Date(clienteRow.membresia_activada_en).toLocaleDateString(localeTag)
                  : '—',
              })}
            </Text>
          ) : (
            <Text style={[codeStyles.sub, { color: c.foregroundMuted }]}>
              {t('membresias.codigo.subAdvisor')}
            </Text>
          )}
        </View>
      </View>

      {/* Input */}
      <View style={[codeStyles.inputRow, { borderColor: GOLD_BORDER, backgroundColor: c.surfaceMuted }]}>
        <KeyRound size={16} color={GOLD} strokeWidth={1.8} />
        <TextInput
          style={[codeStyles.input, { color: c.foreground }]}
          placeholder={t('membresias.codigo.placeholder')}
          placeholderTextColor={c.foregroundSubtle}
          value={codigo}
          onChangeText={(v) => setCodigo(normalizeMembresiaCodigoInput(v))}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[codeStyles.supportRow, { borderColor: GOLD_BORDER, backgroundColor: c.surfaceMuted }]}
        onPress={callSalon}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('membresias.codigo.supportA11y')}
      >
        <CustomerServiceIcon size={28} color={GOLD} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[codeStyles.supportLabel, { color: c.foreground }]}>{t('membresias.codigo.supportLabel')}</Text>
          <Text style={[codeStyles.supportSub, { color: c.foregroundMuted }]}>{SALON_PHONE_DISPLAY}</Text>
        </View>
        <Text style={[codeStyles.supportAction, { color: GOLD }]}>{t('membresias.codigo.supportAction')}</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: spacing.sm }} />
      ) : (
        <SalonButton
          title={tier ? t('membresias.codigo.btnChange') : t('membresias.codigo.btnActivate')}
          variant="heroGold"
          fullWidth
          onPress={canjear}
          style={{ marginTop: spacing.sm }}
        />
      )}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function MembresiasBody({ clienteRow, onMembershipChanged, onClose }) {
  const { colors: c } = useTheme();
  const { t, strings, localeTag } = useClientLocale();
  const activeTier = getMembresiaTier(clienteRow?.membresia_nivel);
  const activeTierCopy = activeTier ? getTierCopy(strings, activeTier.id) : null;
  const activeTierLabel = activeTierCopy?.label || activeTier?.label;
  const membresiaStatus = useMemo(() => computeMembresiaStatusFromRow(clienteRow), [clienteRow]);
  const renewalDaysSuffix = membresiaStatus.daysLeft === 1 ? '' : 's';

  return (
    <>
      {membresiaStatus.showRenewalReminder && membresiaStatus.active ? (
        <View style={[heroStyles.reminderBanner, { backgroundColor: c.surfaceMuted, borderColor: c.primary }]}>
          <Text style={[heroStyles.reminderTitle, { color: c.primary }]}>
            {t('membresias.renewalTitle', { days: membresiaStatus.daysLeft })}
          </Text>
          <Text style={[heroStyles.reminderTxt, { color: c.foregroundMuted }]}>
            {t('membresias.renewalMessage', {
              days: membresiaStatus.daysLeft,
              daysSuffix: renewalDaysSuffix,
            })}
          </Text>
        </View>
      ) : null}
      {membresiaStatus.active && membresiaStatus.venceEn ? (
        <Text style={[heroStyles.vigenciaTxt, { color: c.foregroundSubtle }]}>
          {t('membresias.vigencia', {
            date: new Date(membresiaStatus.venceEn).toLocaleDateString(localeTag),
          })}
        </Text>
      ) : null}
      {/* Hero estilo Premios */}
      <View style={heroStyles.wrap}>
        <LinearGradient
          colors={['#1A1612', '#0C0B0A', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={heroStyles.hero}
        >
          <LinearGradient
            colors={['rgba(201,162,77,0.22)', 'rgba(201,162,77,0.04)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.2, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View style={heroStyles.inner}>
            {/* Badge */}
            <View style={heroStyles.badge}>
              <Crown size={13} color={GOLD} strokeWidth={2.2} />
              <Text style={heroStyles.badgeTxt}>{t('membresias.badge')}</Text>
            </View>

            {/* Título */}
            <View style={heroStyles.titleRow}>
              <Gem size={15} color={GOLD} strokeWidth={2} />
              <Text style={heroStyles.eyebrow}>{t('membresias.eyebrow')}</Text>
            </View>
            <Text style={heroStyles.title}>
              {activeTier
                ? t('membresias.titleActive', { tier: activeTierLabel })
                : t('membresias.titlePick')}
            </Text>

            {/* Línea */}
            <View style={heroStyles.divider} />

            <Text style={heroStyles.sub}>
              {activeTier ? t('membresias.subActive') : t('membresias.subPick')}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Card de código */}
      <CodigoCard
        clienteRow={clienteRow}
        onActivated={onMembershipChanged}
        onDone={onClose}
        c={c}
        t={t}
        strings={strings}
        localeTag={localeTag}
      />

      {/* Label sección */}
      <Text style={[sectionStyles.label, { color: c.foregroundSubtle }]}>{t('membresias.levelsLabel')}</Text>

      {/* Tarjetas poster */}
      {MEMBRESIA_TIERS.map((tier) => (
        <TierPosterCard
          key={tier.id}
          tier={tier}
          isActive={activeTier?.id === tier.id}
          t={t}
          strings={strings}
          localeTag={localeTag}
        />
      ))}

      <Text style={[sectionStyles.foot, { color: c.foregroundSubtle }]}>
        {t('membresias.foot')}
      </Text>
    </>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const heroStyles = StyleSheet.create({
  reminderBanner: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reminderTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    marginBottom: 4,
  },
  reminderTxt: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    lineHeight: 19,
  },
  vigenciaTxt: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  wrap: {
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    ...Platform.select({
      ios: { shadowColor: GOLD, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  hero: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    overflow: 'hidden',
  },
  inner: { padding: spacing.lg, paddingTop: spacing.md },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201,162,77,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  badgeTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    color: GOLD_LIGHT,
    letterSpacing: 1.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: GOLD_LIGHT,
  },
  title: {
    fontFamily: typography.fontDisplay,
    fontSize: 34,
    color: '#FFFFFF',
    letterSpacing: -0.6,
    textShadowColor: 'rgba(201,162,77,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  divider: {
    width: 44,
    height: 2,
    borderRadius: 1,
    backgroundColor: GOLD,
    opacity: 0.85,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 19,
  },
});

const codeStyles = StyleSheet.create({
  wrap: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(201,162,77,0.1)',
    borderWidth: 1,
    borderColor: GOLD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
  },
  sub: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    letterSpacing: 1.2,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  supportLabel: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
  },
  supportSub: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    marginTop: 2,
  },
  supportAction: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
  },
});

const posterStyles = StyleSheet.create({
  cardWrap: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  posterHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 1,
  },
  priceAmount: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  pricePeriod: {
    fontFamily: typography.fontSans,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginLeft: 4,
  },
  deco: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: { flex: 1 },
  tierName: {
    fontFamily: typography.fontDisplay,
    fontSize: 22,
    letterSpacing: -0.2,
  },
  tierSub: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  activePillTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    color: '#1a0f00',
    letterSpacing: 0.5,
  },
  chevron: {
    fontFamily: typography.fontSans,
    fontSize: 12,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  benefitsKicker: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 7,
    flexShrink: 0,
  },
  benefitTxt: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 19,
    flex: 1,
  },
});

const sectionStyles = StyleSheet.create({
  label: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  foot: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    lineHeight: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
