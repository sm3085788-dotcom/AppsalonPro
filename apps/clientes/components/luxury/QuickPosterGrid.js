import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  MessageCircle, ShoppingBag, Sparkles, Award,
  Package, Scissors, Bell, ChevronRight,
} from 'lucide-react-native';
import { typography, spacing } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { CLIENT_ALERT_BELL_RED } from '../../constants/clientAlertColors';

const ICON_MAP = {
  MessageCircle, ShoppingBag, Sparkles, Award, Package, Scissors,
};

const GOLD = '#C5A368';

export function QuickPosterGrid({ items }) {
  const { colors: c, isDark } = useTheme();

  const palette = isDark
    ? {
        container: c.background,
        row:       c.card,
        divider:   c.cardBorder,
        label:     c.foreground,
        sub:       GOLD,
        iconBg:    'rgba(197,163,104,0.12)',
        iconRing:  'rgba(197,163,104,0.30)',
      }
    : {
        container: '#FDFAF5',
        row:       '#FFFFFF',
        divider:   '#F0EAE0',
        label:     '#1A1510',
        sub:       GOLD,
        iconBg:    'rgba(197,163,104,0.10)',
        iconRing:  'rgba(197,163,104,0.28)',
      };

  return (
    <View style={[styles.container, { backgroundColor: palette.container }]}>
      {items.map((item, index) => (
        <MenuItem
          key={item.id}
          item={item}
          isLast={index === items.length - 1}
          palette={palette}
        />
      ))}
    </View>
  );
}

function MenuItem({ item, isLast, palette }) {
  const hasBadge = item.badge && item.badgeCount > 0;
  const Icon = ICON_MAP[item.iconName] ?? MessageCircle;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: palette.row },
        !isLast && { borderBottomWidth: 1, borderBottomColor: palette.divider },
      ]}
      onPress={item.onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.iconCircle, { backgroundColor: palette.iconBg, borderColor: palette.iconRing }]}>
        <Icon size={20} color={GOLD} strokeWidth={1.8} />
      </View>

      <View style={styles.textCol}>
        <Text style={[styles.label, { color: palette.label }]}>{item.label}</Text>
        <Text style={[styles.sub, { color: palette.sub }]} numberOfLines={1}>{item.sub}</Text>
      </View>

      <View style={styles.rightCol}>
        {hasBadge ? (
          <View style={styles.countBadge}>
            <Text style={styles.countTxt}>
              {item.badgeCount > 99 ? '99+' : String(item.badgeCount)}
            </Text>
          </View>
        ) : null}
        {item.bellBadge ? (
          <View style={styles.bellBadge}>
            <Bell size={9} color="#FFF" strokeWidth={2.5} />
          </View>
        ) : null}
        {item.prizeBadge ? (
          <View style={styles.prizeBadge}>
            <Text style={styles.prizeTxt}>★</Text>
          </View>
        ) : null}
        <ChevronRight size={16} color={GOLD} strokeWidth={1.8} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios:     { shadowColor: '#C5A368', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 76,
    paddingHorizontal: spacing.lg,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontFamily: typography.fontDisplay,
    fontSize: 18,
    letterSpacing: 0.1,
  },
  sub: {
    fontFamily: typography.fontSans,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    backgroundColor: '#16A34A',
  },
  countTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 11,
    color: '#FFF',
  },
  bellBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: CLIENT_ALERT_BELL_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
  },
  prizeTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 10,
    color: '#FFF',
    lineHeight: 14,
  },
});
