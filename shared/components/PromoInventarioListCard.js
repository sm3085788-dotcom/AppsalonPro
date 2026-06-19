import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tag, Sparkles, ChevronRight } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  parsePromoInventarioContent,
  BROADCAST_PROMO_ACTIONS,
} from '@appsalon/shared-config';

/** Amarillo pastel suave (no girasol brillante). Compartido: App Clientes + App Salón. */
export const PROMO_INVENTARIO_CARD_VERSION = 3;

const PASTEL = {
  cream: '#FFFDF5',
  butter: '#FFF6D9',
  wash: '#FFF0C8',
  border: '#E8D9A8',
  accent: '#C4A55A',
  accentSoft: '#D9C48A',
  text: '#5C4A28',
  textMuted: '#8A7348',
  textDark: '#FFF8EB',
  textMutedDark: '#D4C090',
  shellLight: ['#FFFDF5', '#FFF6D9'],
  shellDark: ['#3A3424', '#4A4332'],
};
const THUMB = 56;

function PromoThumb({ uri, isDark }) {
  const [broken, setBroken] = useState(false);
  const tagColor = isDark ? PASTEL.accentSoft : PASTEL.accent;

  if (!uri || broken) {
    return (
      <View
        style={[
          styles.thumb,
          styles.thumbPlaceholder,
          {
            backgroundColor: isDark ? 'rgba(255,246,217,0.12)' : PASTEL.butter,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(232,217,168,0.35)' : PASTEL.border,
          },
        ]}
      >
        <Tag size={18} color={tagColor} strokeWidth={2} />
      </View>
    );
  }

  return (
    <View style={styles.thumbWrap}>
      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" onError={() => setBroken(true)} />
    </View>
  );
}

function firePromoRowAction({ promo, item, onAction, busy }) {
  if (busy || !onAction) return;
  const isService = promo.articuloTipo === 'servicio';
  const action = isService ? BROADCAST_PROMO_ACTIONS.BOOK : BROADCAST_PROMO_ACTIONS.BUY;
  onAction(action, item);
}

/** Fila compacta: portada + nombre + precio (tocable). */
export function InventarioPromoChatRow({
  item,
  isLast = false,
  isDark = false,
  onAction,
  busy = false,
}) {
  const promo = parsePromoInventarioContent(item?.content);
  const imageUri = item?.media_url || promo.imagenUrl;
  const tipoLbl = promo.articuloTipo === 'servicio' ? 'Servicio' : 'Producto';
  const isService = promo.articuloTipo === 'servicio';
  const titleColor = isDark ? PASTEL.textDark : PASTEL.text;
  const metaColor = isDark ? PASTEL.textMutedDark : PASTEL.textMuted;
  const priceColor = isDark ? PASTEL.accentSoft : PASTEL.text;
  const accentColor = isDark ? PASTEL.accentSoft : PASTEL.accent;
  const dividerColor = isDark ? 'rgba(232,217,168,0.2)' : PASTEL.border;

  const onPress = () => firePromoRowAction({ promo, item, onAction, busy });

  return (
    <TouchableOpacity
      style={[
        styles.row,
        !isLast && styles.rowDivider,
        !isLast && { borderBottomColor: dividerColor },
        busy && styles.rowBusy,
      ]}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={
        isService
          ? `Agendar ${promo.nombre || 'promoción'}`
          : `Comprar ${promo.nombre || 'promoción'}`
      }
    >
      <PromoThumb uri={imageUri} isDark={isDark} />
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: titleColor }]} numberOfLines={2}>
          {promo.nombre || 'Promoción'}
        </Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.rowTipo, { color: accentColor }]}>{tipoLbl}</Text>
          {promo.hastaLabel ? (
            <>
              <Text style={[styles.rowDot, { color: metaColor }]}>·</Text>
              <Text style={[styles.rowHasta, { color: metaColor }]} numberOfLines={1}>
                hasta {promo.hastaLabel}
              </Text>
            </>
          ) : null}
        </View>
        <Text style={[styles.rowHint, { color: metaColor }]}>
          {isService ? 'Tocá para agendar' : 'Tocá para comprar'}
        </Text>
      </View>
      <View style={styles.rowPriceCol}>
        {promo.priceLabel ? (
          <Text style={[styles.rowPrice, { color: priceColor }]}>{promo.priceLabel}</Text>
        ) : null}
        {promo.compareAtLabel ? (
          <Text style={[styles.rowCompare, { color: metaColor }]}>{promo.compareAtLabel}</Text>
        ) : null}
      </View>
      <ChevronRight size={16} color={metaColor} strokeWidth={2.4} style={styles.chevron} />
    </TouchableOpacity>
  );
}

