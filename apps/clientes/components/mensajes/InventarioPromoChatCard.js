import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Tag, Sparkles, ChevronRight } from 'lucide-react-native';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import {
  parsePromoInventarioContent,
  BROADCAST_PROMO_ACTIONS,
} from '@appsalon/shared-config';
import { useTheme } from '../../theme/ThemeProvider';

/** Amarillo girasol */
const SUNFLOWER = '#FFDA03';
const SUNFLOWER_LIGHT = '#FFF176';
const SUNFLOWER_SOFT = '#FFF3B0';
const SUNFLOWER_CREAM = '#FFFBE6';
const SUNFLOWER_DEEP = '#C99700';
const SUNFLOWER_BROWN = '#3D2E00';
const SUNFLOWER_SHELL_LIGHT = ['#FFFBE6', '#FFF3B0'];
const SUNFLOWER_SHELL_DARK = ['#4A3B00', '#6B5500'];
const THUMB = 56;

function PromoThumb({ uri, isDark }) {
  const [broken, setBroken] = useState(false);

  if (!uri || broken) {
    return (
      <View
        style={[
          styles.thumb,
          styles.thumbPlaceholder,
          {
            backgroundColor: isDark ? 'rgba(255,218,3,0.15)' : SUNFLOWER_SOFT,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,218,3,0.35)' : 'rgba(201,151,0,0.25)',
          },
        ]}
      >
        <Tag size={18} color={isDark ? SUNFLOWER_LIGHT : SUNFLOWER_DEEP} strokeWidth={2} />
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
  const { colors: c } = useTheme();
  const promo = parsePromoInventarioContent(item?.content);
  const imageUri = item?.media_url || promo.imagenUrl;
  const tipoLbl = promo.articuloTipo === 'servicio' ? 'Servicio' : 'Producto';
  const isService = promo.articuloTipo === 'servicio';

  const titleColor = isDark ? '#FFF9E6' : SUNFLOWER_BROWN;
  const metaColor = isDark ? 'rgba(255,241,118,0.85)' : '#6B5A20';
  const priceColor = isDark ? SUNFLOWER : SUNFLOWER_DEEP;
  const compareColor = isDark ? 'rgba(255,249,230,0.5)' : c.foregroundMuted;
  const dividerColor = isDark ? 'rgba(255,218,3,0.2)' : 'rgba(201,151,0,0.22)';
  const chevronColor = isDark ? 'rgba(255,241,118,0.65)' : 'rgba(201,151,0,0.55)';

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
          <Text style={[styles.rowTipo, { color: metaColor }]}>{tipoLbl}</Text>
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
          <Text style={[styles.rowCompare, { color: compareColor }]}>{promo.compareAtLabel}</Text>
        ) : null}
      </View>
      <ChevronRight size={16} color={chevronColor} strokeWidth={2.4} style={styles.chevron} />
    </TouchableOpacity>
  );
}

/** Lista agrupada de promos (ideal para 5–10 ítems). */
export function InventarioPromoChatList({ items = [], onAction, busy = false }) {
  const { isDark } = useTheme();
  const promos = Array.isArray(items) ? items.filter(Boolean) : [];
  const count = promos.length;
  if (!count) return null;

  const shellStyle = useMemo(
    () => [styles.shell, isDark ? styles.shellDark : styles.shellLight],
    [isDark],
  );

  const accentColor = isDark ? SUNFLOWER : SUNFLOWER_DEEP;
  const headerTitleColor = isDark ? SUNFLOWER_LIGHT : SUNFLOWER_BROWN;

  const header = (
    <View style={[styles.header, isDark ? styles.headerDark : styles.headerLight]}>
      <View style={styles.headerLeft}>
        <Sparkles size={14} color={accentColor} strokeWidth={2.2} />
        <Text style={[styles.headerTitle, { color: headerTitleColor }]}>
          {count === 1 ? '1 promoción vigente' : `${count} promociones vigentes`}
        </Text>
      </View>
      <View style={[styles.countBadge, isDark ? styles.countBadgeDark : styles.countBadgeLight]}>
        <Text style={[styles.countTxt, { color: SUNFLOWER_BROWN }]}>{count}</Text>
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

  const gradientColors = isDark ? SUNFLOWER_SHELL_DARK : SUNFLOWER_SHELL_LIGHT;

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
export function InventarioPromoChatCard({ item, onAction, busy }) {
  return <InventarioPromoChatList items={[item]} onAction={onAction} busy={busy} />;
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radii.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#C99700',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  shellLight: {
    borderColor: SUNFLOWER,
    backgroundColor: SUNFLOWER_CREAM,
  },
  shellDark: {
    borderColor: SUNFLOWER,
    ...Platform.select({
      ios: { shadowOpacity: 0.28 },
      android: { elevation: 6 },
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
  },
  headerLight: {
    borderBottomColor: 'rgba(201,151,0,0.28)',
    backgroundColor: 'rgba(255,218,3,0.35)',
  },
  headerDark: {
    borderBottomColor: 'rgba(255,218,3,0.35)',
    backgroundColor: 'rgba(255,218,3,0.12)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  headerTitle: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  countBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeLight: {
    backgroundColor: SUNFLOWER,
    borderWidth: 1,
    borderColor: SUNFLOWER_DEEP,
  },
  countBadgeDark: {
    backgroundColor: SUNFLOWER,
    borderWidth: 1,
    borderColor: SUNFLOWER_LIGHT,
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
    fontFamily: typography.fontSans,
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
