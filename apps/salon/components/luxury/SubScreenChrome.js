import { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, typography, radii } from '@appsalon/design-tokens';
import { useTheme } from '../../theme/ThemeProvider';

export function createSubStyles(c) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    bullets: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    muted: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundSubtle,
      lineHeight: 19,
    },
    divider: {
      height: 1,
      backgroundColor: c.cardBorder,
      marginVertical: spacing.sm,
      marginHorizontal: -spacing.sm,
    },
    rowTouch: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm + 2,
    },
    rowLabel: {
      fontFamily: typography.fontSansMedium,
      fontSize: 14,
      color: c.foreground,
    },
    rowSub: {
      fontFamily: typography.fontSans,
      fontSize: 13,
      color: c.foregroundMuted,
    },
    fauxInput: {
      height: 48,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      backgroundColor: c.card,
    },
  });
}

export function useSubStyles() {
  const { colors } = useTheme();
  return useMemo(() => createSubStyles(colors), [colors]);
}

function createChromeStyles(c) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    topBar: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rightActionWrap: {
      alignItems: 'flex-end',
    },
    backTxt: {
      fontFamily: typography.fontSansMedium,
      fontSize: 15,
      color: c.foreground,
      marginLeft: -2,
    },
    display: {
      fontFamily: typography.fontDisplay,
      fontSize: 26,
      color: c.foreground,
      lineHeight: 32,
      marginBottom: spacing.xs,
    },
    lead: {
      fontFamily: typography.fontSans,
      fontSize: 14,
      color: c.foregroundMuted,
      lineHeight: 21,
      marginBottom: spacing.sm,
    },
    scroll: {
      flex: 1,
    },
    scrollInner: {
      flexGrow: 1,
      paddingTop: spacing.sm,
    },
    scrollInnerNoScroll: {
      flex: 1,
      paddingTop: spacing.sm,
    },
  });
}

/**
 * Pantalla apilada (sin React Navigation): barra atrás + scroll.
 */
export function SubScreenChrome({
  title,
  subtitle,
  onBack,
  children,
  bottomPadding,
  rightAction,
  disableBodyScroll,
}) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createChromeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const padBottom =
    bottomPadding ?? Math.max(insets.bottom + spacing.md, spacing.xl);

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          >
            <ChevronLeft size={24} color={c.foreground} strokeWidth={2} />
            <Text style={styles.backTxt}>Volver</Text>
          </TouchableOpacity>
          {rightAction ? <View style={styles.rightActionWrap}>{rightAction}</View> : null}
        </View>
        {title ? <Text style={styles.display}>{title}</Text> : null}
        {subtitle ? <Text style={styles.lead}>{subtitle}</Text> : null}
      </View>

      {disableBodyScroll ? (
        <View
          style={[
            styles.scrollInnerNoScroll,
            { paddingHorizontal: spacing.lg, paddingBottom: padBottom },
          ]}
        >
          {children}
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingHorizontal: spacing.lg, paddingBottom: padBottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}