/** Lista agrupada de promos (ideal para 5–10 ítems). */
export function InventarioPromoChatList({
  items = [],
  onAction,
  busy = false,
  isDark: isDarkProp,
}) {
  const scheme = useColorScheme();
  const isDark = isDarkProp ?? scheme === 'dark';
  const promos = Array.isArray(items) ? items.filter(Boolean) : [];
  const count = promos.length;
  if (!count) return null;

  const shellStyle = useMemo(
    () => [
      styles.shell,
      {
        borderColor: isDark ? 'rgba(232,217,168,0.35)' : PASTEL.border,
        backgroundColor: isDark ? PASTEL.shellDark[0] : PASTEL.cream,
      },
    ],
    [isDark],
  );

  const gradientColors = isDark ? PASTEL.shellDark : PASTEL.shellLight;
  const headerTitleColor = isDark ? PASTEL.textDark : PASTEL.text;
  const headerBg = isDark ? 'rgba(255,246,217,0.08)' : PASTEL.wash;
  const headerBorder = isDark ? 'rgba(232,217,168,0.2)' : PASTEL.border;

  const header = (
    <View
      style={[
        styles.header,
        {
          borderBottomColor: headerBorder,
          backgroundColor: headerBg,
        },
      ]}
    >
      <View style={[styles.headerAccent, { backgroundColor: PASTEL.accent }]} />
      <View style={styles.headerLeft}>
        <View
          style={[
            styles.headerIconWrap,
            {
              backgroundColor: isDark ? 'rgba(196,165,90,0.22)' : 'rgba(196,165,90,0.18)',
            },
          ]}
        >
          <Sparkles size={13} color={isDark ? PASTEL.accentSoft : PASTEL.accent} strokeWidth={2.2} />
        </View>
        <Text style={[styles.headerTitle, { color: headerTitleColor }]}>
          {count === 1 ? '1 promoción vigente' : `${count} promociones vigentes`}
        </Text>
      </View>
      <View
        style={[
          styles.countBadge,
          {
            backgroundColor: isDark ? 'rgba(196,165,90,0.2)' : PASTEL.butter,
            borderColor: isDark ? 'rgba(232,217,168,0.4)' : PASTEL.border,
          },
        ]}
      >
        <Text style={[styles.countTxt, { color: isDark ? PASTEL.accentSoft : PASTEL.text }]}>{count}</Text>
      </View>
    </View>
  );

  const rows = promos.map((item, idx) => (
    <InventarioPromoChatRow
      key={String(item.id)}
      item={item}
      isLast={idx === count - 1}
      isDark={isDark}
      onAction={onAction}
      busy={busy}
    />
  ));

  return (
    <View style={shellStyle}>
      <LinearGradient colors={gradientColors} style={styles.gradientShell}>
        {header}
        <View style={styles.listBody}>{rows}</View>
      </LinearGradient>
    </View>
  );
}

/** @deprecated Usar InventarioPromoChatList para grupos o InventarioPromoChatRow. */
export function InventarioPromoChatCard({ item, onAction, busy, isDark }) {
  return (
    <InventarioPromoChatList items={[item]} onAction={onAction} busy={busy} isDark={isDark} />
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8A7348',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  gradientShell: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: 'relative',
    overflow: 'hidden',
  },
  headerAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingLeft: 4,
  },
  headerIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  countTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 12,
  },
  listBody: {
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    minHeight: THUMB + spacing.sm * 2,
  },
  rowBusy: {
    opacity: 0.55,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbWrap: { position: 'relative', flexShrink: 0 },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radii.sm,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 14,
    lineHeight: 18,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  rowHint: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    marginTop: 1,
  },
  rowTipo: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowDot: { fontFamily: typography.fontSans, fontSize: 10 },
  rowHasta: {
    fontFamily: typography.fontSans,
    fontSize: 10,
    flexShrink: 1,
  },
  rowPriceCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    minWidth: 56,
    gap: 1,
  },
  rowPrice: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  rowCompare: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  chevron: {
    flexShrink: 0,
    marginLeft: -2,
  },
});
