import { useEffect, useMemo, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Bell } from 'lucide-react-native';
import { typography, spacing, radii } from '@appsalon/design-tokens';
import { useTheme } from '../theme/ThemeProvider';

/** Rojo alerta visible (mismo tono que Mensajes / Marketing). */
const ALERT_BELL_RED = '#E53935';

/**
 * Tarjeta táctil cuadrada del grid «Módulos» (panel admin · solo esta pantalla).
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
  /** Sin subtítulo: icono centrado y título abajo (Panel de control, Basurero). */
  titleOnly = false,
}) {
  const { colors: c, isDark } = useTheme();
  const hasAccent = Boolean(accent);
  const accentColor = accent?.icon ?? accent?.border ?? c.primary;
  const accentLine = accent?.border ?? accentColor;
  const titleColor = c.foreground;
  const subtitleColor = c.foregroundMuted;
  const cardBg = hasAccent
    ? isDark
      ? c.card
      : accent.bg ?? '#FFFFFF'
    : isDark
      ? c.card
      : '#FFFFFF';
  const iconInnerBg = isDark ? c.surfaceMuted : '#FFFFFF';
  const borderColor = hasAccent
    ? isDark
      ? `${accentLine}50`
      : `${accentLine}35`
    : c.cardBorder;
  const badgeRing = isDark ? c.card : '#FFFFFF';

  const iconSize = titleOnly ? 26 : 22;
  const iconRingSize = titleOnly ? 50 : 44;

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
          backgroundColor: cardBg,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor,
          overflow: 'hidden',
          ...Platform.select({
            ios: {
              shadowColor: '#1A1A1A',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.28 : 0.06,
              shadowRadius: 6,
            },
            android: { elevation: 2 },
            default: {},
          }),
        },
        leftStripe: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: accentLine,
          opacity: isDark ? 0.85 : 1,
        },
        inner: {
          flex: 1,
          paddingLeft: spacing.sm + 4,
          paddingRight: spacing.sm,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        },
        iconZone: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        },
        iconRing: {
          width: iconRingSize,
          height: iconRingSize,
          borderRadius: iconRingSize / 2,
          backgroundColor: iconInnerBg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: hasAccent ? `${accentLine}${isDark ? '70' : '55'}` : c.cardBorder,
          ...Platform.select({
            ios: {
              shadowColor: accentLine,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isDark ? 0.2 : 0.12,
              shadowRadius: 3,
            },
            android: { elevation: 1 },
            default: {},
          }),
        },
        textBlock: {
          justifyContent: 'flex-end',
        },
        title: {
          fontFamily: typography.fontSansMedium,
          fontSize: titleOnly ? 12.5 : 13,
          color: titleColor,
          lineHeight: titleOnly ? 16 : 17,
          letterSpacing: -0.2,
        },
        sub: {
          marginTop: 2,
          fontFamily: typography.fontSans,
          fontSize: 9.5,
          color: subtitleColor,
          lineHeight: 12,
          opacity: 0.92,
        },
        badge: {
          position: 'absolute',
          top: 7,
          right: 7,
          backgroundColor: ALERT_BELL_RED,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          paddingHorizontal: 5,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: badgeRing,
          zIndex: 2,
        },
        badgeTxt: {
          fontFamily: typography.fontSansMedium,
          fontSize: 11,
          color: '#FFFFFF',
          lineHeight: 13,
        },
        bellWrap: {
          position: 'absolute',
          top: 7,
          right: 7,
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: ALERT_BELL_RED,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: badgeRing,
          zIndex: 2,
          ...Platform.select({
            ios: {
              shadowColor: ALERT_BELL_RED,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.35,
              shadowRadius: 4,
            },
            android: { elevation: 4 },
            default: {},
          }),
        },
      }),
    [
      c,
      width,
      cardBg,
      iconInnerBg,
      borderColor,
      titleColor,
      subtitleColor,
      hasAccent,
      accentLine,
      isDark,
      badgeRing,
      titleOnly,
      iconRingSize,
    ],
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

  const cardBody = (
    <View style={styles.inner}>
      <View style={styles.iconZone}>
        <View style={styles.iconRing}>
          <Icon size={iconSize} color={accentColor} strokeWidth={2} />
        </View>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {!titleOnly && subtitle ? (
          <Text style={styles.sub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

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
        {hasAccent ? <View style={styles.leftStripe} pointerEvents="none" /> : null}
        {cardBody}
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
          <Bell size={13} color="#FFFFFF" strokeWidth={2.4} />
        </Animated.View>
      ) : null}
    </View>
  );
}
