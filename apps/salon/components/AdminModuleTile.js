import { useMemo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Tarjeta táctil para el grid del panel admin (tablet / teléfono).
 */
export function AdminModuleTile({
  title,
  subtitle,
  icon: Icon,
  onPress,
  width,
  accent,
  badgeCount = 0,
}) {
  const { colors: c, isDark } = useTheme();
  const hasAccent = Boolean(accent);
  const titleColor = hasAccent && isDark ? '#1F1F1F' : c.foreground;
  const subtitleColor = hasAccent && isDark ? '#4A4A4A' : c.foregroundMuted;
  const iconColor = hasAccent ? (accent.icon ?? c.primary) : c.primary;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width,
          position: 'relative',
        },
        touch: {
          width: '100%',
          aspectRatio: 1,
          backgroundColor: accent?.bg ?? c.card,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: accent?.border ?? c.cardBorder,
          padding: spacing.sm,
          justifyContent: 'flex-start',
        },
        iconRow: {
          marginBottom: 4,
        },
        title: {
          fontFamily: typography.fontSansMedium,
          fontSize: 13,
          color: titleColor,
          lineHeight: 17,
        },
        sub: {
          marginTop: 2,
          fontFamily: typography.fontSans,
          fontSize: 10,
          color: subtitleColor,
          lineHeight: 14,
        },
        badge: {
          position: 'absolute',
          top: 6,
          right: 6,
          backgroundColor: '#E53935',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          paddingHorizontal: 5,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
        badgeTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
          color: '#FFFFFF',
          lineHeight: 13,
        },
      }),
    [c, titleColor, subtitleColor, accent, isDark],
  );

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.touch}
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={
          badgeCount > 0 ? `${title}, ${badgeCount} notificaciones` : title
        }
      >
        <View style={styles.iconRow}>
          <Icon size={22} color={iconColor} strokeWidth={1.85} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {subtitle}
        </Text>
      </TouchableOpacity>
      {badgeCount > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeTxt}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
        </View>
      ) : null}
    </View>
  );
}
