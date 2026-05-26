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
      <LinearGradient colors={['transparent', 'rgba(15,8,28,0.92)']} style={styles.heroShade} />
      <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving} accessibilityLabel="Guardar imagen">
        {saving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Download size={16} color="#FFFFFF" strokeWidth={2.2} />
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

  return (
    <View style={styles.post}>
      <LinearGradient colors={['#1a0f2e', '#2d1b52', '#3b2766']} style={styles.postShell}>
        <View style={styles.topBar}>
          <View style={styles.kickerRow}>
            <Sparkles size={14} color="#F5E6A8" />
            <Text style={styles.kicker}>Publicidad · Andreas Pro</Text>
          </View>
          <Megaphone size={20} color="rgba(245,230,168,0.9)" strokeWidth={2} />
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
            <Text style={styles.headline} numberOfLines={3}>
              {title}
            </Text>
          ) : null}
          {body ? (
            <Text style={[styles.subcopy, { color: 'rgba(255,255,255,0.82)' }]}>{body}</Text>
          ) : null}

          {linkName ? (
            <View style={styles.linkChip}>
              <Tag size={14} color="#F5E6A8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkChipLbl}>
                  {linkType === BROADCAST_LINK_TYPES.SERVICE ? 'Servicio vinculado' : 'Producto vinculado'}
                </Text>
                <Text style={styles.linkChipName} numberOfLines={1}>
                  {linkName}
                </Text>
              </View>
              {linkPriceLabel ? <Text style={styles.linkChipPrice}>{linkPriceLabel}</Text> : null}
            </View>
          ) : null}
        </View>

        {!readOnly ? (
          <View style={styles.ctaStack}>
            <CtaButton icon={ShoppingBag} label={buyLabel} variant="gold" onPress={() => fire(BROADCAST_PROMO_ACTIONS.BUY)} disabled={busy} />
            <CtaButton icon={Calendar} label={bookLabel} variant="outline" onPress={() => fire(BROADCAST_PROMO_ACTIONS.BOOK)} disabled={busy} />
            <CtaButton icon={Phone} label="Que me llamen" variant="outline" onPress={() => fire(BROADCAST_PROMO_ACTIONS.CALL)} disabled={busy} />
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
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#F5E6A8',
  },
  heroWrap: { width: '100%', height: 200, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFillObject },
  heroPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headline: {
    fontFamily: typography.fontDisplay,
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subcopy: {
    fontFamily: typography.fontSans,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  linkChipLbl: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    color: 'rgba(245,230,168,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  linkChipName: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
  },
  linkChipPrice: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    color: '#D4AF37',
  },
  ctaStack: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.xs },
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
    paddingBottom: spacing.md,
  },
});
