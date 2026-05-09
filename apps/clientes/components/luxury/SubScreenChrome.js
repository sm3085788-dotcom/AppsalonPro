import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  typography,
  radii,
} from '@appsalon/design-tokens';

/**
 * Pantalla apilada (sin React Navigation): barra atrás + scroll. Ocultar tab bar encima de esto.
 */
export function SubScreenChrome({
  title,
  subtitle,
  onBack,
  children,
  bottomPadding,
}) {
  const insets = useSafeAreaInsets();
  const padBottom =
    bottomPadding ?? Math.max(insets.bottom + spacing.md, spacing.xl);

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color={colors.foreground} strokeWidth={2} />
          <Text style={styles.backTxt}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.display}>{title}</Text>
        {subtitle ? <Text style={styles.lead}>{subtitle}</Text> : null}
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  backTxt: {
    fontFamily: typography.fontSansMedium,
    fontSize: 15,
    color: colors.foreground,
    marginLeft: -2,
  },
  display: {
    fontFamily: typography.fontDisplay,
    fontSize: 26,
    color: colors.foreground,
    lineHeight: 32,
    marginBottom: spacing.xs,
  },
  lead: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foregroundMuted,
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
});

export const ss = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  bullets: {
    fontFamily: typography.fontSans,
    fontSize: 14,
    color: colors.foregroundMuted,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  muted: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: colors.foregroundSubtle,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
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
    color: colors.foreground,
  },
  rowSub: {
    fontFamily: typography.fontSans,
    fontSize: 13,
    color: colors.foregroundMuted,
  },
  fauxInput: {
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
  },
});
