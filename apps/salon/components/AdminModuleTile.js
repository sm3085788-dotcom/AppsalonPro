import { useEffect, useMemo, useRef } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated, Easing } from 'react-native';
import { Bell } from 'lucide-react-native';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';

/** Rojo alerta visible (mismo tono que Mensajes / Marketing). */
const ALERT_BELL_RED = '#E53935';

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
  showAlertBell = false,
}) {
  const { colors: c, isDark } = useTheme();
  const hasAccent = Boolean(accent);
  const titleColor = hasAccent && isDark ? '#1F1F1F' : c.foreground;
  const subtitleColor = hasAccent && isDark ? '#4A4A4A' : c.foregroundMuted;
  const iconColor = hasAccent ? (accent.icon ?? c.primary) : c.primary;
  const badgeRing = accent?.bg ?? c.card;
  const alertBg = ALERT_BELL_RED;
  const alertFg = '#FFFFFF';
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
          backgroundColor: alertBg,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          paddingHorizontal: 5,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: badgeRing,
        },
        badgeTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
          color: alertFg,
          lineHeight: 13,
        },
        bellWrap: {
          position: 'absolute',
          top: 6,
          right: 6,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: alertBg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: badgeRing,
        },
      }),
    [c, titleColor, subtitleColor, accent, isDark, badgeRing, alertBg, alertFg],
  );

  const shake = useRef(new Animated.Value(0)).current;
  const bellVisibleRef = useRef(false);
  useEffect(() => {
    if (!showAlertBell) {
      bellVisibleRef.current = false;
      shake.stopAnimation();
      shake.setValue(0);
      return undefined;
    }
    if (bellVisibleRef.current) return undefined;
    bellVisibleRef.current = true;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: -1, duration: 110, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 160, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -0.8, duration: 140, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [showAlertBell, shake]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.touch}
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={
          showAlertBell ? `${title}, hay mensajes nuevos` : badgeCount > 0 ? `${title}, ${badgeCount} notificaciones` : title
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
      {showAlertBell ? (
        <Animated.View
          style={[
            styles.bellWrap,
            { transform: [{ rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) }] },
          ]}
          pointerEvents="none"
        >
          <Bell size={12} color={alertFg} strokeWidth={2.4} />
        </Animated.View>
      ) : null}
    </View>
  );
}
