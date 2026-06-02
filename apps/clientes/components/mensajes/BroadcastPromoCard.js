import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Megaphone,
  ShoppingBag,
  Calendar,
  Phone,
  Download,
  Sparkles,
  Tag,
} from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  parseBroadcastContent,
  BROADCAST_PROMO_ACTIONS,
  BROADCAST_LINK_TYPES,
} from '@appsalon/shared-config';
import { saveChatImageWithAlert } from '../../utils/saveChatImage';

const SHELL_GRADIENT = ['#1a0f2e', '#2d1b52', '#3b2766'];

function PromoHeroImage({ uri }) {
  const [saving, setSaving] = useState(false);
  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveChatImageWithAlert(uri);
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={styles.heroWrap}>
      <Image source={{ uri }} style={styles.heroImg} resizeMode="cover" />
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={onSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Guardar imagen"
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Download size={18} color="#FFFFFF" strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function CtaButton({ icon: Icon, label, onPress, variant = 'gold', disabled }) {
  const gold = variant === 'gold';
  return (
    <TouchableOpacity
      style={[styles.cta, gold ? styles.ctaGold : styles.ctaOutline, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
    >
      <Icon size={17} color={gold ? '#1a1024' : '#F5E6A8'} strokeWidth={2.2} />
      <Text style={[styles.ctaTxt, gold ? styles.ctaTxtDark : styles.ctaTxtLight]} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LinkedOfferRow({ linkType, linkName, linkPriceLabel }) {
  const isService = linkType === BROADCAST_LINK_TYPES.SERVICE;
  return (
    <View style={styles.linkBox}>
      <View style={styles.linkIconWrap}>
        <Tag size={16} color="#F5E6A8" strokeWidth={2} />
      </View>
      <View style={styles.linkMain}>
        <Text style={styles.linkLbl}>{isService ? 'Servicio vinculado' : 'Producto vinculado'}</Text>
        <Text style={styles.linkName} numberOfLines={2}>
          {linkName}
        </Text>
      </View>
      {linkPriceLabel ? <Text style={styles.linkPrice}>{linkPriceLabel}</Text> : null}
    </View>
  );
}

export function BroadcastPromoCard({ item, createdAtLabel, onAction, busy, readOnly = false }) {
  const parsed = parseBroadcastContent(item?.content);
  const { title, body, linkType, linkName, linkPriceLabel } = parsed;
  const hasImage = Boolean(item.media_url && item.media_kind === 'image');

  const fire = (action) => {
    if (busy) return;
    onAction?.(action, item);
  };

  const buyLabel =
    linkType === BROADCAST_LINK_TYPES.PRODUCT && linkName
      ? `Comprar · ${linkName}`
      : 'Comprar en tienda';
  const bookLabel =
    linkType === BROADCAST_LINK_TYPES.SERVICE && linkName
      ? `Agendar · ${linkName}`
      : 'Agendar cita';
  const hasLinkedProduct =
    linkType === BROADCAST_LINK_TYPES.PRODUCT && Boolean(linkName);
  const hasLinkedService =
    linkType === BROADCAST_LINK_TYPES.SERVICE && Boolean(linkName);

  return (
    <View style={styles.post}>
      <LinearGradient colors={SHELL_GRADIENT} style={styles.postShell}>
        <View style={styles.topBar}>
          <View style={styles.kickerRow}>
            <Sparkles size={14} color="#F5E6A8" />
            <Text style={styles.kicker}>Publicidad · Andreas Pro</Text>
          </View>
          <Megaphone size={18} color="rgba(245,230,168,0.9)" strokeWidth={2} />
        </View>

        {hasImage ? (
          <PromoHeroImage uri={item.media_url} />
        ) : (
          <LinearGradient colors={['#5B3CAD', '#7C3AED']} style={styles.heroPlaceholder}>
            <Megaphone size={40} color="rgba(255,255,255,0.35)" />
          </LinearGradient>
        )}

        <View style={styles.copyBlock}>
          {title ? (
            <View style={styles.headlineBlock}>
              <Text style={styles.headlineLbl}>Promo</Text>
              <Text style={styles.headline} numberOfLines={4}>
                {title}
              </Text>
            </View>
          ) : null}
          {body ? <Text style={styles.subcopy}>{body}</Text> : null}

          {linkName ? (
            <LinkedOfferRow
              linkType={linkType}
              linkName={linkName}
              linkPriceLabel={linkPriceLabel}
            />
          ) : null}
        </View>

        {!readOnly ? (
          <View style={styles.ctaStack}>
            <CtaButton
              icon={ShoppingBag}
              label={buyLabel}
              variant={hasLinkedProduct ? 'gold' : 'outline'}
              onPress={() => fire(BROADCAST_PROMO_ACTIONS.BUY)}
              disabled={busy}
            />
            <CtaButton
              icon={Calendar}
              label={bookLabel}
              variant={hasLinkedService ? 'gold' : 'outline'}
              onPress={() => fire(BROADCAST_PROMO_ACTIONS.BOOK)}
              disabled={busy}
            />
            <CtaButton
              icon={Phone}
              label="Que me llamen"
              variant="outline"
              onPress={() => fire(BROADCAST_PROMO_ACTIONS.CALL)}
              disabled={busy}
            />
          </View>
        ) : null}

        {createdAtLabel ? <Text style={styles.meta}>{createdAtLabel}</Text> : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radii.lg + 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  postShell: { borderRadius: radii.lg + 4, overflow: 'hidden' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  kicker: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#F5E6A8',
  },
  heroWrap: {
    width: '100%',
    height: 240,
    position: 'relative',
    backgroundColor: '#0f0a18',
  },
  heroImg: { width: '100%', height: '100%' },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headlineBlock: { gap: 2 },
  headlineLbl: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(245,230,168,0.75)',
  },
  headline: {
    fontFamily: typography.fontDisplay,
    fontSize: 24,
    lineHeight: 30,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subcopy: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.82)',
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.32)',
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(212,175,55,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkMain: { flex: 1, minWidth: 0, gap: 2 },
  linkLbl: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    color: 'rgba(245,230,168,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  linkName: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  linkPrice: {
    fontFamily: typography.fontSansMedium,
    fontSize: 16,
    color: '#D4AF37',
    flexShrink: 0,
  },
  ctaStack: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
  },
  ctaGold: { backgroundColor: '#D4AF37' },
  ctaOutline: {
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.5)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ctaTxt: { fontFamily: typography.fontSansMedium, fontSize: 14, flexShrink: 1, textAlign: 'center' },
  ctaTxtDark: { color: '#1a1024' },
  ctaTxtLight: { color: '#F5E6A8' },
  meta: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
});
