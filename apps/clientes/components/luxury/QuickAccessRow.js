import { useMemo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

function formatBadgeCount(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return null;
  return x > 99 ? '99+' : String(x);
}

export function QuickAccessRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  /** Color del ícono en la burbuja (cada acceso rápido puede tener el suyo). */
  iconColor,
  /** Contador sobre la fila (p. ej. pedidos activos). */
  badgeCount = 0,
  /** 'green' | 'red' | 'gold' */
  badgeTone = 'gold',
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: c.avatarCircleBg,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: c.cardBorder,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
        },
        iconBubble: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: c.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        mid: {
          flex: 1,
        },
        title: {
          fontFamily: typography.fontSansMedium,
          fontSize: 15,
          color: c.foreground,
        },
        sub: {
          marginTop: 3,
          fontFamily: typography.fontSans,
          fontSize: 13,
          color: c.foregroundMuted,
          lineHeight: 18,
        },
        badge: {
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
          marginRight: 2,
        },
        badgeTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
          color: '#FFFFFF',
        },
      }),
    [c],
  );

  const badgeLabel = formatBadgeCount(badgeCount);
  const badgeBg =
    badgeTone === 'green'
      ? c.success
      : badgeTone === 'red'
        ? c.error
        : c.primary;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={
        badgeLabel ? `${title}, ${badgeLabel} activos` : title
      }
    >
      <View style={styles.iconBubble}>
        {Icon ? <Icon size={20} color={iconColor ?? c.foreground} strokeWidth={1.7} /> : null}
      </View>
      <View style={styles.mid}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {badgeLabel ? (
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={styles.badgeTxt}>{badgeLabel}</Text>
        </View>
      ) : null}
      <ChevronRight size={20} color={c.foregroundSubtle} strokeWidth={1.7} />
    </TouchableOpacity>
  );
}
